"""Model providers. Primary: Butterbase AI gateway (OpenAI-compatible).

All calls return schema-validated pydantic objects. Switch providers with
CLASSPULSE_PROVIDER=gemini (direct google-genai SDK, needs GEMINI_API_KEY).
"""
import base64
import json
import mimetypes
import os
import re
import time
from pathlib import Path

import requests
from pydantic import BaseModel

from pipeline import storage

DEFAULT_MODEL = "google/gemini-2.5-flash"


def _strip_fences(text: str) -> str:
    m = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    return m.group(1) if m else text


class ButterbaseProvider:
    def __init__(self, model: str | None = None):
        self.model = model or os.environ.get("CLASSPULSE_MODEL", DEFAULT_MODEL)
        self.api_key = os.environ["BUTTERBASE_API_KEY"]
        self.app_id = os.environ["BUTTERBASE_APP_ID"]
        self.api_url = os.environ.get("BUTTERBASE_API_URL", "https://api.butterbase.ai")

    def _chat(self, parts: list[dict], prompt: str, schema: type[BaseModel]) -> BaseModel:
        instruction = (
            f"{prompt}\n\nRespond with ONLY valid JSON matching this schema "
            f"(no prose, no markdown):\n{json.dumps(schema.model_json_schema())}"
        )
        content = parts + [{"type": "text", "text": instruction}]
        last_error: Exception | None = None
        for attempt in range(3):
            if attempt:
                time.sleep(2 * attempt)
            try:
                r = requests.post(
                    f"{self.api_url}/v1/{self.app_id}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}",
                             "Content-Type": "application/json"},
                    json={"model": self.model,
                          "messages": [{"role": "user", "content": content}],
                          "max_tokens": 8000},
                    timeout=300,
                )
                if r.status_code >= 500:  # transient gateway error -> retry
                    last_error = RuntimeError(f"HTTP {r.status_code}")
                    continue
                r.raise_for_status()
                text = r.json()["choices"][0]["message"]["content"]
                return schema.model_validate_json(_strip_fences(text))
            except (requests.ConnectionError, requests.Timeout, ValueError) as e:
                last_error = e
        raise ValueError(f"gateway failed for {schema.__name__}: {last_error}")

    def analyze_video(self, video_path: Path, prompt: str, schema: type[BaseModel]) -> BaseModel:
        object_id = storage.upload_file(video_path)
        url = storage.download_url(object_id)
        return self._chat([{"type": "video_url", "video_url": {"url": url}}], prompt, schema)

    def analyze_images(self, parts: list, prompt: str, schema: type[BaseModel]) -> BaseModel:
        content = []
        for p in parts:
            if isinstance(p, Path):
                mime = mimetypes.guess_type(p.name)[0] or "image/jpeg"
                b64 = base64.b64encode(p.read_bytes()).decode()
                content.append({"type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{b64}"}})
            else:
                content.append({"type": "text", "text": p})
        return self._chat(content, prompt, schema)


class GeminiProvider:
    """Direct google-genai SDK fallback (CLASSPULSE_PROVIDER=gemini)."""

    def __init__(self, model: str | None = None):
        from google import genai  # optional dependency
        self.model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.client = genai.Client()  # reads GEMINI_API_KEY

    def analyze_video(self, video_path: Path, prompt: str, schema: type[BaseModel]) -> BaseModel:
        import time
        from google.genai import types
        uploaded = self.client.files.upload(file=str(video_path))
        while uploaded.state.name == "PROCESSING":
            time.sleep(2)
            uploaded = self.client.files.get(name=uploaded.name)
        if uploaded.state.name != "ACTIVE":
            raise RuntimeError(f"upload failed: {uploaded.state.name}")
        response = self.client.models.generate_content(
            model=self.model, contents=[uploaded, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json", response_schema=schema),
        )
        return schema.model_validate_json(response.text)


def get_provider():
    if os.environ.get("CLASSPULSE_PROVIDER", "butterbase") == "gemini":
        return GeminiProvider()
    return ButterbaseProvider()

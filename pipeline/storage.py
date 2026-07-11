"""Butterbase Storage: presigned upload/download helpers."""
import mimetypes
import os
from pathlib import Path

import requests


def _api_url() -> str:
    return os.environ.get("BUTTERBASE_API_URL", "https://api.butterbase.ai")


def _headers() -> dict:
    return {"Authorization": f"Bearer {os.environ['BUTTERBASE_API_KEY']}"}


def _app_id() -> str:
    return os.environ["BUTTERBASE_APP_ID"]


def upload_file(path: Path, public: bool = False) -> str:
    """Upload a local file via presigned URL; returns the durable objectId."""
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    r = requests.post(
        f"{_api_url()}/storage/{_app_id()}/upload",
        headers=_headers(),
        json={"filename": path.name, "contentType": content_type,
              "sizeBytes": path.stat().st_size, "public": public},
        timeout=30,
    )
    r.raise_for_status()
    info = r.json()
    put = requests.put(info["uploadUrl"], headers={"Content-Type": content_type},
                       data=path.read_bytes(), timeout=300)
    put.raise_for_status()
    return info["objectId"]


def download_url(object_id: str) -> str:
    """Mint a fresh presigned download URL (expires ~1h)."""
    r = requests.get(f"{_api_url()}/storage/{_app_id()}/download/{object_id}",
                     headers=_headers(), timeout=30)
    r.raise_for_status()
    return r.json()["downloadUrl"]

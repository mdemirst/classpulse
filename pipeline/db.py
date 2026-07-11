"""Butterbase data API helpers (service role via BUTTERBASE_API_KEY)."""
import os

import requests


def api_url() -> str:
    return os.environ.get("BUTTERBASE_API_URL", "https://api.butterbase.ai")


def app_id() -> str:
    return os.environ["BUTTERBASE_APP_ID"]


def _auth() -> dict:
    return {"Authorization": f"Bearer {os.environ['BUTTERBASE_API_KEY']}"}


def _headers() -> dict:
    return {**_auth(), "Content-Type": "application/json"}


def _base() -> str:
    return f"{api_url()}/v1/{app_id()}"


def select(table: str, query: str = "") -> list[dict]:
    r = requests.get(f"{_base()}/{table}{'?' + query if query else ''}",
                     headers=_headers(), timeout=30)
    r.raise_for_status()
    return r.json()


def get(table: str, row_id: str) -> dict:
    r = requests.get(f"{_base()}/{table}/{row_id}", headers=_headers(), timeout=30)
    r.raise_for_status()
    return r.json()


def insert(table: str, row: dict) -> dict:
    r = requests.post(f"{_base()}/{table}", headers=_headers(), json=row, timeout=60)
    r.raise_for_status()
    return r.json()


def update(table: str, row_id: str, patch: dict) -> dict:
    r = requests.patch(f"{_base()}/{table}/{row_id}", headers=_headers(),
                       json=patch, timeout=60)
    r.raise_for_status()
    return r.json()


def delete(table: str, row_id: str) -> None:
    # DELETE must not carry a Content-Type header (no body) — the API 400s on it.
    r = requests.delete(f"{_base()}/{table}/{row_id}", headers=_auth(), timeout=30)
    r.raise_for_status()


def items(rows: list) -> dict:
    """Butterbase jsonb columns reject top-level arrays: wrap them."""
    return {"items": rows}

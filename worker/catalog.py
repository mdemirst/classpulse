"""The library of lesson videos the Upload tab offers (no browser upload needed)."""
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import cv2

from pipeline import db, storage

CATALOG_FILE = Path("datasets/catalog.json")
THUMB_DIR = Path("work/_catalog")


def entries() -> list[dict]:
    return [e for e in json.loads(CATALOG_FILE.read_text()) if Path(e["video"]).exists()]


def entry(entry_id: str) -> dict:
    found = next((e for e in entries() if e["id"] == entry_id), None)
    if not found:
        raise KeyError(entry_id)
    return found


@lru_cache(maxsize=32)
def file_hash(path: str) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def video_meta(path: Path) -> dict:
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return {
        "duration_sec": round(frames / fps) if fps else 0,
        "resolution": f"{width}×{height}",
        "size_mb": round(path.stat().st_size / 1e6, 1),
    }


def thumbnail(entry_id: str) -> Path:
    """Poster frame for a catalog entry (cached on disk)."""
    out = THUMB_DIR / f"{entry_id}.jpg"
    if out.exists():
        return out
    e = entry(entry_id)
    cap = cv2.VideoCapture(e["video"])
    cap.set(cv2.CAP_PROP_POS_FRAMES, 5)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"cannot read a frame from {e['video']}")
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), frame)
    return out


def roster_size(e: dict) -> int:
    if not e.get("classroom_dir"):
        return 0
    meta = json.loads((Path(e["classroom_dir"]) / "classroom.json").read_text())
    return len(meta["roster"])


def listing() -> list[dict]:
    """Catalog + live metadata + whether we already have results for this video."""
    out = []
    for e in entries():
        path = Path(e["video"])
        sha = file_hash(str(path))
        done = db.select("lessons", f"source_hash=eq.{sha}&status=eq.done")
        out.append({
            **{k: e[k] for k in ("id", "title", "classroom_name", "date")},
            **video_meta(path),
            "roster_size": roster_size(e),
            "processed": bool(done),
            "lesson_id": done[0]["id"] if done else None,
        })
    return out


def ensure_classroom(e: dict) -> str:
    """Classroom row id for this entry, seeding the roster (with photos) if needed."""
    existing = [c for c in db.select("classrooms") if c["name"] == e["classroom_name"]]
    classroom = existing[0] if existing else db.insert(
        "classrooms", {"name": e["classroom_name"]})

    if e.get("classroom_dir"):
        root = Path(e["classroom_dir"])
        meta = json.loads((root / "classroom.json").read_text())
        have = {s["name"]: s for s in db.select("students", f"classroom_id=eq.{classroom['id']}")}
        for student in meta["roster"]:
            if have.get(student["name"], {}).get("roster_photo_object_id"):
                continue
            object_id = storage.upload_file(root / student["photo"], public=True)
            if student["name"] in have:
                db.update("students", have[student["name"]]["id"],
                          {"roster_photo_object_id": object_id})
            else:
                db.insert("students", {"classroom_id": classroom["id"],
                                       "name": student["name"],
                                       "roster_photo_object_id": object_id})
    return classroom["id"]


def prepare_lesson(entry_id: str) -> tuple[str, bool]:
    """Return (lesson_id, already_processed) for a catalog entry, creating it if new."""
    e = entry(entry_id)
    sha = file_hash(e["video"])

    done = db.select("lessons", f"source_hash=eq.{sha}&status=eq.done")
    if done:
        return done[0]["id"], True

    classroom_id = ensure_classroom(e)
    object_id = storage.upload_file(Path(e["video"]), public=True)
    lesson = db.insert("lessons", {
        "classroom_id": classroom_id,
        "title": e["title"],
        "lesson_date": e["date"],
        "status": "uploaded",
        "video_object_id": object_id,
        "source_hash": sha,
    })
    return lesson["id"], False

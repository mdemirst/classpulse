"""ClassPulse local worker.

The browser can't run YOLO / ffmpeg / face embeddings, so the Upload tab calls
this service. It pulls the lesson video + roster from Butterbase, runs the
pipeline, uploads per-student clips back to Butterbase storage, writes the
results rows, and marks the lesson done. The dashboard just reads the DB.

Run:  ./worker/run.sh        (or: uvicorn worker.server:app --port 8000)
"""
import shutil
import threading
import traceback
from pathlib import Path

import requests
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from pipeline import db, storage
from worker import catalog
from pipeline.analyze import analyze_students
from pipeline.cropper import crop_clip, save_thumbnail
from pipeline.faces import load_roster_photos, recognize_tracks
from pipeline.provider import get_provider
from pipeline.publish import publish_lesson
from pipeline.tracking import detect_and_track, video_info

app = FastAPI(title="ClassPulse worker")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

WORK_ROOT = Path("work")
progress: dict[str, dict] = {}
_lock = threading.Lock()


def set_progress(lesson_id: str, stage: str, message: str, pct: int) -> None:
    with _lock:
        progress[lesson_id] = {"stage": stage, "message": message, "progress": pct}
    print(f"[{lesson_id[:8]}] {pct:3d}% {stage}: {message}", flush=True)


class ProcessRequest(BaseModel):
    lesson_id: str
    force: bool = False


class LibraryRequest(BaseModel):
    """Process a video from the on-disk library (no browser upload)."""
    entry_id: str
    force: bool = False


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    return dest


def process_lesson(lesson_id: str) -> None:
    work = WORK_ROOT / lesson_id
    try:
        set_progress(lesson_id, "fetch", "Fetching lesson and roster…", 5)
        lesson = db.get("lessons", lesson_id)
        db.update("lessons", lesson_id, {"status": "processing", "error": None})

        students = db.select("students", f"classroom_id=eq.{lesson['classroom_id']}")
        roster_dir = work / "roster"
        photos: dict[str, Path] = {}
        for s in students:
            if s.get("roster_photo_object_id"):
                url = storage.download_url(s["roster_photo_object_id"])
                photos[s["name"]] = download(url, roster_dir / f"{s['name']}.jpg")
        students_by_name = {s["name"]: s["id"] for s in students}

        set_progress(lesson_id, "download", "Downloading video…", 10)
        video = download(storage.download_url(lesson["video_object_id"]), work / "source.mp4")
        fps, _, _ = video_info(video)

        set_progress(lesson_id, "track", "Detecting and tracking students…", 25)
        tracks = detect_and_track(video)
        duration = max((t.t_end for t in tracks.tracks), default=0.0)
        set_progress(lesson_id, "crop", f"Cropping {len(tracks.tracks)} student clips…", 45)
        for t in tracks.tracks:
            t.clip_path = str(crop_clip(video, t, work / "clips" / f"track_{t.track_id}.mp4"))
            t.thumbnail_path = str(save_thumbnail(video, t, work / "thumbs" / f"track_{t.track_id}.jpg"))

        if photos:
            set_progress(lesson_id, "recognize", "Matching faces to the roster…", 60)
            for m in recognize_tracks(video, tracks, load_roster_photos(photos)):
                track = next(t for t in tracks.tracks if t.track_id == m["track_id"])
                track.name, track.name_similarity = m["name"], m["similarity"]

        set_progress(lesson_id, "analyze",
                     f"Analyzing {len(tracks.tracks)} students with AI…", 70)
        analyses = analyze_students(get_provider(), tracks.tracks, work / "analysis")

        set_progress(lesson_id, "publish", "Publishing results…", 90)
        publish_lesson(lesson_id, tracks, analyses, students_by_name, duration)

        set_progress(lesson_id, "done", "Done.", 100)
    except Exception as e:
        traceback.print_exc()
        set_progress(lesson_id, "failed", str(e), 100)
        try:
            db.update("lessons", lesson_id, {"status": "failed", "error": str(e)[:500]})
        except Exception:
            pass


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/process")
def start(req: ProcessRequest, background: BackgroundTasks) -> dict:
    if req.force:
        shutil.rmtree(WORK_ROOT / req.lesson_id, ignore_errors=True)
    set_progress(req.lesson_id, "queued", "Queued…", 0)
    background.add_task(process_lesson, req.lesson_id)
    return {"started": True, "lesson_id": req.lesson_id}


@app.get("/progress/{lesson_id}")
def get_progress(lesson_id: str) -> dict:
    return progress.get(lesson_id, {"stage": "unknown", "message": "", "progress": 0})


@app.get("/videos")
def videos() -> list[dict]:
    """Lesson videos available to analyze, with metadata for the picker."""
    return catalog.listing()


@app.get("/videos/{entry_id}/thumb.jpg")
def video_thumb(entry_id: str) -> FileResponse:
    try:
        return FileResponse(catalog.thumbnail(entry_id), media_type="image/jpeg")
    except KeyError:
        raise HTTPException(404, "unknown video")


@app.post("/process-library")
def process_library(req: LibraryRequest, background: BackgroundTasks) -> dict:
    """Analyze a library video: seeds the classroom/roster, uploads, runs the pipeline."""
    try:
        lesson_id, already = catalog.prepare_lesson(req.entry_id)
    except KeyError:
        raise HTTPException(404, "unknown video")

    if already and not req.force:
        return {"lesson_id": lesson_id, "cached": True}

    if req.force:
        shutil.rmtree(WORK_ROOT / lesson_id, ignore_errors=True)
    set_progress(lesson_id, "queued", "Queued…", 0)
    background.add_task(process_lesson, lesson_id)
    return {"lesson_id": lesson_id, "cached": False}

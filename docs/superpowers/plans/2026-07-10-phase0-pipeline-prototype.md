# Phase 0: Pipeline Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototype ClassPulse pipeline stages 1–4: classroom video in → tracked per-student face+torso clips out → Gemini per-student engagement analysis JSON, verified against 3 user-provided videos with rosters.

**Architecture:** Python CLI (`python -m pipeline`). Ultralytics YOLO tracks persons across frames; pure-function bbox utilities compute a stable crop window per student; ffmpeg renders per-student clips; the `google-genai` SDK uploads each clip to Gemini and returns schema-validated JSON (roster matching and engagement analysis). Every stage writes artifacts to `work/<lesson>/` so stages can be rerun independently.

**Tech Stack:** Python 3.11+, ultralytics (YOLO11 + built-in tracker), OpenCV, ffmpeg (CLI), google-genai, pydantic v2, pytest.

## Global Constraints

- Repo root: `/Users/mahmutdemir/repos/classpulse`. All paths below are relative to it.
- Virtualenv at `.venv/`; activate with `source .venv/bin/activate` before every command.
- `ffmpeg` must be on PATH (`brew install ffmpeg` if missing).
- Gemini auth: env var `GEMINI_API_KEY`. Model name: env var `GEMINI_MODEL`, default `gemini-2.5-flash` (user will experiment with models later — never hardcode elsewhere).
- Sample layout (user provides): `samples/<lesson>/video.mp4` + `samples/<lesson>/roster/<StudentName>.jpg`. `samples/` and `work/` are gitignored.
- This is a prototype (spike): TDD the pure logic (schemas, box math, track collection, artifact orchestration) with mocked model/tracker; do NOT write tests that call Gemini or run real YOLO inference. Real videos are the manual verification (Task 10).
- Timestamps are always seconds-from-start (float), matching the design spec.
- No network calls in tests. Tests run with `pytest -q` from repo root.

## File Structure

```
pipeline/
  __init__.py       # empty
  __main__.py       # python -m pipeline entrypoint
  cli.py            # argparse + stage orchestration, artifact IO
  schemas.py        # pydantic models: tracks, matches, analysis (the stage contracts)
  boxes.py          # pure bbox math: smoothing, expansion, crop window
  tracking.py       # YOLO wrapper + pure collect_tracks()
  cropper.py        # ffmpeg clip cropping + cv2 thumbnails
  gemini.py         # GeminiClient: upload video/images -> schema-validated JSON
  roster.py         # roster loading + track->name matching via Gemini
  analyze.py        # per-student engagement analysis via Gemini (parallel)
tests/
  conftest.py       # synthetic test video fixture
  test_schemas.py
  test_boxes.py
  test_tracking.py
  test_cropper.py
  test_gemini.py
  test_roster.py
  test_analyze.py
  test_cli.py
samples/README.md   # expected layout for the 3 user-provided lessons
requirements.txt
```

---

### Task 1: Project scaffold

**Files:**
- Create: `requirements.txt`, `.gitignore`, `pipeline/__init__.py`, `samples/README.md`, `tests/test_scaffold.py`

**Interfaces:**
- Produces: importable `pipeline` package; installed dependencies; gitignored `samples/`, `work/`, `.venv/`

- [ ] **Step 1: Create requirements.txt**

```
ultralytics>=8.3
opencv-python>=4.10
google-genai>=1.20
pydantic>=2.7
pytest>=8.0
```

- [ ] **Step 2: Create .gitignore**

```
.venv/
__pycache__/
*.pyc
samples/
work/
.env
*.pt
```

(`*.pt` keeps downloaded YOLO weights out of git.)

- [ ] **Step 3: Create package init and samples README**

`pipeline/__init__.py`: empty file.

`samples/README.md`:

```markdown
# Sample lessons (not committed)

Drop each test lesson here as:

    samples/<lesson-name>/video.mp4
    samples/<lesson-name>/roster/<StudentName>.jpg   (one photo per student; filename = display name)

Example: samples/lesson1/video.mp4, samples/lesson1/roster/Alice.jpg
```

- [ ] **Step 4: Create venv and install**

Run:
```bash
cd /Users/mahmutdemir/repos/classpulse
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ffmpeg -version | head -1
```
Expected: installs succeed; ffmpeg prints a version line (if not: `brew install ffmpeg`).

- [ ] **Step 5: Write scaffold sanity test**

`tests/test_scaffold.py`:
```python
def test_imports():
    import pipeline  # noqa: F401
    import ultralytics  # noqa: F401
    import cv2  # noqa: F401
    from google import genai  # noqa: F401
    import pydantic  # noqa: F401
```

- [ ] **Step 6: Run test**

Run: `pytest tests/test_scaffold.py -q`
Expected: 1 passed

- [ ] **Step 7: Commit**

```bash
git add requirements.txt .gitignore pipeline/__init__.py samples/README.md tests/test_scaffold.py
git commit -m "feat: scaffold Phase 0 pipeline package"
```

---

### Task 2: Stage contracts (schemas.py)

**Files:**
- Create: `pipeline/schemas.py`
- Test: `tests/test_schemas.py`

**Interfaces:**
- Produces (used by every later task):
  - `TrackFrame(frame_idx: int, t: float, bbox: list[int])` — bbox is `[x1, y1, x2, y2]` pixels
  - `Track(track_id: int, frames: list[TrackFrame], crop: list[int] | None = None, clip_path: str | None = None, thumbnail_path: str | None = None)` with properties `t_start`/`t_end` (float seconds)
  - `TracksFile(video: str, fps: float, width: int, height: int, tracks: list[Track])`
  - `RosterMatch(track_id: int, name: str | None, confidence: float)`; `RosterMatches(matches: list[RosterMatch])`
  - `TimelinePoint(t: float, score: int)`; `Evidence(t: float, note: str)`
  - `DistractionEvent(t_start: float, t_end: float, kind: Literal["phone","asleep","chatting","looking_away","other"], note: str)`
  - `StudentAnalysis(engagement_score: int, engagement_timeline: list[TimelinePoint], distraction_events: list[DistractionEvent], evidence: list[Evidence], summary: str)` — engagement_score constrained 0–100

- [ ] **Step 1: Write failing tests**

`tests/test_schemas.py`:
```python
import pytest
from pydantic import ValidationError
from pipeline.schemas import (
    Track, TrackFrame, TracksFile, StudentAnalysis, RosterMatch,
)


def make_track():
    return Track(
        track_id=3,
        frames=[
            TrackFrame(frame_idx=0, t=0.0, bbox=[10, 20, 110, 220]),
            TrackFrame(frame_idx=30, t=1.0, bbox=[12, 22, 112, 222]),
        ],
    )


def test_track_time_range():
    tr = make_track()
    assert tr.t_start == 0.0
    assert tr.t_end == 1.0


def test_tracks_file_roundtrip():
    tf = TracksFile(video="v.mp4", fps=30.0, width=1920, height=1080, tracks=[make_track()])
    again = TracksFile.model_validate_json(tf.model_dump_json())
    assert again.tracks[0].frames[1].bbox == [12, 22, 112, 222]


def test_engagement_score_bounds():
    with pytest.raises(ValidationError):
        StudentAnalysis(
            engagement_score=140, engagement_timeline=[], distraction_events=[],
            evidence=[], summary="x",
        )


def test_roster_match_allows_unknown():
    m = RosterMatch(track_id=1, name=None, confidence=0.2)
    assert m.name is None
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_schemas.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.schemas'`

- [ ] **Step 3: Implement**

`pipeline/schemas.py`:
```python
from typing import Literal

from pydantic import BaseModel, Field


class TrackFrame(BaseModel):
    frame_idx: int
    t: float
    bbox: list[int]  # [x1, y1, x2, y2] pixels


class Track(BaseModel):
    track_id: int
    frames: list[TrackFrame]
    crop: list[int] | None = None  # fixed crop window [x1, y1, x2, y2]
    clip_path: str | None = None
    thumbnail_path: str | None = None

    @property
    def t_start(self) -> float:
        return self.frames[0].t

    @property
    def t_end(self) -> float:
        return self.frames[-1].t


class TracksFile(BaseModel):
    video: str
    fps: float
    width: int
    height: int
    tracks: list[Track]


class RosterMatch(BaseModel):
    track_id: int
    name: str | None
    confidence: float = Field(ge=0.0, le=1.0)


class RosterMatches(BaseModel):
    matches: list[RosterMatch]


class TimelinePoint(BaseModel):
    t: float
    score: int = Field(ge=0, le=100)


class Evidence(BaseModel):
    t: float
    note: str


class DistractionEvent(BaseModel):
    t_start: float
    t_end: float
    kind: Literal["phone", "asleep", "chatting", "looking_away", "other"]
    note: str


class StudentAnalysis(BaseModel):
    engagement_score: int = Field(ge=0, le=100)
    engagement_timeline: list[TimelinePoint]
    distraction_events: list[DistractionEvent]
    evidence: list[Evidence]
    summary: str
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_schemas.py -q`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/schemas.py tests/test_schemas.py
git commit -m "feat: pydantic stage contracts"
```

---

### Task 3: Box math (boxes.py)

**Files:**
- Create: `pipeline/boxes.py`
- Test: `tests/test_boxes.py`

**Interfaces:**
- Consumes: `TrackFrame` from `pipeline.schemas`
- Produces:
  - `smooth_frames(frames: list[TrackFrame], window: int = 9) -> list[TrackFrame]` — centered moving average of bbox coords
  - `crop_window(frames: list[TrackFrame], frame_w: int, frame_h: int, pad: float = 0.15) -> list[int]` — ONE fixed `[x1,y1,x2,y2]` for the whole track: union of smoothed boxes, padded by `pad`×size each side, clamped to frame, width/height forced even (h264 requirement)

- [ ] **Step 1: Write failing tests**

`tests/test_boxes.py`:
```python
from pipeline.boxes import smooth_frames, crop_window
from pipeline.schemas import TrackFrame


def frames_from(bboxes):
    return [TrackFrame(frame_idx=i, t=i / 30.0, bbox=b) for i, b in enumerate(bboxes)]


def test_smooth_removes_jitter_spike():
    boxes = [[100, 100, 200, 300]] * 4 + [[140, 100, 240, 300]] + [[100, 100, 200, 300]] * 4
    smoothed = smooth_frames(frames_from(boxes), window=9)
    # spike frame is averaged toward neighbors
    assert smoothed[4].bbox[0] < 120
    assert len(smoothed) == len(boxes)


def test_crop_window_contains_union_with_padding():
    frames = frames_from([[100, 100, 200, 300], [120, 110, 220, 310]])
    x1, y1, x2, y2 = crop_window(frames, frame_w=1920, frame_h=1080, pad=0.1)
    assert x1 <= 100 and y1 <= 100 and x2 >= 220 and y2 >= 310


def test_crop_window_clamped_and_even():
    frames = frames_from([[5, 5, 199, 299]])
    x1, y1, x2, y2 = crop_window(frames, frame_w=200, frame_h=300, pad=0.5)
    assert x1 >= 0 and y1 >= 0 and x2 <= 200 and y2 <= 300
    assert (x2 - x1) % 2 == 0 and (y2 - y1) % 2 == 0
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_boxes.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.boxes'`

- [ ] **Step 3: Implement**

`pipeline/boxes.py`:
```python
from pipeline.schemas import TrackFrame


def smooth_frames(frames: list[TrackFrame], window: int = 9) -> list[TrackFrame]:
    """Centered moving average over bbox coordinates."""
    half = window // 2
    out = []
    for i, f in enumerate(frames):
        lo, hi = max(0, i - half), min(len(frames), i + half + 1)
        neighborhood = [frames[j].bbox for j in range(lo, hi)]
        avg = [round(sum(b[k] for b in neighborhood) / len(neighborhood)) for k in range(4)]
        out.append(TrackFrame(frame_idx=f.frame_idx, t=f.t, bbox=avg))
    return out


def crop_window(
    frames: list[TrackFrame], frame_w: int, frame_h: int, pad: float = 0.15
) -> list[int]:
    """One fixed crop rect for a whole track: padded union of smoothed boxes."""
    smoothed = smooth_frames(frames)
    x1 = min(f.bbox[0] for f in smoothed)
    y1 = min(f.bbox[1] for f in smoothed)
    x2 = max(f.bbox[2] for f in smoothed)
    y2 = max(f.bbox[3] for f in smoothed)
    pw, ph = pad * (x2 - x1), pad * (y2 - y1)
    x1, y1 = max(0, int(x1 - pw)), max(0, int(y1 - ph))
    x2, y2 = min(frame_w, int(x2 + pw)), min(frame_h, int(y2 + ph))
    if (x2 - x1) % 2:
        x2 -= 1
    if (y2 - y1) % 2:
        y2 -= 1
    return [x1, y1, x2, y2]
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_boxes.py -q`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/boxes.py tests/test_boxes.py
git commit -m "feat: bbox smoothing and fixed crop window"
```

---

### Task 4: Tracking (tracking.py)

**Files:**
- Create: `pipeline/tracking.py`
- Test: `tests/test_tracking.py`

**Interfaces:**
- Consumes: `Track`, `TrackFrame`, `TracksFile` from `pipeline.schemas`; `crop_window` from `pipeline.boxes`
- Produces:
  - `collect_tracks(results_iter, fps: float, vid_stride: int = 1) -> list[Track]` — pure: folds ultralytics result objects into `Track`s (tested with fakes)
  - `run_tracking(video_path: Path, conf: float = 0.3, vid_stride: int = 2, min_track_sec: float = 3.0, model_name: str = "yolo11n.pt") -> TracksFile` — real YOLO wrapper; filters tracks shorter than `min_track_sec`; fills each track's `crop` via `crop_window`. NOT unit-tested (verified in Task 10).

- [ ] **Step 1: Write failing test for collect_tracks**

`tests/test_tracking.py`:
```python
from types import SimpleNamespace

import numpy as np

from pipeline.tracking import collect_tracks


def fake_result(ids, xyxy):
    if ids is None:
        boxes = SimpleNamespace(id=None, xyxy=np.empty((0, 4)))
    else:
        boxes = SimpleNamespace(id=np.array(ids), xyxy=np.array(xyxy, dtype=float))
    return SimpleNamespace(boxes=boxes)


def test_collect_tracks_groups_by_id():
    results = [
        fake_result([1, 2], [[0, 0, 10, 20], [50, 0, 60, 20]]),
        fake_result([1, 2], [[1, 0, 11, 20], [51, 0, 61, 20]]),
        fake_result([1], [[2, 0, 12, 20]]),
    ]
    tracks = collect_tracks(iter(results), fps=30.0, vid_stride=1)
    by_id = {t.track_id: t for t in tracks}
    assert set(by_id) == {1, 2}
    assert len(by_id[1].frames) == 3
    assert len(by_id[2].frames) == 2
    assert by_id[1].frames[2].frame_idx == 2
    assert abs(by_id[1].frames[2].t - 2 / 30.0) < 1e-9


def test_collect_tracks_respects_stride():
    results = [fake_result([1], [[0, 0, 10, 20]]), fake_result([1], [[1, 0, 11, 20]])]
    tracks = collect_tracks(iter(results), fps=30.0, vid_stride=2)
    assert tracks[0].frames[1].frame_idx == 2  # second processed frame is source frame 2
    assert abs(tracks[0].frames[1].t - 2 / 30.0) < 1e-9


def test_collect_tracks_skips_frames_without_ids():
    results = [fake_result(None, []), fake_result([7], [[0, 0, 4, 4]])]
    tracks = collect_tracks(iter(results), fps=10.0, vid_stride=1)
    assert len(tracks) == 1 and tracks[0].track_id == 7
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_tracking.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.tracking'`

- [ ] **Step 3: Implement**

`pipeline/tracking.py`:
```python
from pathlib import Path

import cv2

from pipeline.boxes import crop_window
from pipeline.schemas import Track, TrackFrame, TracksFile


def collect_tracks(results_iter, fps: float, vid_stride: int = 1) -> list[Track]:
    """Fold ultralytics track() results into Track objects keyed by track id."""
    frames_by_id: dict[int, list[TrackFrame]] = {}
    for i, result in enumerate(results_iter):
        frame_idx = i * vid_stride
        boxes = result.boxes
        if boxes is None or boxes.id is None:
            continue
        ids = [int(x) for x in boxes.id]
        coords = [[int(v) for v in row] for row in boxes.xyxy]
        for track_id, bbox in zip(ids, coords):
            frames_by_id.setdefault(track_id, []).append(
                TrackFrame(frame_idx=frame_idx, t=frame_idx / fps, bbox=bbox)
            )
    return [Track(track_id=tid, frames=frames) for tid, frames in sorted(frames_by_id.items())]


def run_tracking(
    video_path: Path,
    conf: float = 0.3,
    vid_stride: int = 2,
    min_track_sec: float = 3.0,
    model_name: str = "yolo11n.pt",
) -> TracksFile:
    """Run YOLO person tracking over a video. Slow; not covered by unit tests."""
    from ultralytics import YOLO  # import here: heavy

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    model = YOLO(model_name)
    results = model.track(
        source=str(video_path), stream=True, persist=True,
        classes=[0], conf=conf, vid_stride=vid_stride, verbose=False,
    )
    tracks = collect_tracks(results, fps=fps, vid_stride=vid_stride)
    tracks = [t for t in tracks if t.t_end - t.t_start >= min_track_sec]
    for t in tracks:
        t.crop = crop_window(t.frames, frame_w=width, frame_h=height)
    return TracksFile(video=str(video_path), fps=fps, width=width, height=height, tracks=tracks)
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_tracking.py -q`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/tracking.py tests/test_tracking.py
git commit -m "feat: YOLO tracking wrapper with pure track collection"
```

---

### Task 5: Clip cropping (cropper.py)

**Files:**
- Create: `pipeline/cropper.py`, `tests/conftest.py`
- Test: `tests/test_cropper.py`

**Interfaces:**
- Consumes: `Track` from `pipeline.schemas` (uses `track.crop`, `t_start`, `t_end`)
- Produces:
  - `crop_clip(video_path: Path, track: Track, out_path: Path) -> Path` — ffmpeg: crops `track.crop`, trims to `[t_start, t_end]`, strips audio
  - `save_thumbnail(video_path: Path, track: Track, out_path: Path) -> Path` — cv2: middle frame of the track, cropped, saved as JPEG
- Also produces the shared `synthetic_video` pytest fixture (session-scoped) used by Task 9's integration test

- [ ] **Step 1: Write synthetic video fixture**

`tests/conftest.py`:
```python
from pathlib import Path

import cv2
import numpy as np
import pytest


@pytest.fixture(scope="session")
def synthetic_video(tmp_path_factory) -> Path:
    """6-second 320x240 10fps video: white square drifting right on black."""
    path = tmp_path_factory.mktemp("video") / "synthetic.mp4"
    writer = cv2.VideoWriter(
        str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (320, 240)
    )
    for i in range(60):
        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        x = 40 + i  # drifts right
        cv2.rectangle(frame, (x, 80), (x + 60, 180), (255, 255, 255), -1)
        writer.write(frame)
    writer.release()
    return path
```

- [ ] **Step 2: Write failing tests**

`tests/test_cropper.py`:
```python
import cv2

from pipeline.cropper import crop_clip, save_thumbnail
from pipeline.schemas import Track, TrackFrame


def square_track():
    frames = [
        TrackFrame(frame_idx=i, t=i / 10.0, bbox=[40 + i, 80, 100 + i, 180])
        for i in range(0, 60, 2)
    ]
    return Track(track_id=1, frames=frames, crop=[30, 70, 170, 190])


def test_crop_clip_produces_video(synthetic_video, tmp_path):
    out = crop_clip(synthetic_video, square_track(), tmp_path / "s1.mp4")
    cap = cv2.VideoCapture(str(out))
    assert cap.isOpened()
    assert int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) == 140  # 170-30
    assert int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) == 120  # 190-70
    assert cap.get(cv2.CAP_PROP_FRAME_COUNT) > 30  # ~5.8s at 10fps
    cap.release()


def test_save_thumbnail(synthetic_video, tmp_path):
    out = save_thumbnail(synthetic_video, square_track(), tmp_path / "s1.jpg")
    img = cv2.imread(str(out))
    assert img is not None
    assert img.shape[0] == 120 and img.shape[1] == 140
```

- [ ] **Step 3: Run to verify failure**

Run: `pytest tests/test_cropper.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.cropper'`

- [ ] **Step 4: Implement**

`pipeline/cropper.py`:
```python
import subprocess
from pathlib import Path

import cv2

from pipeline.schemas import Track


def crop_clip(video_path: Path, track: Track, out_path: Path) -> Path:
    """Render the per-student clip: fixed crop window, track's time range, no audio."""
    x1, y1, x2, y2 = track.crop
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{track.t_start:.3f}", "-to", f"{track.t_end:.3f}",
        "-i", str(video_path),
        "-vf", f"crop={x2 - x1}:{y2 - y1}:{x1}:{y1}",
        "-an", str(out_path),
    ]
    subprocess.run(cmd, check=True)
    return out_path


def save_thumbnail(video_path: Path, track: Track, out_path: Path) -> Path:
    """Middle-of-track cropped frame as JPEG (for roster matching + dashboard)."""
    x1, y1, x2, y2 = track.crop
    mid_frame = track.frames[len(track.frames) // 2].frame_idx
    cap = cv2.VideoCapture(str(video_path))
    cap.set(cv2.CAP_PROP_POS_FRAMES, mid_frame)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"could not read frame {mid_frame} of {video_path}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), frame[y1:y2, x1:x2])
    return out_path
```

- [ ] **Step 5: Run to verify pass**

Run: `pytest tests/test_cropper.py -q`
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add pipeline/cropper.py tests/conftest.py tests/test_cropper.py
git commit -m "feat: per-student clip cropping and thumbnails"
```

---

### Task 6: Gemini client (gemini.py)

**Files:**
- Create: `pipeline/gemini.py`
- Test: `tests/test_gemini.py`

**Interfaces:**
- Consumes: pydantic models from `pipeline.schemas` (as `schema` args)
- Produces:
  - `class GeminiClient(model: str | None = None)` — reads `GEMINI_MODEL` env (default `gemini-2.5-flash`); requires `GEMINI_API_KEY`
  - `GeminiClient.analyze_video(video_path: Path, prompt: str, schema: type[BaseModel]) -> BaseModel` — uploads file, polls until ACTIVE, structured-output call, one retry on validation failure; saves raw response text next to nothing (caller persists)
  - `GeminiClient.analyze_images(parts: list[str | Path], prompt: str, schema: type[BaseModel]) -> BaseModel` — interleaved text labels and image paths, inline bytes

- [ ] **Step 1: Write failing tests (mocked SDK)**

`tests/test_gemini.py`:
```python
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from pydantic import BaseModel

from pipeline.gemini import GeminiClient


class Answer(BaseModel):
    value: int


def make_client(response_texts):
    """GeminiClient with a fully mocked google-genai client underneath."""
    with patch("pipeline.gemini.genai.Client") as ctor:
        mock = MagicMock()
        ctor.return_value = mock
        uploaded = SimpleNamespace(name="files/abc", state=SimpleNamespace(name="ACTIVE"))
        mock.files.upload.return_value = uploaded
        mock.files.get.return_value = uploaded
        mock.models.generate_content.side_effect = [
            SimpleNamespace(text=t) for t in response_texts
        ]
        client = GeminiClient(model="test-model")
    return client, mock


def test_analyze_video_parses_schema(tmp_path):
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"fake")
    client, mock = make_client(['{"value": 42}'])
    result = client.analyze_video(video, "prompt", Answer)
    assert result.value == 42
    mock.files.upload.assert_called_once()


def test_analyze_video_retries_once_on_bad_json(tmp_path):
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"fake")
    client, mock = make_client(["not json", '{"value": 7}'])
    result = client.analyze_video(video, "prompt", Answer)
    assert result.value == 7
    assert mock.models.generate_content.call_count == 2


def test_analyze_video_raises_after_two_failures(tmp_path):
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"fake")
    client, _ = make_client(["nope", "still nope"])
    with pytest.raises(ValueError):
        client.analyze_video(video, "prompt", Answer)
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_gemini.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.gemini'`

- [ ] **Step 3: Implement**

`pipeline/gemini.py`:
```python
import os
import time
from pathlib import Path

from google import genai
from google.genai import types
from pydantic import BaseModel

DEFAULT_MODEL = "gemini-2.5-flash"


class GeminiClient:
    def __init__(self, model: str | None = None):
        self.model = model or os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
        self.client = genai.Client()  # reads GEMINI_API_KEY

    def _generate(self, contents: list, schema: type[BaseModel]) -> BaseModel:
        last_error = None
        for _ in range(2):  # one retry
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
            try:
                return schema.model_validate_json(response.text)
            except Exception as e:  # malformed/truncated JSON
                last_error = e
        raise ValueError(f"model returned invalid {schema.__name__}: {last_error}")

    def _upload_and_wait(self, path: Path, timeout_sec: float = 300.0):
        uploaded = self.client.files.upload(file=str(path))
        deadline = time.monotonic() + timeout_sec
        while uploaded.state.name == "PROCESSING":
            if time.monotonic() > deadline:
                raise TimeoutError(f"file {path} stuck PROCESSING")
            time.sleep(2)
            uploaded = self.client.files.get(name=uploaded.name)
        if uploaded.state.name != "ACTIVE":
            raise RuntimeError(f"upload failed for {path}: {uploaded.state.name}")
        return uploaded

    def analyze_video(self, video_path: Path, prompt: str, schema: type[BaseModel]) -> BaseModel:
        uploaded = self._upload_and_wait(video_path)
        return self._generate([uploaded, prompt], schema)

    def analyze_images(self, parts: list, prompt: str, schema: type[BaseModel]) -> BaseModel:
        """parts: interleaved strings (labels) and Paths (images), inline bytes."""
        contents: list = []
        for p in parts:
            if isinstance(p, Path):
                contents.append(
                    types.Part.from_bytes(data=p.read_bytes(), mime_type="image/jpeg")
                )
            else:
                contents.append(p)
        contents.append(prompt)
        return self._generate(contents, schema)
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_gemini.py -q`
Expected: 3 passed

- [ ] **Step 5: Live smoke test (manual, needs GEMINI_API_KEY)**

Run:
```bash
python - <<'EOF'
from pathlib import Path
from pydantic import BaseModel
from pipeline.gemini import GeminiClient

class Ping(BaseModel):
    ok: bool
    model_seen: str

c = GeminiClient()
print(c._generate(["Reply with ok=true and model_seen='hello'"], Ping))
EOF
```
Expected: prints `ok=True model_seen='hello'` (or similar). If `GEMINI_API_KEY` is missing this fails — set it first. This validates key + model name before we burn time in later tasks.

- [ ] **Step 6: Commit**

```bash
git add pipeline/gemini.py tests/test_gemini.py
git commit -m "feat: Gemini client with video upload and structured output"
```

---

### Task 7: Roster matching (roster.py)

**Files:**
- Create: `pipeline/roster.py`
- Test: `tests/test_roster.py`

**Interfaces:**
- Consumes: `GeminiClient.analyze_images`; `TracksFile`, `RosterMatches` from schemas; track thumbnails from Task 5
- Produces:
  - `load_roster(roster_dir: Path) -> dict[str, Path]` — `{"Alice": Path(".../Alice.jpg"), ...}` from filename stems, sorted, jpg/jpeg/png
  - `match_tracks(client: GeminiClient, roster: dict[str, Path], tracks: TracksFile) -> RosterMatches` — single Gemini call over all roster photos + all track thumbnails
  - `ROSTER_PROMPT` (module constant)

- [ ] **Step 1: Write failing tests**

`tests/test_roster.py`:
```python
from pathlib import Path
from unittest.mock import MagicMock

from pipeline.roster import load_roster, match_tracks
from pipeline.schemas import RosterMatch, RosterMatches, Track, TrackFrame, TracksFile


def test_load_roster_names_from_filenames(tmp_path):
    (tmp_path / "Alice.jpg").write_bytes(b"x")
    (tmp_path / "Bob Kaya.png").write_bytes(b"x")
    (tmp_path / "notes.txt").write_bytes(b"x")
    roster = load_roster(tmp_path)
    assert list(roster) == ["Alice", "Bob Kaya"]


def test_match_tracks_builds_labeled_parts(tmp_path):
    roster = {"Alice": tmp_path / "Alice.jpg"}
    (tmp_path / "Alice.jpg").write_bytes(b"x")
    thumb = tmp_path / "t1.jpg"
    thumb.write_bytes(b"x")
    track = Track(
        track_id=1,
        frames=[TrackFrame(frame_idx=0, t=0.0, bbox=[0, 0, 1, 1])],
        thumbnail_path=str(thumb),
    )
    tf = TracksFile(video="v", fps=30, width=100, height=100, tracks=[track])

    client = MagicMock()
    client.analyze_images.return_value = RosterMatches(
        matches=[RosterMatch(track_id=1, name="Alice", confidence=0.9)]
    )
    result = match_tracks(client, roster, tf)
    assert result.matches[0].name == "Alice"

    parts = client.analyze_images.call_args.args[0]
    labels = [p for p in parts if isinstance(p, str)]
    assert any("Alice" in s for s in labels)
    assert any("Track 1" in s for s in labels)
    assert sum(isinstance(p, Path) for p in parts) == 2
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_roster.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.roster'`

- [ ] **Step 3: Implement**

`pipeline/roster.py`:
```python
from pathlib import Path

from pipeline.gemini import GeminiClient
from pipeline.schemas import RosterMatches, TracksFile

ROSTER_PROMPT = """You are matching detected people in a classroom video to a student roster.
Above are labeled roster photos, then labeled thumbnails of detected people (tracks).
For EVERY track, output one match: the roster student's exact name, or null if you are
not reasonably sure. A roster student can match at most one track. Confidence is 0-1.
Return matches for all tracks."""

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def load_roster(roster_dir: Path) -> dict[str, Path]:
    photos = sorted(
        p for p in roster_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES
    )
    return {p.stem: p for p in photos}


def match_tracks(
    client: GeminiClient, roster: dict[str, Path], tracks: TracksFile
) -> RosterMatches:
    parts: list = []
    for name, photo in roster.items():
        parts.append(f"Roster photo — student name: {name}")
        parts.append(photo)
    for track in tracks.tracks:
        parts.append(f"Detected person — Track {track.track_id}")
        parts.append(Path(track.thumbnail_path))
    return client.analyze_images(parts, ROSTER_PROMPT, RosterMatches)
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_roster.py -q`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/roster.py tests/test_roster.py
git commit -m "feat: roster loading and Gemini track matching"
```

---

### Task 8: Per-student analysis (analyze.py)

**Files:**
- Create: `pipeline/analyze.py`
- Test: `tests/test_analyze.py`

**Interfaces:**
- Consumes: `GeminiClient.analyze_video`; `Track`, `StudentAnalysis` from schemas
- Produces:
  - `ANALYSIS_PROMPT` (module constant)
  - `analyze_students(client: GeminiClient, tracks: list[Track], max_workers: int = 4) -> dict[int, StudentAnalysis | None]` — parallel over tracks with `clip_path`; a per-track exception degrades that track to `None` (spec: per-student failure must not kill the run)

- [ ] **Step 1: Write failing tests**

`tests/test_analyze.py`:
```python
from unittest.mock import MagicMock

from pipeline.analyze import analyze_students
from pipeline.schemas import StudentAnalysis, Track, TrackFrame


def track(tid, clip="c.mp4"):
    return Track(
        track_id=tid,
        frames=[TrackFrame(frame_idx=0, t=0.0, bbox=[0, 0, 1, 1])],
        clip_path=clip,
    )


def analysis(score):
    return StudentAnalysis(
        engagement_score=score, engagement_timeline=[], distraction_events=[],
        evidence=[], summary="s",
    )


def test_analyze_students_maps_by_track_id():
    client = MagicMock()
    client.analyze_video.side_effect = [analysis(80), analysis(40)]
    result = analyze_students(client, [track(1), track(2)], max_workers=1)
    assert result[1].engagement_score == 80
    assert result[2].engagement_score == 40


def test_failure_degrades_to_none_not_crash():
    client = MagicMock()
    client.analyze_video.side_effect = [RuntimeError("quota"), analysis(70)]
    result = analyze_students(client, [track(1), track(2)], max_workers=1)
    assert result[1] is None
    assert result[2].engagement_score == 70


def test_tracks_without_clips_are_skipped():
    client = MagicMock()
    result = analyze_students(client, [track(1, clip=None)], max_workers=1)
    assert result == {}
    client.analyze_video.assert_not_called()
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_analyze.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.analyze'`

- [ ] **Step 3: Implement**

`pipeline/analyze.py`:
```python
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pipeline.gemini import GeminiClient
from pipeline.schemas import StudentAnalysis, Track

ANALYSIS_PROMPT = """This video is a single student, cropped from a classroom lesson recording.
Analyze this student's engagement over the whole clip. Timestamps are seconds from
the START OF THIS CLIP. Be specific and honest — if the student is attentive, say so.

Return:
- engagement_score: 0-100 overall for the clip
- engagement_timeline: one score roughly every 15 seconds
- distraction_events: only clear ones (phone, asleep, chatting, looking_away, other),
  with t_start/t_end and a short note
- evidence: 2-5 timestamped observations that justify your scores
- summary: one honest paragraph about this student's engagement"""


def analyze_students(
    client: GeminiClient, tracks: list[Track], max_workers: int = 4
) -> dict[int, StudentAnalysis | None]:
    todo = [t for t in tracks if t.clip_path]

    def one(track: Track):
        try:
            return track.track_id, client.analyze_video(
                Path(track.clip_path), ANALYSIS_PROMPT, StudentAnalysis
            )
        except Exception as e:
            print(f"  track {track.track_id}: analysis failed: {e}")
            return track.track_id, None

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        return dict(pool.map(one, todo))
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_analyze.py -q`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/analyze.py tests/test_analyze.py
git commit -m "feat: parallel per-student Gemini analysis"
```

---

### Task 9: CLI orchestration (cli.py)

**Files:**
- Create: `pipeline/cli.py`, `pipeline/__main__.py`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes: everything above
- Produces: `python -m pipeline process samples/<lesson> --work work/<lesson> [--stage track|crop|match|analyze]`
  - Artifacts in `--work` dir: `tracks.json` (TracksFile incl. crop/clip/thumbnail paths), `matches.json` (RosterMatches), `report.json`
  - `report.json` shape (consumed by event-day publish stage and by humans):
    `{"video": str, "students": [{"track_id": int, "name": str | null, "confidence": float, "clip": str, "thumbnail": str, "analysis": StudentAnalysis | null}]}`
  - No `--stage` = run all stages; with `--stage` = run only that stage, loading prior artifacts

- [ ] **Step 1: Write failing integration test (mocks for YOLO + Gemini)**

`tests/test_cli.py`:
```python
import json
from unittest.mock import MagicMock, patch

from pipeline.cli import run
from pipeline.schemas import (
    RosterMatch, RosterMatches, StudentAnalysis, Track, TrackFrame, TracksFile,
)


def fake_tracks_file(video_path):
    frames = [
        TrackFrame(frame_idx=i, t=i / 10.0, bbox=[40 + i, 80, 100 + i, 180])
        for i in range(0, 60, 2)
    ]
    return TracksFile(
        video=str(video_path), fps=10.0, width=320, height=240,
        tracks=[Track(track_id=1, frames=frames, crop=[30, 70, 170, 190])],
    )


def test_full_run_writes_report(synthetic_video, tmp_path):
    lesson = tmp_path / "lesson"
    roster = lesson / "roster"
    roster.mkdir(parents=True)
    (roster / "Alice.jpg").write_bytes(b"x")
    video = lesson / "video.mp4"
    video.write_bytes(synthetic_video.read_bytes())
    work = tmp_path / "work"

    analysis = StudentAnalysis(
        engagement_score=75, engagement_timeline=[], distraction_events=[],
        evidence=[], summary="attentive",
    )
    gemini = MagicMock()
    gemini.analyze_images.return_value = RosterMatches(
        matches=[RosterMatch(track_id=1, name="Alice", confidence=0.95)]
    )
    gemini.analyze_video.return_value = analysis

    with patch("pipeline.cli.run_tracking", return_value=fake_tracks_file(video)), \
         patch("pipeline.cli.GeminiClient", return_value=gemini):
        run(lesson_dir=lesson, work_dir=work, stage=None)

    report = json.loads((work / "report.json").read_text())
    student = report["students"][0]
    assert student["name"] == "Alice"
    assert student["analysis"]["engagement_score"] == 75
    assert (work / "tracks.json").exists()
    assert (work / "clips" / "track_1.mp4").exists()
    assert (work / "thumbs" / "track_1.jpg").exists()


def test_single_stage_reuses_artifacts(synthetic_video, tmp_path):
    lesson = tmp_path / "lesson"
    (lesson / "roster").mkdir(parents=True)
    (lesson / "roster" / "Alice.jpg").write_bytes(b"x")
    video = lesson / "video.mp4"
    video.write_bytes(synthetic_video.read_bytes())
    work = tmp_path / "work"

    gemini = MagicMock()
    gemini.analyze_images.return_value = RosterMatches(matches=[])
    gemini.analyze_video.return_value = StudentAnalysis(
        engagement_score=50, engagement_timeline=[], distraction_events=[],
        evidence=[], summary="ok",
    )
    with patch("pipeline.cli.run_tracking", return_value=fake_tracks_file(video)) as mock_track, \
         patch("pipeline.cli.GeminiClient", return_value=gemini):
        run(lesson_dir=lesson, work_dir=work, stage="track")
        run(lesson_dir=lesson, work_dir=work, stage="crop")
        run(lesson_dir=lesson, work_dir=work, stage="analyze")
        assert mock_track.call_count == 1  # analyze stage did NOT re-track
    assert (work / "report.json").exists()
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest tests/test_cli.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.cli'`

- [ ] **Step 3: Implement**

`pipeline/cli.py`:
```python
import argparse
import json
from pathlib import Path

from pipeline.analyze import analyze_students
from pipeline.cropper import crop_clip, save_thumbnail
from pipeline.gemini import GeminiClient
from pipeline.roster import load_roster, match_tracks
from pipeline.schemas import RosterMatches, StudentAnalysis, TracksFile
from pipeline.tracking import run_tracking

STAGES = ["track", "crop", "match", "analyze"]


def _load_tracks(work_dir: Path) -> TracksFile:
    return TracksFile.model_validate_json((work_dir / "tracks.json").read_text())


def _save_tracks(work_dir: Path, tracks: TracksFile) -> None:
    (work_dir / "tracks.json").write_text(tracks.model_dump_json(indent=2))


def run(lesson_dir: Path, work_dir: Path, stage: str | None) -> None:
    video = lesson_dir / "video.mp4"
    work_dir.mkdir(parents=True, exist_ok=True)
    stages = STAGES if stage is None else [stage]

    if "track" in stages:
        print(f"[track] {video}")
        tracks = run_tracking(video)
        _save_tracks(work_dir, tracks)
        print(f"[track] {len(tracks.tracks)} tracks kept")

    if "crop" in stages:
        tracks = _load_tracks(work_dir)
        for t in tracks.tracks:
            t.clip_path = str(crop_clip(video, t, work_dir / "clips" / f"track_{t.track_id}.mp4"))
            t.thumbnail_path = str(save_thumbnail(video, t, work_dir / "thumbs" / f"track_{t.track_id}.jpg"))
            print(f"[crop] track {t.track_id} -> {t.clip_path}")
        _save_tracks(work_dir, tracks)

    if "match" in stages:
        tracks = _load_tracks(work_dir)
        roster = load_roster(lesson_dir / "roster")
        print(f"[match] {len(roster)} roster photos vs {len(tracks.tracks)} tracks")
        matches = match_tracks(GeminiClient(), roster, tracks)
        (work_dir / "matches.json").write_text(matches.model_dump_json(indent=2))

    if "analyze" in stages:
        tracks = _load_tracks(work_dir)
        print(f"[analyze] {len(tracks.tracks)} clips")
        analyses = analyze_students(GeminiClient(), tracks.tracks)
        _write_report(work_dir, tracks, analyses)
        print(f"[analyze] report -> {work_dir / 'report.json'}")


def _write_report(
    work_dir: Path, tracks: TracksFile, analyses: dict[int, StudentAnalysis | None]
) -> None:
    matches_path = work_dir / "matches.json"
    by_track: dict[int, tuple[str | None, float]] = {}
    if matches_path.exists():
        for m in RosterMatches.model_validate_json(matches_path.read_text()).matches:
            by_track[m.track_id] = (m.name, m.confidence)
    students = []
    for t in tracks.tracks:
        name, conf = by_track.get(t.track_id, (None, 0.0))
        a = analyses.get(t.track_id)
        students.append({
            "track_id": t.track_id, "name": name, "confidence": conf,
            "clip": t.clip_path, "thumbnail": t.thumbnail_path,
            "analysis": a.model_dump() if a else None,
        })
    (work_dir / "report.json").write_text(
        json.dumps({"video": tracks.video, "students": students}, indent=2)
    )


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("process", help="process a lesson directory")
    p.add_argument("lesson_dir", type=Path, help="dir with video.mp4 + roster/")
    p.add_argument("--work", type=Path, required=True, help="artifact output dir")
    p.add_argument("--stage", choices=STAGES, default=None)
    args = parser.parse_args()
    run(lesson_dir=args.lesson_dir, work_dir=args.work, stage=args.stage)
```

`pipeline/__main__.py`:
```python
from pipeline.cli import main

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_cli.py -q`
Expected: 2 passed

- [ ] **Step 5: Run full suite**

Run: `pytest -q`
Expected: all tests pass (≈18)

- [ ] **Step 6: Commit**

```bash
git add pipeline/cli.py pipeline/__main__.py tests/test_cli.py
git commit -m "feat: pipeline CLI with stage orchestration and report output"
```

---

### Task 10: Real-video verification and tuning (manual)

**Files:**
- Create: `docs/notes/phase0-results.md` (findings log)

**Interfaces:**
- Consumes: the full CLI; user-provided `samples/lesson1..3` with rosters; `GEMINI_API_KEY`

- [ ] **Step 1: Confirm samples in place**

Run: `ls samples/*/video.mp4 samples/*/roster/`
Expected: 3 lessons, each with video.mp4 and roster images. If missing, ask the user to drop them in per `samples/README.md`.

- [ ] **Step 2: Track + crop lesson1 and eyeball clips**

Run:
```bash
python -m pipeline process samples/lesson1 --work work/lesson1 --stage track
python -m pipeline process samples/lesson1 --work work/lesson1 --stage crop
open work/lesson1/clips/
```
Check each clip: one student, face+torso visible, not jittery, no identity swaps mid-clip. Record issues in `docs/notes/phase0-results.md`.

- [ ] **Step 3: Tune if needed**

Known knobs (change, rerun stage, re-eyeball):
- Missed/flickering detections → `conf=0.2` in `run_tracking`; try `model_name="yolo11s.pt"` (bigger model)
- Same student split into multiple tracks → this is tracker ID churn; acceptable if segments ≥ min_track_sec (they analyze independently); note frequency in results log
- Crop too tight/loose → `pad` in `crop_window`
- Too slow → `vid_stride=3`

- [ ] **Step 4: Match + analyze lesson1**

Run:
```bash
python -m pipeline process samples/lesson1 --work work/lesson1 --stage match
python -m pipeline process samples/lesson1 --work work/lesson1 --stage analyze
python -m json.tool work/lesson1/report.json | head -80
```
Check: names correct vs roster; engagement scores/distraction events plausible vs the actual behaviors staged in the video; evidence timestamps point at real moments (scrub the clip to verify 2-3 of them).

- [ ] **Step 5: Process lessons 2 and 3**

Run:
```bash
python -m pipeline process samples/lesson2 --work work/lesson2
python -m pipeline process samples/lesson3 --work work/lesson3
```
Repeat the checks. The 3 videos have different staged behaviors — verify the analyses *differ accordingly* (the distracted student scores lower than the attentive one, etc.).

- [ ] **Step 6: Write findings log**

`docs/notes/phase0-results.md` — record per lesson: number of tracks vs actual people, roster match accuracy, analysis plausibility notes, wall-clock time per stage, Gemini cost estimate per student-clip, chosen knob values (conf/stride/pad/model), and any prompt tweaks made. These numbers drive event-day decisions (clip lengths, parallelism, model choice).

- [ ] **Step 7: Commit**

```bash
git add docs/notes/phase0-results.md
git commit -m "docs: Phase 0 real-video verification results"
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ClassPulse** — camera + voice classroom intelligence (engagement scoring, attendance, AI lesson notes), built for the AI Education Hackathon on 2026-07-11, Intelligent Classroom Systems track. Two-person team: Person A owns the Python CV/AI pipeline, Person B owns the Next.js dashboard.

No application code exists yet. The authoritative documents are:

- `docs/superpowers/specs/2026-07-10-classpulse-design.md` — full design spec (architecture, Butterbase data model, pipeline stages, dashboard pages). Read this before any implementation work.
- `docs/superpowers/plans/2026-07-10-phase0-pipeline-prototype.md` — task-by-task implementation plan for pipeline stages 1–4 (`pipeline/` package, TDD with mocked models). Execute with superpowers:subagent-driven-development or superpowers:executing-plans.
- `docs/notes/` — brainstorm decisions and seed notes (background context).

## Architecture (from the spec)

Two independent halves; the **Butterbase DB schema is the only contract** between them:

- **Pipeline** (Person A, Python CLI, runs locally, never deployed): video → ffmpeg extract → YOLO11 person tracking → per-student face+torso crops → Gemini roster matching + per-student engagement analysis → transcript → LLM synthesis → publish to Butterbase + EverOS memory. Stages write to `work/<lesson_id>/` and are rerunnable individually: `python -m pipeline process <video> [--stage <name>]`.
- **Dashboard** (Person B, Next.js): reads only from Butterbase. Local dev via `npm run dev`; seed fixtures via `npm run seed`.

Key conventions: all model calls go through one `ModelProvider` interface (`analyze_video`, `transcribe`, `complete`; Gemini first, model name from `GEMINI_MODEL` env var, never hardcoded); all timestamps are seconds-from-start floats; unmatched tracks become "Unknown student" rows.

## Commands (planned by the Phase 0 plan)

- Python venv at `.venv/` — `source .venv/bin/activate` first
- Tests: `pytest -q` from repo root (no network calls, no real YOLO/Gemini in tests)
- Pipeline: `python -m pipeline process <video> [--stage <name>]`
- `ffmpeg` must be on PATH; Gemini auth via `GEMINI_API_KEY` env var

## Data assets (already collected, all gitignored)

`datasets/` and `sample-videos/*.mp4` are **local-only** (see `.gitignore`); `sample-videos/SOURCES.md` (tracked) holds provenance and CC-BY attribution for everything below.

### sample-videos/
- Three CC-BY YouTube full-lesson recordings (UQx classroom observations, Grade 3 maths) — real continuous 360p video, camera mostly on teacher/whole class.
- `classpulse-sample-classroom-A-video0109.mp4` (24s) and `...-B-video0107.mp4` (18s) — **the preferred demo inputs**: static camera facing the students, whole class visible, 1280×720 5fps H.264. Generated from Roboflow frames (see below); motion is ~1 frame/0.7s time-lapse, fine for sampled inference but not for optical-flow models.

### datasets/student-behavior-roboflow-v15/  (Roboflow `class-t58ex/student-behavior` v15, CC BY 4.0)
- YOLO format, 4 classes: `sit` (person box on every seated student), `lookup` (head up/attentive), `down` (head down at desk/phone), `bow` (slumped on desk) — i.e. an attention-state detector dataset. 3,957 train / 331 valid at 640×640, ~147K boxes. Train images are 3× augmented copies of 1,319 originals.
- `frames-unique/` — deduplicated frames, one per original, split into 3 scenes (lecture hall, small classroom evening, overhead CCTV study room), ordered `frame_NNNN.jpg`.

### datasets/student-behavior-xeopo-v1/  (Roboflow `renu-vpzia/student-behavior-xeopo` v1, CC BY 4.0)
- YOLO format, classes `0-4` decoded as: 0 = teacher lecturing, 1 = teacher helping at desks, 2 = student standing to answer, 3 = student group presenting, 4 = teacher writing on board. Sparse event labels (one box per actor), not per-student.
- `frames-unique/videoNNNN/camXX_segYYY/` — 8,612 frames from 64 source lesson videos, deduplicated and split so **every leaf folder is one continuous shot from one camera** (these recordings cut between student-facing and teacher-facing cameras).
- Best student-facing sequences: `video0081/cam01` (284 frames), `video0090/cam04` (150), `video0109/cam01` (122, uncut, has baked-in speckle noise), `video0107/cam01` (92, uncut, clean). Longest sequences are capped ~284 frames — the uploader sampled sparsely; don't hunt for longer ones here.
- `datasets/student-behavior-dcogm-v1/` duplicates xeopo's frames with person-only labels (safe to delete if space is needed).

### Dataset workflows that worked (for getting more data)
- Roboflow download: `curl "https://api.roboflow.com/<ws>/<proj>/<ver>/yolov8?api_key=$ROBOFLOW_API_KEY"` → follow `export.link`. Full-res originals of any public project's samples: scrape `source.roboflow.com/<key>/<id>/thumb.jpg` URLs from the Universe page (via `r.jina.ai` proxy — direct fetch is bot-blocked) and swap `thumb.jpg` → `original.jpg`.
- Roboflow exports hide augmented duplicates behind `<stem>_jpg.rf.<hash>` filenames; group by stem to dedupe. Pick variants by similarity-to-neighbor-frame (catches rotated copies), then swap in the lowest-noise variant only when interchangeable with both neighbors.
- yt-dlp needs `--extractor-args "youtube:player_client=android"` currently; search CC-licensed YouTube with `&sp=EgIwAQ%253D%253D`.
- Known video (not frame) sources if needed: MM-TBA (4,839 real classroom videos, figshare DOI 10.6084/m9.figshare.28942487, teacher-focused cameras); DAiSEE mirror on HF (`adnan0509/Student-Engagement-Detection`, per-student webcam e-learning clips). BNU-LCSAD was never released; SCB-Dataset (HF `wintonYF/SCB-Dataset`) is images-only and research-only licensed.

### Licensing note
Roboflow datasets and generated sample videos are CC BY 4.0 (attribution required, commercial OK — keep SOURCES.md). Classroom footage shows minors: fine for internal prototyping, but don't redistribute or use in marketing without checking terms.

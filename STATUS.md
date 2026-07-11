# ClassPulse — Project Status

**Last updated:** 2026-07-11, hackathon day (afternoon)
**Live app:** https://classpulse.butterbase.dev · **Butterbase app:** `app_k03t6gua7dg1`

## What works, end to end

1. **Landing** (`/`) — fullscreen classroom hero, "Every lesson, understood.", CTA into the demo flow.
2. **Lesson library** (`/upload`) — pick a recorded lesson (poster, classroom, date, roster size). One click starts it.
3. **Processing run** — wheel animation over the real pipeline stages, each with tech pills
   (Butterbase Storage/DB/AI Gateway · Ultralytics YOLO11m · InsightFace · FFmpeg · Gemini 2.5 Flash).
4. **Lesson report** (`/lesson/:id`) — teaching pulse, class scores with timestamped evidence,
   class pulse chart, auto attendance, per-student honeycomb, AI lesson notes.
5. **Studio** (`/studio/:id`) — full lesson video on top; per-student cropped clips with a
   scrubbable behavior timeline (listening / writing / speaking / phone / asleep / chatting /
   looking away), events, score, summary, suggestion.
6. **Trends** — cross-lesson insights per student and classroom.

## Architecture

- **Pipeline** (`pipeline/`, Python, local): YOLO11m person detection + IoU tracker → tight
  face+torso clips (ffmpeg) → InsightFace roster recognition (one-to-one greedy) → per-student
  video analysis via the **Butterbase AI Gateway** (Gemini 2.5 Flash) → publish to Butterbase.
- **Worker** (`worker/`, FastAPI, local): what the UI calls. Serves the video catalog
  (`/videos`), poster frames, and `/process-library` (seeds classroom+roster, uploads,
  runs the pipeline, reports progress). YOLO/ffmpeg/InsightFace can't run in a browser.
- **Webapp** (`webapp/`, Vite + React): reads Butterbase directly; deployed to Butterbase.
  With no worker reachable (the deployed app), the upload flow replays the stored analysis.
- **Butterbase**: DB, storage, AI gateway, frontend hosting, submission.

## Run it

```bash
# 1) worker (CV + AI)
BUTTERBASE_API_KEY=bb_sk_… ./worker/run.sh

# 2) dashboard
cd webapp && npm install && npm run dev     # http://localhost:5173
```

`webapp/.env.local` (gitignored) needs `VITE_BUTTERBASE_API_KEY` and `VITE_WORKER_URL`.

Pipeline alone, from the CLI:
```bash
.venv/bin/python -m pipeline classroom datasets/simulated/classroom1
```

## Data

- `datasets/simulated/classroom1/` (tracked): `classroom.json` (roster + lectures),
  cropped roster photos, lecture video. `datasets/catalog.json` is what the UI offers.
- `datasets/real/` — local only. `work/` — temporary pipeline artifacts, gitignored.
- Seeded classrooms (7-A Math, 6-B Science) provide cross-lesson trend history;
  Social Studies — Period 3 is the real, pipeline-analyzed lesson.

## Demo path

Landing → **See ClassPulse in action** → pick "Ancient Civilizations — Intro" →
processing animation (~35s) → **See the insights** → lesson report → **Student videos** (Studio).

Pitch script and privacy Q&A: `docs/notes/pitch.md`.

# ClassPulse — Design Spec

**Date:** 2026-07-10 (day before hackathon)
**Event:** AI Education Hackathon, Sat 2026-07-11 — Intelligent Classroom Systems track
**Team:** 2 builders — Person A (AI pipeline, CV) + Person B (app/dashboard/backend)
**Decisions log:** `docs/notes/brainstorm-decisions.md` · **Seed context:** `docs/notes/seed-notes.md`

## What ClassPulse Is

**"The heartbeat of the classroom."** A school admin/principal uploads recorded lessons; ClassPulse analyzes video + audio and produces per-lesson reports: class-level scores (engagement, learning, efficiency, fun) with timestamped evidence, per-student engagement/distraction analysis, face-matched attendance, and AI lesson notes — plus cross-lesson trend insights powered by agent memory.

Demo is **pre-processed only**: a guided dashboard walkthrough of already-processed lessons (screen recording of processing kept as authenticity proof). No live camera, no on-stage processing.

## Architecture

Two independent halves; the Butterbase DB schema is the only contract between them.

```
Person A (Python, local laptop — never deployed)
  video.mp4 ─ ffmpeg ─► audio ─► STT ─► transcript
      └─► detect+track students ─► per-student face+torso crops
              ├─► roster matching (attendance)
              └─► per-student clips ─► Gemini video analysis
                        (engagement, distraction, evidence w/ timestamps)
  transcript + per-student results ─► LLM synthesis
                        (class scores, pulse timeline, lesson notes, highlights)
      └─► publish: Butterbase (DB + file storage) + EverOS (memory) ─► insights

Person B (Next.js — local dev, deployed to Butterbase for submission)
  Admin dashboard reading only from Butterbase
```

- All model calls behind one `ModelProvider` interface: `analyze_video(clip, prompt)`, `transcribe(audio)`, `complete(prompt)`. First implementation: **Gemini** for all three (native video + audio + text). Nebius-hosted or local HuggingFace models are drop-in experiments per capability.
- Pipeline artifacts (per-student clips, thumbnails) upload to Butterbase storage so the dashboard can play the cropped clip next to its AI analysis — the demo centerpiece.
- Development is local-first with cloud state: dashboard via `npm run dev` + hot reload against cloud Butterbase; pipeline as local Python CLI. Deploy dashboard only 2–3× (early proof, final submission).

## Data Model (Butterbase)

**`classrooms`** — id, name, teacher_name, subject/grade

**`students`** — id, classroom_id, name, roster_photo_url

**`lessons`** — id, classroom_id, title, date, video_url, duration_sec, status (`uploaded → processing → done | failed`, + `error` text on failure), and pipeline-filled results:
- `class_scores` JSON: `[{dimension, score 0-100, evidence: [{t, note}]}]` — dimensions: engagement, learning, efficiency, fun
- `engagement_timeline` JSON: `[{t, score}]` (class pulse line)
- `notes_md`, `transcript`, `highlights` JSON `[{t, note}]`

**`student_results`** — one row per student per lesson: lesson_id, student_id, present (bool = attendance), match_confidence, engagement_score, engagement_timeline JSON, distraction_events JSON `[{t_start, t_end, kind, note}]` (kinds: phone, asleep, chatting, looking_away, other), clip_url, thumbnail_url, summary

**`insights`** — id, scope (`student`|`classroom`), student_id?, classroom_id, text, source (`everos`), created_at

Rules: every score/evidence/event carries seconds-from-start timestamps. Unmatched tracks become "Unknown student" rows (analyzed, flagged). Seed fixtures (2 classrooms × ~6 students × ~5 lessons) conform to this exact schema, loaded via `npm run seed` — Person B's development enabler and the demo's trend-history backdrop.

Auth: Butterbase auth, one hardcoded admin login.

## Processing Pipeline (Python CLI)

Stages write to `work/<lesson_id>/` so any stage can be rerun alone (`python -m pipeline process <video> [--stage <name>]`):

1. **Extract** — ffmpeg: audio.wav + downsampled whole-scene copy
2. **Track & crop** (Person A's custom CV) — person detection + ID-persistent tracking (baseline: ultralytics YOLO + built-in tracker), smoothed face+torso bbox per track, ffmpeg-cropped clip + thumbnail per student → `tracks.json`. Only the *output* shape is fixed; internals are Person A's canvas.
3. **Roster match** — best thumbnail per track + roster photos → one Gemini call → name + confidence; matched = present
4. **Per-student analysis** — each clip → `analyze_video()` with structured-output prompt → engagement score + timeline, distraction events, evidence, summary. Parallel across students; pydantic-validated; one retry on malformed JSON
5. **Transcribe** — `transcribe(audio.wav)` → timestamped transcript
6. **Synthesize** — transcript + per-student JSON + scene clip → class scores w/ evidence, pulse timeline, notes_md, highlights
7. **Publish** — upload artifacts to Butterbase storage, write all rows, flip status to `done`; write per-student/class observations to EverOS, query it for trends, store returned statements in `insights`

Error handling (hackathon-grade): stage failure → `status: failed` + error on lesson; per-student analysis failure degrades to "analysis unavailable" for that student; all raw model responses saved in `work/` for debugging; manual stage rerun is the recovery mechanism.

## EverOS Integration

Pipeline-only integration point (dashboard never calls EverOS). After publish: write memory entries per student and per classroom; query for cross-lesson trends; cache statements in `insights`. Fallback if EverOS blocks us at the venue: an LLM call over the student's lesson history generates equivalent insight statements into the same table — demo unaffected.

## Admin Dashboard (Next.js)

1. **Overview** — classroom cards (headline engagement + trend arrow + pulse sparkline), school-wide stats, EverOS insights feed. The 30-second first impression.
2. **Classroom view** — lesson history with scores, engagement trend across lessons, roster grid with per-student trends
3. **Lesson report** (submission centerpiece) — four score dials expandable to timestamped evidence; class pulse line with distraction/highlight markers; attendance strip (roster photos, green/gray, confidence); **student cards: cropped clip playable beside AI analysis**; lesson notes + collapsible transcript
4. **Upload** — classroom picker + video upload to storage, creates `uploaded` lesson row, shows status (demo-optional; built last)

Build order: seed script → lesson report → overview → classroom view → upload. Styling: shadcn/ui + chart lib, polished dark theme, pulse-line branding motif.

## Phasing

**Phase 0 — TODAY (pre-hackathon prototype, de-risks the biggest unknown):**
Prototype pipeline stages 1–4 end-to-end: video in → tracked/cropped per-student clips → Gemini per-student analysis JSON out. User provides **3 videos + rosters, different student behaviors in each**. Success = for each video, every visible student yields a clip and a plausible analysis JSON. This is a spike — code quality secondary, learnings (tracker settings, crop strategy, Gemini prompts, timing/cost per clip) feed event day. No Butterbase/EverOS/dashboard today.

**Phase 1 — event morning (before build starts):** Butterbase setup + promo BUTTER0711 both accounts; GitHub repo shared; staged clip filmed + found clip picked + roster photos collected; Gemini key ready; Discord credits (EverOS, Nebius).

**Phase 2 — event day (~4 hrs):**
- 11:20–12:00 together: scaffold, schema in Butterbase, seed script running, first deploy proven
- 1:00–3:00 parallel: A ports Phase-0 pipeline + stages 5–7 begin; B builds lesson report + overview on seeds
- 3:00–4:00: first real lesson lands in DB; B finishes classroom view; EverOS wiring
- 4:00–4:45: process both demo videos, final deploy, **submit via Butterbase MCP**, rehearse walkthrough
- 4:45 hard stop

## Risks & Mitigations

- CV tracking fails on found clip (low-res/occlusion) → staged clip is the primary demo; found clip is cut-without-shame bonus. Phase 0 exposes this today.
- Gemini video slow/quota → short clips, parallel processing, downsampled-frames fallback prompt path
- Butterbase unknowns → first deploy at noon, not 4:30; on-site workshop + support Discord
- Time → seeded data is the safety net: one real lesson is enough for a full demo

## Verification

- **Phase 0:** run prototype on all 3 provided videos; each visible student → clip + valid analysis JSON; eyeball plausibility vs. actual behaviors in the videos; record per-clip latency + cost
- **Event day end-to-end:** process staged clip → all tables populated → dashboard renders it locally → deployed URL identical → 3-minute walkthrough rehearsed on the deployed app before 5:00

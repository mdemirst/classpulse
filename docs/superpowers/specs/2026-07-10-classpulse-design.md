# ClassPulse — Design Spec

**Date:** 2026-07-10 · **Revised:** 2026-07-11 (Butterbase-native amendments)
**Event:** AI Education Hackathon, Sat 2026-07-11 — Intelligent Classroom Systems track
**Team:** 2 builders — Person A (AI pipeline, CV) + Person B (app/dashboard/backend)
**Decisions log:** `docs/notes/brainstorm-decisions.md` · **Seed context:** `docs/notes/seed-notes.md` · **Pitch:** `docs/notes/pitch.md`

## What ClassPulse Is

**"The heartbeat of the classroom."** ClassPulse helps teachers be more effective: upload a recorded lesson, get per-lesson reports — class-level scores (engagement, learning, efficiency, fun) with timestamped evidence, per-student engagement/distraction analysis with suggestions, face-matched attendance, AI lesson notes — plus cross-lesson trend insights powered by agent memory. Human in the loop: AI observes, the teacher decides. Videos are analyzed, never stored long-term.

Demo is **pre-processed only**: a guided dashboard walkthrough of already-processed lessons (screen recording of processing kept as authenticity proof). No live camera, no on-stage processing.

## Butterbase-Native Principle (hackathon requirement)

Butterbase is the backbone wherever possible: database, auth, file storage, **all AI model calls (via the AI gateway)**, serverless synthesis, frontend hosting, and the submission itself. Judges should see every subsystem lighting up in the Butterbase dashboard.

## Architecture

Two independent halves; the Butterbase DB schema is the only contract between them.

```
Person A (Python, local laptop — never deployed)
  video.mp4 ─ ffmpeg ─► per-student crops via detect+track (CV)
      ├─► clips + thumbnails ──► Butterbase Storage (presigned upload)
      ├─► roster matching ──► Butterbase AI gateway (images)
      ├─► per-student analysis ──► Butterbase AI gateway (video_url = presigned clip URL, Gemini vision model)
      ├─► transcription ──► Butterbase AI gateway (video_url = full lesson, timestamped transcript)
      ├─► write rows (students, student_results, transcript) via Butterbase data API
      ├─► EverOS: write per-student/class observations, read trends
      └─► invoke Butterbase function: POST /fn/synthesize-lesson {lesson_id}

Butterbase serverless function: synthesize-lesson (TypeScript)
  reads lesson data via ctx.db ─► gateway call(s) ─► writes class_scores,
  engagement_timeline, notes_md, highlights, insights rows

Person B (Vite React SPA — local dev, deployed via create_frontend_deployment)
  Dashboard reads via @butterbase/sdk (DB, auth, storage URLs)
```

- **All model calls behind one `ModelProvider` interface:** `analyze_video(url_or_path, prompt, schema)`, `transcribe(...)`, `complete(prompt, schema)`. **Primary implementation: `ButterbaseProvider`** — OpenAI-compatible `POST /v1/{app_id}/chat/completions` with `video_url` / `image_url` content parts pointing at presigned Butterbase Storage URLs; model = a Gemini vision model from the Butterbase catalog (env `CLASSPULSE_MODEL`). **Fallback implementation: direct Gemini** (google-genai SDK) behind the same interface; one env var (`CLASSPULSE_PROVIDER`) flips between them if gateway video support disappoints.
- **Artifact flow inverts:** clips/thumbnails upload to Butterbase Storage *before* analysis (the gateway needs the presigned URL), which also means they're already in place for the dashboard.
- Development is local-first with cloud state: dashboard via Vite dev server + hot reload against cloud Butterbase; pipeline as local Python CLI. Deploy frontend only 2–3× (early proof, final submission).
- **The Butterbase app is created FIRST on event day** (before pipeline or dashboard work) — the gateway, storage, and schema all depend on it.

## Data Model (Butterbase)

**`classrooms`** — id, name, teacher_name, subject/grade

**`students`** — id, classroom_id, name, roster_photo_url

**`lessons`** — id, classroom_id, title, date, video_url, duration_sec, status (`uploaded → processing → done | failed`, + `error` text on failure), and pipeline/function-filled results:
- `class_scores` JSON: `[{dimension, score 0-100, evidence: [{t, note}]}]` — dimensions: engagement, learning, efficiency, fun
- `engagement_timeline` JSON: `[{t, score}]` (class pulse line)
- `notes_md`, `transcript`, `highlights` JSON `[{t, note}]`

**`student_results`** — one row per student per lesson: lesson_id, student_id, present (bool = attendance), match_confidence, engagement_score, engagement_timeline JSON, distraction_events JSON `[{t_start, t_end, kind, note}]` (kinds: phone, asleep, chatting, looking_away, other), clip_url, thumbnail_url, summary, **suggestion** (one actionable coaching suggestion for the teacher, e.g. "disengages during long solo exercises — try pairing him up")

**`insights`** — id, scope (`student`|`classroom`), student_id?, classroom_id, text, source (`everos` | `synthesis`), created_at

Rules: every score/evidence/event carries seconds-from-start timestamps. Unmatched tracks become "Unknown student" rows (analyzed, flagged). Seed fixtures (2 classrooms × ~6 students × ~5 lessons) conform to this exact schema, loaded via the `seed_database` MCP tool or a seed script — Person B's development enabler and the demo's trend-history backdrop.

Auth: Butterbase auth, one hardcoded admin login. Lesson source videos are deleted from storage after processing (privacy: "we don't store the videos") — only clips, thumbnails, and derived data remain, and clips can be purged post-demo.

## Processing Pipeline (Python CLI)

Stages write to `work/<lesson_id>/` so any stage can be rerun alone (`python -m pipeline process <video> [--stage <name>]`):

1. **Extract** — ffmpeg: downsampled whole-scene copy (audio stays in the video; transcription reads it from there)
2. **Track & crop** (Person A's custom CV) — person detection + ID-persistent tracking (baseline: ultralytics YOLO + built-in tracker), smoothed face+torso bbox per track, ffmpeg-cropped clip + thumbnail per student → `tracks.json`. Only the *output* shape is fixed; internals are Person A's canvas.
3. **Upload artifacts** — clips + thumbnails + lesson video → Butterbase Storage (presigned uploads); keep object ids/URLs in `tracks.json`
4. **Roster match** — roster photos + track thumbnails → one gateway call (image parts) → name + confidence; matched = present
5. **Per-student analysis** — each clip's presigned URL → `ModelProvider.analyze_video()` with structured-output prompt → engagement score + timeline, distraction events, evidence, summary, suggestion. Parallel across students; pydantic-validated; one retry on malformed JSON
6. **Transcribe** — full lesson video presigned URL → gateway → timestamped transcript
7. **Publish** — write rows via Butterbase data API; push per-student/class observations to EverOS and pull trends into `insights`; **invoke `POST /v1/{app_id}/fn/synthesize-lesson {lesson_id}`**; flip status to `done`; delete the source lesson video from storage

Error handling (hackathon-grade): stage failure → `status: failed` + error on lesson; per-student analysis failure degrades to "analysis unavailable" for that student; all raw model responses saved in `work/` for debugging; manual stage rerun is the recovery mechanism.

## Serverless Function: `synthesize-lesson` (TypeScript, Butterbase)

HTTP-triggered; invoked by the pipeline with `{lesson_id}`. Runs as service role:
1. Reads the lesson's transcript + all `student_results` via `ctx.db`
2. One gateway call (`ctx.env.BUTTERBASE_API_KEY`) → class scores with evidence, engagement timeline, notes_md, highlights
3. Generates classroom/student insight statements from lesson history (this doubles as the EverOS fallback path, `source: 'synthesis'`)
4. Writes results to `lessons` + `insights`

Timeout budget: text-only work, fits well under the 300s max. Failure surfaces as lesson `status: failed` with the function's error message.

## EverOS Integration

Pipeline-side integration (Python): after per-student results land, write memory entries per student and per classroom; query for cross-lesson trends; cache statements in `insights` with `source: 'everos'`. Fallback if EverOS blocks us at the venue: the synthesize-lesson function's insight generation covers the same dashboard feature — demo unaffected.

## Dashboard (Vite React SPA)

Built with Vite + React + shadcn/ui + a chart lib, polished dark theme, pulse-line branding. Reads exclusively through `@butterbase/sdk` (data API + auth + storage URLs). Deployed with `create_frontend_deployment` (`framework: react-vite`; zip built with the `archiver` script per Butterbase docs).

1. **Overview** — classroom cards (headline engagement + trend arrow + pulse sparkline), school-wide stats, insights feed. The 30-second first impression.
2. **Classroom view** — lesson history with scores, engagement trend across lessons, roster grid with per-student trends
3. **Lesson report** (submission centerpiece) — four score dials expandable to timestamped evidence; class pulse line with distraction/highlight markers; attendance strip (roster photos, green/gray, confidence); **student cards: cropped clip playable beside AI analysis + suggestion**; lesson notes + collapsible transcript
4. **Upload** — classroom picker + video upload to storage, creates `uploaded` lesson row, shows status (demo-optional; built last)

Build order: schema+seed → lesson report → overview → classroom view → upload.

**Stretch — "Ask your classroom":** transcripts ingested into a Butterbase RAG collection (`manage_rag_content`) at publish time; a search box on the overview calls `rag_query` with `synthesize: true` ("When did we cover fractions?" → answer with sources).

## Phasing

**Phase 0 — pre-event prototype (partially superseded by event start):**
Prototype pipeline stages: video in → tracked/cropped per-student clips → per-student analysis JSON out, on 3 provided videos + rosters. Plan: `docs/superpowers/plans/2026-07-10-phase0-pipeline-prototype.md` — still valid except the model client task, which becomes `ButterbaseProvider` (gateway) with direct-Gemini fallback.

**Phase 1 — event morning (before build):** Butterbase account + promo BUTTER0711 both accounts; MCP authenticated; GitHub repo shared; demo videos + roster photos ready; Discord credits (EverOS, Nebius).

**Phase 2 — event day (~4 hrs):**
- 11:20–12:00 together: **create Butterbase app first** (init_app → schema → seed → API key), scaffold Vite SPA, first frontend deploy proven
- 1:00–3:00 parallel: A builds/ports pipeline against gateway; B builds lesson report + overview on seeds
- 3:00–4:00: deploy `synthesize-lesson` function; first real lesson lands end-to-end; B finishes classroom view; EverOS wiring
- 4:00–4:45: process demo videos for real, final deploy, **submit via `prep_and_submit_hackathon_entry` (Butterbase MCP)**, rehearse walkthrough
- 4:45 hard stop

## Risks & Mitigations

- Gateway `video_url` support for Gemini models underdelivers (latency/quality/size limits) → direct-Gemini fallback provider behind the same interface, flipped by env var
- CV tracking fails on a demo clip → staged/AI-generated clips are primary; found clip cut without shame
- Function timeout or platform surprise → synthesis logic is provider-agnostic; can run from the Python pipeline as fallback
- Butterbase unknowns → app + deploy proven by noon, not 4:30; on-site workshop + support Discord
- Time → seeded data is the safety net: one real lesson is enough for a full demo

## Verification

- **Pipeline prototype:** run on 3 provided videos; each visible student → clip + valid analysis JSON (via gateway); eyeball plausibility vs. actual behaviors; record per-clip latency + cost (visible in Butterbase AI usage dashboard)
- **Event day end-to-end:** process staged clip → all tables populated (including function-written synthesis) → dashboard renders locally → deployed URL identical → submission completed via MCP → 3-minute walkthrough rehearsed on the deployed app before 5:00

# ClassPulse — Bringup (Event Day)

**Goal:** thinnest possible end-to-end system NOW; iterate all afternoon. Deep features come only after both tracks are moving.

## ✅ Already done (as of ~11:30 AM)

The Butterbase backend is LIVE and SEEDED — Person B can start building the dashboard against real data immediately:

- **App:** `app_k03t6gua7dg1` · API base `https://api.butterbase.ai/v1/app_k03t6gua7dg1` · frontend URL `https://classpulse.butterbase.dev`
- **Schema applied:** `classrooms`, `students`, `lessons`, `student_results`, `insights` (see spec §Data Model)
- **Storage:** 200 MB/file cap, public read enabled
- **Seeded fake data:** 2 classrooms (7-A Math / 6-B Science), 12 students, 6 fully-analyzed lessons, 36 per-student results, 6 insights — with built-in demo stories (Ali declining 84→66→41 with phone events; Omar improving 60→76→85; lab day scoring fun=91)
- **Seed script:** `seed/seed_demo_data.py` (stdlib-only; `BUTTERBASE_API_KEY=... python3 seed/seed_demo_data.py`)
- **API key:** NOT in the repo — get it from Mahmut, export as `BUTTERBASE_API_KEY`

### ⚠️ Contract gotcha
Butterbase jsonb columns reject top-level JSON arrays on insert. **All JSON columns are wrapped: `{"items": [...]}`** — `class_scores.items`, `engagement_timeline.items`, `highlights.items`, `distraction_events.items`. Read and write them with the wrapper.

## Demo shape (decided)

Dashboard walkthrough of processed lessons (fake seeds + real ones as they land). Upload-and-analyze flow is an iteration goal, not bringup. Live analysis is out.

## Track 1 — CV / AI analysis (Person A)

Bringup target: **one real video → per-student clips → per-student analysis JSON printed.** Nothing else.

1. `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` (requirements in plan Task 1)
2. Spike order (copy reference code from `docs/superpowers/plans/2026-07-10-phase0-pipeline-prototype.md` — it has complete implementations; skip the TDD ceremony during bringup, keep the file layout):
   - `schemas.py` (Task 2) → `boxes.py` (Task 3) → `tracking.py` (Task 4) → `cropper.py` (Task 5) — this gets you video → clips, no network needed
   - `storage.py` + `provider.py` (Task 6) — Butterbase gateway analysis; smoke-test `analyze_video` on ONE clip before wiring the rest. If gateway video fails, flip `CLASSPULSE_PROVIDER=gemini` (Task 6b) and keep moving
   - `roster.py` + `analyze.py` + `cli.py` (Tasks 7–9)
3. Env: `BUTTERBASE_API_KEY`, `BUTTERBASE_APP_ID=app_k03t6gua7dg1`, `CLASSPULSE_MODEL` (pick a Gemini vision model from `GET https://api.butterbase.ai/v1/public/models`)
4. Then iterate: tracking quality on real videos → publish stage (write rows shaped exactly like the seeds, `{"items": ...}` wrapper) → EverOS

## Track 2 — Backend / Frontend (Person B)

Bringup target: **deployed dashboard URL showing the seeded data.** Two screens only.

1. Scaffold: `npm create vite@latest webapp -- --template react-ts && cd webapp && npm i @butterbase/sdk recharts`
2. Read data via SDK (`appId: app_k03t6gua7dg1`, `apiUrl: https://api.butterbase.ai`) or plain fetch with the data API (`GET {api}/lessons?classroom_id=eq.<id>&order=lesson_date.desc`)
3. Screen 1 — **Teacher home**: classroom cards (avg engagement + trend arrow + sparkline from lesson `engagement_timeline.items`), insights feed from `insights`
4. Screen 2 — **Lesson report**: 4 score tiles from `class_scores.items` (evidence on expand), pulse line, attendance strip from `student_results.present`, student cards (score, summary, suggestion, distraction events; clip player once real clips exist), notes_md
5. **Deploy immediately** once screen 1 renders (prove the path): `npm run build`, zip `dist/` with the archiver script from Butterbase docs (never Finder zip), `create_frontend_deployment` + upload + `start_deployment` via MCP
6. Then iterate: classroom view, upload page, polish, auth

## Iteration backlog (afternoon, in priority order)

1. Real lesson from pipeline lands in DB and renders in dashboard (replaces one fake lesson)
2. `synthesize-lesson` Butterbase function (class scores from per-student results + transcript)
3. EverOS memory → insights (fallback already works via synthesis)
4. Upload page + processing status
5. RAG "Ask your classroom" (stretch)
6. **4:30 PM: submit via `prep_and_submit_hackathon_entry` — do not be late**

## Demo data stories to use on stage

- **Ali (7-A):** declining engagement + phone events → the "reach a kid before he's failing" pitch beat
- **Omar (6-B):** improving trend → positive framing, not just surveillance
- **6-B lab lesson:** fun=91 → "we score fun" beat
- **7-A insight:** "solo blocks correlate with drops" → teaching-format feedback beat

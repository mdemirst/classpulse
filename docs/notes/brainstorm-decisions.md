# ClassPulse — Brainstorming Decisions

Decisions locked during the design brainstorm (July 10, pre-hackathon). Input: `seed-notes.md`.

## Product decisions
- **Demo input:** pre-recorded classroom videos only (no live camera)
- **Workflow:** upload video → processing → report (no simulated real-time playback)
- **Must-have features (all four):** class-level scores; per-student engagement/distraction; attendance; lesson notes from audio
- **Student identity:** named roster with face matching — user provides roster photos for all demo videos
- **Primary persona:** school admin/principal — multi-classroom overview dashboard
- **Dashboard data:** multiple real processed lessons for the demo, PLUS seeded simulated data (dev enabler, see team split below)
- **Scoring basis:** scores + timestamped evidence for every score (no formal named rubric)
- **Stage flow:** pre-processed only — guided dashboard walkthrough; keep a screen recording of processing as authenticity proof

## Technical decisions
- **Stack:** web app on Butterbase — Next.js/React frontend; Butterbase for DB, auth, file storage, serverless, deployment
- **Model provider:** deliberately pluggable — probably Gemini; Nebius-hosted and local HuggingFace models as experiments once the structure is scaffolded
- **EverOS:** must-have — per-student/per-class memory written on each processed lesson; dashboard trend insights read from it
- **Demo videos:** mix — one staged clip (filmed with friends, scripted engagement moments) + one found real classroom clip; rosters provided for both

## Team & dev workflow
- **Two builders:** person A = AI pipeline; person B = app/dashboard/backend. Connected by a data-schema contract + seed fixtures so B never waits on A.
- **Local-first development, cloud state:**
  - Dashboard: local `npm run dev` with hot reload, talking directly to cloud Butterbase DB/storage via SDK — no redeploy per change
  - Pipeline: local Node CLI worker (`node pipeline/process.js <video>`) — ffmpeg extraction + cloud model API calls, writes results to Butterbase; never deployed (demo is pre-processed)
  - Deploy to Butterbase only 2–3 times: once early to prove the path, once for final submission URL
  - `npm run seed` script resets DB to known-good fixtures (protects person B from pipeline experiments)
  - GitHub remote needed for two-person collaboration

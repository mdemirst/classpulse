# ClassPulse — Project Status

**Last updated:** 2026-07-10, evening (night before hackathon)
**Hackathon:** Sat 2026-07-11, 9:00 AM check-in · build 11:20–5:00 PM · demo 5:00 PM

## Where We Are

Planning is **complete**. No code written yet. Next action: execute the Phase 0 implementation plan.

Done so far (all committed):
1. ✅ Hackathon notes captured — `docs/notes/raw-draft-notes.md`, `docs/notes/seed-notes.md`
2. ✅ Project named: **ClassPulse** — "the heartbeat of the classroom"
3. ✅ Brainstorm complete, all decisions locked — `docs/notes/brainstorm-decisions.md`
4. ✅ Design spec written and approved — `docs/superpowers/specs/2026-07-10-classpulse-design.md`
5. ✅ Phase 0 implementation plan written (10 TDD tasks) — `docs/superpowers/plans/2026-07-10-phase0-pipeline-prototype.md`

## What ClassPulse Is (one breath)

Admin/principal uploads recorded lessons → Python pipeline (YOLO tracking → per-student cropped clips → Gemini analysis) + Next.js dashboard on Butterbase → per-student engagement/distraction scores, face-matched attendance, class scores with timestamped evidence, AI lesson notes, EverOS-powered cross-lesson trends. Demo is pre-processed walkthrough only.

## Next Action (resume here tomorrow)

**Execute the Phase 0 plan** — `docs/superpowers/plans/2026-07-10-phase0-pipeline-prototype.md`:
prototype `video → tracked per-student clips → Gemini analysis JSON`, the riskiest unknown, BEFORE the event if possible.

- Execution choice was pending: subagent-driven (recommended) vs inline. Tell Claude which.
- Tasks 1–9 are self-contained TDD tasks; Task 10 verifies on real videos.

## Blockers / Needed From Us

| Item | Needed for | Status |
|---|---|---|
| `GEMINI_API_KEY` env var | Task 6 smoke test onward | ⬜ not set up |
| 3 sample videos + rosters in `samples/<lesson>/video.mp4` + `roster/<Name>.jpg` | Task 10 verification | ⬜ user will provide (3 videos, different behaviors each) |
| Butterbase account + promo `BUTTER0711` (Launch plan, dashboard.butterbase.ai/billing) | event day | ⬜ do tonight/morning — both teammates |
| GitHub remote for this repo | 2-person collab on event day | ⬜ not created |
| Staged demo clip (3–5 min, scripted moments) + found classroom clip + roster photos | event-day demo | ⬜ Phase 1 prep |
| Discord: event credits (EverOS, Nebius) | event day | ⬜ |

## Team Split (event day)

- **Person A:** Python pipeline (this Phase 0 work continues) — tracking, cropping, Gemini, stages 5–7 (STT, synthesis, publish)
- **Person B:** Next.js dashboard on Butterbase — builds against seed fixtures; DB schema is the contract (see spec §Data Model)

## Key Files

- Spec (source of truth): `docs/superpowers/specs/2026-07-10-classpulse-design.md`
- Phase 0 plan (execute next): `docs/superpowers/plans/2026-07-10-phase0-pipeline-prototype.md`
- Decisions log: `docs/notes/brainstorm-decisions.md`
- Event logistics/prizes: `docs/notes/seed-notes.md`

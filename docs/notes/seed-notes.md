# ClassPulse — Seed Notes for Brainstorming

> Organized from `raw-draft-notes.md`. This is the seed input for the superpowers:brainstorming session — same substance, restructured for clarity.

## Project
**ClassPulse** — "the heartbeat of the classroom."
Tagline candidates: "Feel your classroom's pulse" / "Every lesson has a pulse."

Naming principle we followed: sound like a teaching aid, not surveillance (trust is a judging criterion) — avoided Watch/Track/Monitor/Lens names.

## What We're Building
A camera + voice classroom intelligence and analysis system, in the **🏫 Intelligent Classroom Systems** track (multi-agent environments that orchestrate the classroom experience — lesson flow, engagement monitoring, real-time adaptation, interacting with students and educators).

### Inputs
- Camera feed of the classroom/students
- Voice/audio (teacher + classroom sound)

### Student-level analysis
- Engagement score per student
- Distraction detection per student
- Automatic attendance via camera

### Lesson/class-level analysis
- Overall class scores: engagement, learning, efficiency, fun, etc.
- Automatic lesson notes from voice (transcription + summarization)

### Outputs
- Teacher dashboards/reports — per-student and per-lesson scores
- Attendance records
- Lesson notes/summaries

## Required Partner Stack
Partner API integration is mandatory. We don't need to integrate everything immediately, but every design decision should assume this stack:

| Partner | Role in ClassPulse |
|---|---|
| **Butterbase** (mandatory — submission via Butterbase MCP) | Entire backend: database (students, scores, attendance, lessons), auth, file storage (video/audio clips), serverless functions, API endpoints, deployment |
| **EverMind / EverOS** | "Classroom memory": per-student engagement history across lessons, trends over time (e.g. "Ali has been increasingly distracted this week") — strong judging story |
| **Nebius AI Cloud / Token Factory** | Model inference: vision frame analysis, transcription, scoring ($50 + $50 credits) |
| **Tavily** ($25 credit) | Optional: enrich lesson notes with related resources/links |

Design implications:
- Backend/storage defaults to Butterbase, no custom servers
- Per-student history/trends flow through EverOS memory (differentiator + partner story)
- Model calls run on Nebius-hosted models where practical

## Constraints
- **~4 hours real build time** (build 11:20 AM–5:00 PM minus lunch; demo at 5:00 PM) — scope must be demo-tight
- Team: 1–2 builders
- Submission must go through Butterbase MCP
- Before event day: Butterbase setup + promo code **BUTTER0711** on Launch plan (https://dashboard.butterbase.ai/billing)

## Judging Angles to Hit
The event's stated philosophy: winning is **not about model capability — it's about pedagogy, deployment, and trust.**
- Improve learning outcomes (show pedagogy, not just chat)
- Integrate into real classrooms
- Earn educator trust
- Scale across learners
- Memory/personalization that compounds over time (EverOS fit)

## Prizes in Reach
- TAL Education Group: product/partnerships intros, potential pilot pathways
- Beta Fund: $200K pre-seed possible (Fellowship interview), up to $2M through seed
- Butterbase: $200 credits for Best Use of Butterbase
- Nebius Builder Program perks

## Event Logistics
- Date: Saturday, July 11, 2026 — check-in 9:00 AM
- 10:00–10:30 workshops (Evermind, Butterbase); 10:45–11:20 education panel
- Demo showcase 5:00 PM; awards 6:30 PM
- Discord (credits, support): https://discord.gg/cswGFwFumn — #Butterbase-support channel

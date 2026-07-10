# Raw Draft Notes — ClassPulse (AI Education Hackathon, Sat July 11, 2026)

> Raw notes captured while discussing the hackathon and our idea. Saved nearly verbatim as drafted — see `seed-notes.md` for the organized version.

## Event Overview
- Theme: "The future of education will be built with AI" — AI-powered learning experiences
- Cohosts: TAL Education Group (major edtech, 10M+ students), EverMind, Butterbase, ASES (Stanford), Beta University, Nebius
- Key judging philosophy: **not about model capability — about pedagogy, deployment, and trust.** Winners improve learning outcomes, integrate into real classrooms, earn educator trust, scale.
- Teams: 1–2 builders
- **Mandatory Cloud/AI Partner Integration**
- Discord for credits/team formation: https://discord.gg/cswGFwFumn

## Schedule (event day)
- 9:00 AM Check-in & breakfast
- 10:00–10:30 Opening remarks + workshops (Evermind, Butterbase)
- 10:45–11:20 Panel: How AI Reinvented Education (Stanford Accelerator for Learning, Epic for Kids, ClassDojo, HMH Labs)
- 11:20 Build → 11:30 Lunch → 1:00 PM Build
- **5:00 PM Demo Showcase** (≈4 hrs real build time — keep scope tight)
- 6:30 PM Awards & closing

## Focus Tracks
1. 🧠 **Autonomous Learning Agents** — persistent AI mentors that plan, adapt, track progress, design curricula, evolve with the student
2. 🏫 **Intelligent Classroom Systems** — multi-agent orchestration of classroom experience (lesson flow, engagement, real-time adaptation)
3. 🧪 **Adaptive Evaluation Engines** — dynamic continuous assessment: conversational, scenario-based, personalized evals beyond static tests
4. 🌍 **Lifelong Learning Agents** — follow users school → career, skill acquisition, transitions
5. 🚀 **Open Frontier** — agent-native learning paradigms, multi-agent simulations, immersive worlds

## Prizes / Opportunities
- TAL Education Group: intros to product/partnerships team, potential pilot pathways
- **Beta Fund: $200K pre-seed possible (interview for Fellowship), up to $2M through seed**
- Butterbase: $20 credits per attendee + $200 credits for Best Use of Butterbase
- Nebius Builder Program: $50 AI Cloud + $50 Token Factory credits, $25 Tavily credit, certification, office hours

## Submission & Tooling (IMPORTANT)
- **All projects MUST be submitted through Butterbase MCP for judging**
- Butterbase = zero-config backend for AI-built apps (database, auth, file storage, serverless functions, API endpoints, deployment)
- Promo code: **BUTTER0711** (all caps) — apply on Launch plan at https://dashboard.butterbase.ai/billing
- Setup before event day (setup, build+deploy, submission instructions available)
- Support: #Butterbase-support on Discord

## Partner Tech Worth Using
- **EverMind / EverOS**: open-source memory layer for AI agents — agents remember the learner, improve with use. Natural fit for education (learning compounds over time). Team on-site with credits, quickstart, engineers.
- **Butterbase**: backend + required submission channel
- **Nebius**: AI cloud / token factory credits, Tavily search credit

## Judging-Winning Angles (from description)
- Improve learning outcomes (show pedagogy, not just chat)
- Integrate into real classrooms
- Earn educator trust
- Scale across learners
- Memory/personalization that compounds (EverOS fit)

## Our Idea
- **Chosen track: 🏫 Intelligent Classroom Systems** — multi-agent environments that orchestrate the classroom experience: coordinating lesson flow, monitoring engagement, adapting in real time, interacting with both students and educators as an active participant

### Concept: Camera + Voice Classroom Intelligence & Analysis System
An AI system that watches and listens to the classroom, analyzes students and the lesson, and produces scores/insights:

**Inputs:**
- Camera feed (video of classroom/students)
- Voice/audio (teacher + classroom sound)

**Student-level analysis:**
- Engagement scoring per student
- Distraction detection per student
- Automatic attendance (via camera)

**Lesson/class-level analysis:**
- Overall class scores: engagement, learning, efficiency, fun, etc.
- Automatic lesson notes from voice (transcription + summarization)

**Outputs (implied):**
- Dashboards/reports for the teacher — per-student and per-lesson scores
- Attendance records
- Lesson notes/summaries

## Partner API Integrations (required — keep in mind for all decisions)
User note: we must use the partner APIs (user has limited background with them). No need to integrate immediately, but factor them into design decisions from the start.

- **Butterbase** (MANDATORY — submission goes through Butterbase MCP): use as our backend — database (students, scores, attendance, lesson records), auth, file storage (video/audio clips), serverless functions, API endpoints, deployment. Design the data model to live here.
- **EverMind / EverOS**: agent memory layer — fits as the "classroom memory": per-student engagement history across lessons, trends over time ("Ali has been increasingly distracted this week"). Strong judging story (learning compounds over time). Engineers + credits on-site.
- **Nebius AI Cloud / Token Factory**: model inference credits — candidate for running vision/audio models (frame analysis, transcription). $50 + $50 credits.
- **Tavily** ($25 credit via Nebius program): web search API — possible use: enrich lesson notes with related resources/links.

Decision-shaping implications:
- Backend/storage choices should default to Butterbase, not custom servers
- Per-student history/trends should go through EverOS memory (differentiator + partner story)
- Model calls (vision, speech-to-text, scoring) can run on Nebius-hosted models where practical
- Get Butterbase setup + promo code BUTTER0711 done BEFORE event day

## Project Name Candidates
Naming principle: sound like a teaching aid, not surveillance (trust is a judging criterion). Avoid Watch/Track/Monitor/Lens.

1. **ClassPulse** — the heartbeat/pulse of the classroom; fits real-time engagement scoring; safe, professional
2. **Attend** (or Attendly) — double meaning: attention + attendance, our two core features in one word
3. **ClassMirror** — "a mirror for your classroom": reflection tool for teachers, best anti-surveillance framing
4. **Presence** — present in class (attendance) + being present (engagement); calm, premium feel
5. **VibeCheck** — playful hackathon energy; scores the class "vibe" (engagement/fun); memorable demo name, less enterprise
6. **Tempo** — lesson flow/rhythm; fits lesson-level analysis; abstract

Selected: **ClassPulse** ✅ — "the heartbeat of the classroom." Real-time pulse of engagement, attention, and lesson quality. Tagline candidates: "Feel your classroom's pulse" / "Every lesson has a pulse."

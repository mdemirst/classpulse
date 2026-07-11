"""Give the seeded lessons the same behavior-state timelines the pipeline produces,
so every lesson renders identically in the dashboard.

    BUTTERBASE_API_KEY=… PYTHONPATH=. .venv/bin/python seed/backfill_states.py
"""
from pipeline import db

ON_TASK_CYCLE = ["listening", "writing", "listening", "speaking"]


def states_for(duration: float, score: int, events: list[dict]) -> list[dict]:
    """Contiguous segments: on-task by default, overridden by the distraction events."""
    segments: list[dict] = []
    cursor = 0.0
    step = max(120.0, duration / 8)

    for i, e in enumerate(sorted(events, key=lambda x: x["t_start"])):
        start, end = float(e["t_start"]), float(e["t_end"])
        while cursor < start - 1:
            nxt = min(start, cursor + step)
            segments.append({
                "t_start": round(cursor, 1), "t_end": round(nxt, 1),
                "state": ON_TASK_CYCLE[len(segments) % len(ON_TASK_CYCLE)]
                if score >= 55 else "looking_away",
                "note": "",
            })
            cursor = nxt
        segments.append({"t_start": round(start, 1), "t_end": round(end, 1),
                         "state": e["kind"], "note": e.get("note", "")})
        cursor = end

    while cursor < duration - 1:
        nxt = min(duration, cursor + step)
        segments.append({
            "t_start": round(cursor, 1), "t_end": round(nxt, 1),
            "state": ON_TASK_CYCLE[len(segments) % len(ON_TASK_CYCLE)]
            if score >= 55 else "looking_away",
            "note": "",
        })
        cursor = nxt
    return segments


def main() -> None:
    lessons = {l["id"]: l for l in db.select("lessons", "status=eq.done")}
    updated = 0
    for r in db.select("student_results", "limit=200"):
        if r.get("states") or not r["present"] or r.get("engagement_score") is None:
            continue
        lesson = lessons.get(r["lesson_id"])
        if not lesson:
            continue
        duration = float(lesson.get("duration_sec") or 1800)
        events = (r.get("distraction_events") or {}).get("items", [])
        segments = states_for(duration, r["engagement_score"], events)
        db.update("student_results", r["id"], {
            "states": db.items(segments),
            "clip_duration_sec": duration,
            "clip_start_sec": 0,
        })
        updated += 1
    print(f"backfilled states on {updated} student_results")


if __name__ == "__main__":
    main()

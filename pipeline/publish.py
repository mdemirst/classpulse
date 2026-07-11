"""Publish pipeline results to Butterbase: clips to storage, rows to the DB."""
from pathlib import Path

from pipeline import db, storage
from pipeline.schemas import StudentAnalysis, TracksFile

DIMENSIONS = ["engagement", "learning", "efficiency", "fun"]


def _clip_timeline_to_lesson(analysis: StudentAnalysis, offset: float) -> list[dict]:
    return [{"t": round(p.t + offset, 1), "score": p.score}
            for p in analysis.engagement_timeline]


def class_timeline(analyses: list[tuple[float, StudentAnalysis]], duration: float,
                   step: float = 5.0) -> list[dict]:
    """Average the students' engagement across the lesson, sampled every `step`."""
    points: list[dict] = []
    t = 0.0
    while t <= duration:
        scores = []
        for offset, a in analyses:
            local = t - offset
            tl = a.engagement_timeline
            if not tl or local < 0:
                continue
            nearest = min(tl, key=lambda p: abs(p.t - local))
            scores.append(nearest.score)
        if scores:
            points.append({"t": round(t, 1), "score": round(sum(scores) / len(scores))})
        t += step
    return points


ON_TASK = {"listening", "writing", "speaking"}


def on_task_ratio(analyses: list[StudentAnalysis]) -> float:
    """Share of observed student-time spent on task (from the state segments)."""
    on = total = 0.0
    for a in analyses:
        for s in a.states:
            span = max(0.0, s.t_end - s.t_start)
            total += span
            if s.state in ON_TASK:
                on += span
    if not total:  # no state segments -> fall back to engagement
        return sum(a.engagement_score for a in analyses) / (100 * len(analyses))
    return on / total


def class_scores(analyses: list[StudentAnalysis]) -> list[dict]:
    """Derive lesson-level scores from the per-student analyses (evidence-backed)."""
    engaged = round(sum(a.engagement_score for a in analyses) / len(analyses))
    focus = on_task_ratio(analyses)

    def evidence_from(pred, limit=3) -> list[dict]:
        out = []
        for a in analyses:
            for e in a.evidence:
                if pred(a, e) and len(out) < limit:
                    out.append({"t": e.t, "note": e.note})
        return out

    return [
        {"dimension": "engagement", "score": engaged,
         "evidence": evidence_from(lambda a, e: a.engagement_score >= engaged)},
        {"dimension": "learning", "score": round(engaged * 0.6 + focus * 40),
         "evidence": evidence_from(lambda a, e: not a.distraction_events)},
        {"dimension": "efficiency", "score": round(focus * 100),
         "evidence": evidence_from(lambda a, e: bool(a.distraction_events))},
        {"dimension": "fun", "score": round(engaged * 0.8),
         "evidence": evidence_from(lambda a, e: a.engagement_score > 70)},
    ]


def notes_markdown(analyses: dict[str, StudentAnalysis]) -> str:
    lines = ["## What ClassPulse saw", ""]
    for name, a in sorted(analyses.items(), key=lambda kv: kv[1].engagement_score):
        kinds = ", ".join(sorted({e.kind for e in a.distraction_events})) or "on task"
        lines.append(f"- **{name}** — engagement {a.engagement_score} ({kinds})")
    lines += ["", "### Suggestions", ""]
    for name, a in analyses.items():
        if a.suggestion:
            lines.append(f"- **{name}:** {a.suggestion}")
    return "\n".join(lines)


def publish_lesson(
    lesson_id: str,
    tracks: TracksFile,
    analyses: dict[int, StudentAnalysis | None],
    students_by_name: dict[str, str],
    duration_sec: float,
) -> None:
    """Upload clips/thumbs, write student_results, synthesize + write lesson fields."""
    # clear any previous results for this lesson (reprocess is idempotent)
    for old in db.select("student_results", f"lesson_id=eq.{lesson_id}"):
        db.delete("student_results", old["id"])

    named: dict[str, StudentAnalysis] = {}
    offsets: list[tuple[float, StudentAnalysis]] = []

    for track in tracks.tracks:
        analysis = analyses.get(track.track_id)
        clip_id = storage.upload_file(Path(track.clip_path), public=True) if track.clip_path else None
        thumb_id = (storage.upload_file(Path(track.thumbnail_path), public=True)
                    if track.thumbnail_path else None)
        row = {
            "lesson_id": lesson_id,
            "student_id": students_by_name.get(track.name) if track.name else None,
            "track_id": track.track_id,
            "present": True,
            "match_confidence": track.name_similarity or 0,
            "clip_object_id": clip_id,
            "thumbnail_object_id": thumb_id,
            "clip_start_sec": round(track.t_start, 2),
            "clip_duration_sec": round(track.t_end - track.t_start, 2),
        }
        if analysis:
            row.update({
                "engagement_score": analysis.engagement_score,
                "engagement_timeline": db.items([p.model_dump() for p in analysis.engagement_timeline]),
                "states": db.items([s.model_dump() for s in analysis.states]),
                "distraction_events": db.items([e.model_dump() for e in analysis.distraction_events]),
                "summary": analysis.summary,
                "suggestion": analysis.suggestion,
            })
            if track.name:
                named[track.name] = analysis
            offsets.append((track.t_start, analysis))
        db.insert("student_results", row)

    # absent students: on the roster but not detected in this lesson
    detected = {t.name for t in tracks.tracks if t.name}
    for name, student_id in students_by_name.items():
        if name not in detected:
            db.insert("student_results", {"lesson_id": lesson_id, "student_id": student_id,
                                          "present": False, "match_confidence": 0})

    valid = [a for a in analyses.values() if a]
    patch = {"status": "done", "duration_sec": round(duration_sec)}
    if valid:
        patch.update({
            "class_scores": db.items(class_scores(valid)),
            "engagement_timeline": db.items(class_timeline(offsets, duration_sec)),
            "notes_md": notes_markdown(named),
            "highlights": db.items([
                {"t": round(e.t_start + off, 1), "note": f"{name}: {e.note}"}
                for (off, a), name in zip(offsets, named)
                for e in a.distraction_events[:1]
            ][:4]),
        })
    db.update("lessons", lesson_id, patch)

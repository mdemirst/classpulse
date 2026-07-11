"""Per-student engagement analysis: one video-LLM call per student clip."""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pipeline.schemas import StudentAnalysis, Track

ANALYSIS_PROMPT = """This video is ONE student, cropped from a classroom lesson recording.
If parts of neighboring students are visible at the edges, IGNORE them — analyze only
the student centered / most prominent in the frame.

Analyze this student's engagement over the whole clip. Timestamps are seconds from
the START OF THIS CLIP. Be specific and honest — if the student is attentive, say so.

Return:
- engagement_score: 0-100 overall for the clip
- engagement_timeline: one score roughly every 5 seconds
- states: CONTIGUOUS, NON-OVERLAPPING segments covering the WHOLE clip from t=0 to the
  end, each labeled with what the student is doing:
  listening | writing | speaking | looking_away | chatting | phone | asleep | other.
  Merge adjacent identical states; do not leave gaps.
- distraction_events: only clearly visible ones, kind is one of
  phone | asleep | chatting | looking_away | other, with t_start/t_end and a short note
- evidence: 2-5 timestamped observations that justify your scores
- summary: one honest paragraph about this student's engagement and behavior
- suggestion: ONE actionable coaching suggestion for the teacher about this student
  (e.g. "disengages during long solo exercises - try pairing him up"); if the student
  is doing great, suggest how to keep it that way"""


def analyze_students(
    provider, tracks: list[Track], out_dir: Path, max_workers: int = 4,
) -> dict[int, StudentAnalysis | None]:
    """Analyze every track that has a clip; per-track failure -> None, never raises."""
    out_dir.mkdir(parents=True, exist_ok=True)
    todo = [t for t in tracks if t.clip_path]

    def one(track: Track):
        label = track.name or f"track {track.track_id}"
        cached = out_dir / f"track_{track.track_id}.json"
        if cached.exists():
            analysis = StudentAnalysis.model_validate_json(cached.read_text())
            print(f"[analyze] {label}: cached (score={analysis.engagement_score})")
            return track.track_id, analysis
        try:
            analysis = provider.analyze_video(
                Path(track.clip_path), ANALYSIS_PROMPT, StudentAnalysis)
            (out_dir / f"track_{track.track_id}.json").write_text(
                analysis.model_dump_json(indent=2))
            print(f"[analyze] {label}: score={analysis.engagement_score} "
                  f"events={[e.kind for e in analysis.distraction_events]}")
            return track.track_id, analysis
        except Exception as e:
            print(f"[analyze] {label}: FAILED: {e}")
            return track.track_id, None

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        return dict(pool.map(one, todo))

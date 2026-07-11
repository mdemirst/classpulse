import argparse
import json
from pathlib import Path

from pipeline.cropper import crop_clip, save_thumbnail
from pipeline.schemas import TracksFile
from pipeline.tracking import detect_and_track, render_debug_video

STAGES = ["track", "crop", "recognize", "analyze"]
DEFAULT_NAMES = "Sofia,Ben,Emma,Lucas,Kevin,Amara"


def _load_tracks(work_dir: Path) -> TracksFile:
    return TracksFile.model_validate_json((work_dir / "tracks.json").read_text())


def _save_tracks(work_dir: Path, tracks: TracksFile) -> None:
    work_dir.mkdir(parents=True, exist_ok=True)
    (work_dir / "tracks.json").write_text(tracks.model_dump_json(indent=2))


def run(video: Path, work_dir: Path, stage: str | None = None,
        model: str = "yolo11m.pt", conf: float = 0.35, stride: int = 2,
        min_track_sec: float = 2.0, pad: float = 0.05, torso_frac: float = 0.7,
        roster: Path | None = None, names: str = DEFAULT_NAMES,
        roster_photos: dict[str, Path] | None = None) -> None:
    has_roster = roster is not None or roster_photos is not None
    stages = (STAGES if has_roster else ["track", "crop"]) if stage is None else [stage]

    if "track" in stages:
        print(f"[track] {video} (model={model}, conf={conf}, stride={stride})")
        tracks = detect_and_track(video, model_name=model, conf=conf,
                                  stride=stride, min_track_sec=min_track_sec,
                                  pad=pad, torso_frac=torso_frac)
        _save_tracks(work_dir, tracks)
        for t in tracks.tracks:
            print(f"[track] #{t.track_id}: {len(t.frames)} detections, "
                  f"{t.t_start:.1f}s → {t.t_end:.1f}s, crop={t.crop}")
        debug = render_debug_video(video, tracks, work_dir / "debug.mp4")
        print(f"[track] {len(tracks.tracks)} tracks kept · debug overlay: {debug}")

    if "crop" in stages:
        tracks = _load_tracks(work_dir)
        for t in tracks.tracks:
            t.clip_path = str(crop_clip(video, t, work_dir / "clips" / f"track_{t.track_id}.mp4"))
            t.thumbnail_path = str(save_thumbnail(video, t, work_dir / "thumbs" / f"track_{t.track_id}.jpg"))
            print(f"[crop] #{t.track_id} -> {t.clip_path}")
        _save_tracks(work_dir, tracks)
        print(f"[crop] done: {len(tracks.tracks)} clips in {work_dir / 'clips'}")

    if "recognize" in stages:
        if roster is None and roster_photos is None:
            raise SystemExit("recognize stage needs --roster <grid image> or classroom roster photos")
        from pipeline.faces import build_roster, load_roster_photos, recognize_tracks  # heavy import

        tracks = _load_tracks(work_dir)
        if roster_photos is not None:
            print(f"[recognize] roster photos -> {list(roster_photos)}")
            embeddings = load_roster_photos(roster_photos)
        else:
            name_list = [n.strip() for n in names.split(",") if n.strip()]
            print(f"[recognize] roster {roster} -> {name_list}")
            embeddings = build_roster(roster, name_list, work_dir / "roster")
        matches = recognize_tracks(video, tracks, embeddings)
        by_id = {m["track_id"]: m for m in matches}
        for t in tracks.tracks:
            m = by_id[t.track_id]
            t.name, t.name_similarity = m["name"], m["similarity"]
            if m["name"] and t.clip_path:
                old = Path(t.clip_path)
                new = old.with_name(f"track_{t.track_id}__{m['name']}.mp4")
                if old.exists() and old != new:
                    old.rename(new)
                    t.clip_path = str(new)
            print(f"[recognize] #{t.track_id}: {m['name'] or 'UNKNOWN'} (sim={m['similarity']})")
        _save_tracks(work_dir, tracks)
        (work_dir / "matches.json").write_text(json.dumps(matches, indent=2))
        print(f"[recognize] matches -> {work_dir / 'matches.json'}")

    if "analyze" in stages:
        from pipeline.analyze import analyze_students  # network stage
        from pipeline.provider import get_provider

        tracks = _load_tracks(work_dir)
        provider = get_provider()
        print(f"[analyze] {len(tracks.tracks)} clips via {type(provider).__name__} ({provider.model})")
        analyze_students(provider, tracks.tracks, work_dir / "analysis")
        print(f"[analyze] results -> {work_dir / 'analysis'}")


def run_classroom(classroom_dir: Path, lecture: str | None, work_root: Path | None) -> None:
    """Process lectures from a classroom.json dataset (the checked-in test pattern)."""
    meta = json.loads((classroom_dir / "classroom.json").read_text())
    photos = {s["name"]: classroom_dir / s["photo"] for s in meta["roster"]}
    lectures = [l for l in meta["lectures"] if lecture is None or l["id"] == lecture]
    if not lectures:
        raise SystemExit(f"no lecture '{lecture}' in {classroom_dir / 'classroom.json'}")
    work_root = work_root or Path("work")
    for lec in lectures:
        print(f"=== {meta['id']} / {lec['id']} ===")
        run(video=classroom_dir / lec["video"], work_dir=work_root / lec["id"],
            roster_photos=photos)


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    c = sub.add_parser("classroom", help="process lectures from a classroom.json dataset")
    c.add_argument("classroom_dir", type=Path, help="dir containing classroom.json")
    c.add_argument("--lecture", default=None, help="lecture id (default: all)")
    c.add_argument("--work", type=Path, default=None, help="work root (default: work/<classroom_id>)")

    p = sub.add_parser("process", help="track students in a video and crop per-student clips")
    p.add_argument("video", type=Path)
    p.add_argument("--work", type=Path, required=True, help="artifact output dir")
    p.add_argument("--stage", choices=STAGES, default=None, help="run a single stage")
    p.add_argument("--model", default="yolo11m.pt")
    p.add_argument("--conf", type=float, default=0.35)
    p.add_argument("--stride", type=int, default=2, help="process every Nth frame")
    p.add_argument("--min-track-sec", type=float, default=2.0)
    p.add_argument("--pad", type=float, default=0.05, help="crop padding fraction")
    p.add_argument("--torso-frac", type=float, default=0.7,
                   help="keep top fraction of person box (face+torso)")
    p.add_argument("--roster", type=Path, default=None,
                   help="roster grid image; enables the recognize stage")
    p.add_argument("--names", default=DEFAULT_NAMES,
                   help="comma-separated student names in roster reading order")
    args = parser.parse_args()
    if args.command == "classroom":
        run_classroom(args.classroom_dir, args.lecture, args.work)
    else:
        run(video=args.video, work_dir=args.work, stage=args.stage, model=args.model,
            conf=args.conf, stride=args.stride, min_track_sec=args.min_track_sec,
            pad=args.pad, torso_frac=args.torso_frac, roster=args.roster, names=args.names)

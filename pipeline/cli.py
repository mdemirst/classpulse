import argparse
from pathlib import Path

from pipeline.cropper import crop_clip, save_thumbnail
from pipeline.schemas import TracksFile
from pipeline.tracking import detect_and_track, render_debug_video

STAGES = ["track", "crop"]


def _load_tracks(work_dir: Path) -> TracksFile:
    return TracksFile.model_validate_json((work_dir / "tracks.json").read_text())


def _save_tracks(work_dir: Path, tracks: TracksFile) -> None:
    work_dir.mkdir(parents=True, exist_ok=True)
    (work_dir / "tracks.json").write_text(tracks.model_dump_json(indent=2))


def run(video: Path, work_dir: Path, stage: str | None, model: str,
        conf: float, stride: int, min_track_sec: float,
        pad: float, torso_frac: float) -> None:
    stages = STAGES if stage is None else [stage]

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


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
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
    args = parser.parse_args()
    run(video=args.video, work_dir=args.work, stage=args.stage, model=args.model,
        conf=args.conf, stride=args.stride, min_track_sec=args.min_track_sec,
        pad=args.pad, torso_frac=args.torso_frac)

import subprocess
from pathlib import Path

import cv2

from pipeline.schemas import Track


def crop_clip(video_path: Path, track: Track, out_path: Path) -> Path:
    """Render the per-student clip: fixed crop window, track's time range, no audio."""
    x1, y1, x2, y2 = track.crop
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{track.t_start:.3f}", "-to", f"{track.t_end:.3f}",
        "-i", str(video_path),
        "-vf", f"crop={x2 - x1}:{y2 - y1}:{x1}:{y1}",
        "-an", str(out_path),
    ]
    subprocess.run(cmd, check=True)
    return out_path


def save_thumbnail(video_path: Path, track: Track, out_path: Path) -> Path:
    """Middle-of-track cropped frame as JPEG (for roster matching + dashboard)."""
    x1, y1, x2, y2 = track.crop
    mid_frame = track.frames[len(track.frames) // 2].frame_idx
    cap = cv2.VideoCapture(str(video_path))
    cap.set(cv2.CAP_PROP_POS_FRAMES, mid_frame)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"could not read frame {mid_frame} of {video_path}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), frame[y1:y2, x1:x2])
    return out_path

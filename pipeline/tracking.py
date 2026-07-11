"""YOLO person detection + simple IoU-overlap tracker.

Students barely move, so detections are associated to tracks purely by
bounding-box overlap with the track's last known box. No motion model.
"""
from pathlib import Path

import cv2

from pipeline.boxes import crop_window, iou, mean_box, suppress_contained
from pipeline.schemas import Track, TrackFrame, TracksFile

IOU_MATCH_THRESHOLD = 0.3
TRACK_MERGE_IOU = 0.45


class IouTracker:
    def __init__(self, threshold: float = IOU_MATCH_THRESHOLD):
        self.threshold = threshold
        self.next_id = 1
        self.last_box: dict[int, list[int]] = {}
        self.frames: dict[int, list[TrackFrame]] = {}

    def update(self, frame_idx: int, t: float, bboxes: list[list[int]]) -> None:
        # score all candidate (track, detection) pairs, assign greedily best-first
        candidates = []
        for det_idx, bbox in enumerate(bboxes):
            for track_id, last in self.last_box.items():
                score = iou(bbox, last)
                if score >= self.threshold:
                    candidates.append((score, track_id, det_idx))
        candidates.sort(reverse=True)

        used_tracks: set[int] = set()
        used_dets: set[int] = set()
        for score, track_id, det_idx in candidates:
            if track_id in used_tracks or det_idx in used_dets:
                continue
            used_tracks.add(track_id)
            used_dets.add(det_idx)
            self._append(track_id, frame_idx, t, bboxes[det_idx])

        for det_idx, bbox in enumerate(bboxes):
            if det_idx not in used_dets:
                track_id = self.next_id
                self.next_id += 1
                self._append(track_id, frame_idx, t, bbox)

    def _append(self, track_id: int, frame_idx: int, t: float, bbox: list[int]) -> None:
        self.last_box[track_id] = bbox
        self.frames.setdefault(track_id, []).append(
            TrackFrame(frame_idx=frame_idx, t=t, bbox=bbox)
        )

    def tracks(self) -> list[Track]:
        return [Track(track_id=tid, frames=frames)
                for tid, frames in sorted(self.frames.items())]


def merge_overlapping_tracks(tracks: list[Track], threshold: float = TRACK_MERGE_IOU) -> list[Track]:
    """Merge tracks whose time-averaged boxes overlap heavily.

    Students are stationary, so two tracks sitting on the same spot are the
    same person split by detection jitter (e.g. tight box vs wide box frames).
    """
    tracks = sorted(tracks, key=lambda t: -len(t.frames))
    merged: list[Track] = []
    for track in tracks:
        target = next(
            (m for m in merged if iou(mean_box(m.frames), mean_box(track.frames)) >= threshold),
            None,
        )
        if target is None:
            merged.append(track)
            continue
        seen = {f.frame_idx for f in target.frames}
        target.frames.extend(f for f in track.frames if f.frame_idx not in seen)
        target.frames.sort(key=lambda f: f.frame_idx)
    return sorted(merged, key=lambda t: t.track_id)


def video_info(video_path: Path) -> tuple[float, int, int]:
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return fps, width, height


def detect_and_track(
    video_path: Path,
    model_name: str = "yolo11n.pt",
    conf: float = 0.3,
    stride: int = 2,
    min_track_sec: float = 2.0,
    min_detections: int = 20,
) -> TracksFile:
    from ultralytics import YOLO  # heavy import

    fps, width, height = video_info(video_path)
    model = YOLO(model_name)
    tracker = IouTracker()

    results = model(source=str(video_path), stream=True, classes=[0],
                    conf=conf, vid_stride=stride, verbose=False)
    for i, result in enumerate(results):
        frame_idx = i * stride
        bboxes = [[int(v) for v in row] for row in result.boxes.xyxy]
        tracker.update(frame_idx, frame_idx / fps, suppress_contained(bboxes))

    tracks = merge_overlapping_tracks(tracker.tracks())
    tracks = [t for t in tracks
              if t.t_end - t.t_start >= min_track_sec and len(t.frames) >= min_detections]
    for t in tracks:
        t.crop = crop_window(t.frames, frame_w=width, frame_h=height)
    return TracksFile(video=str(video_path), fps=fps, width=width,
                      height=height, tracks=tracks)


def render_debug_video(video_path: Path, tracks: TracksFile, out_path: Path) -> Path:
    """Overlay tracked boxes + ids on the source video for quick eyeballing."""
    boxes_by_frame: dict[int, list[tuple[int, list[int]]]] = {}
    for t in tracks.tracks:
        for f in t.frames:
            boxes_by_frame.setdefault(f.frame_idx, []).append((t.track_id, f.bbox))

    cap = cv2.VideoCapture(str(video_path))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"),
                             tracks.fps, (tracks.width, tracks.height))
    frame_idx = 0
    last_known = {}
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        for track_id, bbox in boxes_by_frame.get(frame_idx, []):
            last_known[track_id] = bbox
        for track_id, (x1, y1, x2, y2) in last_known.items():
            cv2.rectangle(frame, (x1, y1), (x2, y2), (229, 135, 57), 2)
            cv2.putText(frame, f"#{track_id}", (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (229, 135, 57), 2)
        writer.write(frame)
        frame_idx += 1
    writer.release()
    cap.release()
    return out_path

from pipeline.schemas import TrackFrame


def iou(a: list[int], b: list[int]) -> float:
    """Intersection-over-union of two [x1, y1, x2, y2] boxes."""
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter == 0:
        return 0.0
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (area_a + area_b - inter)


def _area(b: list[int]) -> int:
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def _intersection(a: list[int], b: list[int]) -> int:
    iw = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    ih = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    return iw * ih


def suppress_contained(
    bboxes: list[list[int]], containment: float = 0.7, area_ratio: float = 1.4
) -> list[list[int]]:
    """Drop boxes that mostly CONTAIN a significantly smaller box.

    Kills two YOLO failure modes in classroom scenes: (a) a wide person+desk
    duplicate around a tight person box, (b) one merged box around two adjacent
    students when their tight boxes were also detected.
    """
    drop: set[int] = set()
    for i, big in enumerate(bboxes):
        for j, small in enumerate(bboxes):
            if i == j or _area(small) == 0:
                continue
            contains = _intersection(big, small) / _area(small) > containment
            much_bigger = _area(big) > area_ratio * _area(small)
            if contains and much_bigger:
                drop.add(i)
                break
    return [b for i, b in enumerate(bboxes) if i not in drop]


def mean_box(frames: list[TrackFrame]) -> list[int]:
    n = len(frames)
    return [round(sum(f.bbox[k] for f in frames) / n) for k in range(4)]


def smooth_frames(frames: list[TrackFrame], window: int = 9) -> list[TrackFrame]:
    """Centered moving average over bbox coordinates."""
    half = window // 2
    out = []
    for i, f in enumerate(frames):
        lo, hi = max(0, i - half), min(len(frames), i + half + 1)
        neighborhood = [frames[j].bbox for j in range(lo, hi)]
        avg = [round(sum(b[k] for b in neighborhood) / len(neighborhood)) for k in range(4)]
        out.append(TrackFrame(frame_idx=f.frame_idx, t=f.t, bbox=avg))
    return out


def crop_window(
    frames: list[TrackFrame], frame_w: int, frame_h: int,
    pad: float = 0.05, torso_frac: float = 0.7,
) -> list[int]:
    """One fixed crop rect for a whole track.

    Median box (not union — union inflates with detection jitter and pulls in
    neighbors), cut to the top `torso_frac` of the person (face+torso; the rest
    is desk), then lightly padded.
    """
    def median(vals: list[int]) -> int:
        s = sorted(vals)
        return s[len(s) // 2]

    x1 = median([f.bbox[0] for f in frames])
    y1 = median([f.bbox[1] for f in frames])
    x2 = median([f.bbox[2] for f in frames])
    y2 = median([f.bbox[3] for f in frames])
    y2 = y1 + round((y2 - y1) * torso_frac)
    pw, ph = pad * (x2 - x1), pad * (y2 - y1)
    x1, y1 = max(0, int(x1 - pw)), max(0, int(y1 - ph))
    x2, y2 = min(frame_w, int(x2 + pw)), min(frame_h, int(y2 + ph))
    if (x2 - x1) % 2:
        x2 -= 1
    if (y2 - y1) % 2:
        y2 -= 1
    return [x1, y1, x2, y2]

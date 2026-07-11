"""Face-embedding roster recognition.

Roster: one grid image of portraits. We detect the faces, assign names in
reading order, and keep a 512-d normed embedding per student (InsightFace
buffalo_l). Tracks: sample frames from each track's crop region, embed the
largest face, average across samples, and match to the roster by cosine
similarity (normed embeddings -> plain dot product).
"""
from pathlib import Path

import cv2
import numpy as np

from pipeline.schemas import Track, TracksFile

MATCH_THRESHOLD = 0.15  # absolute floor; assignment is one-to-one greedy on top

_app = None


def face_app():
    global _app
    if _app is None:
        from insightface.app import FaceAnalysis  # heavy import
        _app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _app.prepare(ctx_id=0, det_size=(640, 640))
    return _app


def build_roster(roster_img: Path, names: list[str], out_dir: Path) -> dict[str, np.ndarray]:
    """Detect faces in a roster grid image, assign names in reading order,
    save a crop per student, return {name: normed_embedding}."""
    img = cv2.imread(str(roster_img))
    if img is None:
        raise FileNotFoundError(roster_img)
    faces = face_app().get(img)
    if len(faces) < len(names):
        raise RuntimeError(f"found {len(faces)} faces in roster, expected {len(names)}")

    # reading order: cluster into rows by face-center y, then sort rows by x
    faces.sort(key=lambda f: (f.bbox[1] + f.bbox[3]) / 2)
    rows: list[list] = []
    for f in faces:
        cy = (f.bbox[1] + f.bbox[3]) / 2
        h = f.bbox[3] - f.bbox[1]
        if rows and abs(cy - np.mean([(g.bbox[1] + g.bbox[3]) / 2 for g in rows[-1]])) < h:
            rows[-1].append(f)
        else:
            rows.append([f])
    ordered = [f for row in rows for f in sorted(row, key=lambda f: f.bbox[0])]

    out_dir.mkdir(parents=True, exist_ok=True)
    roster: dict[str, np.ndarray] = {}
    for name, face in zip(names, ordered):
        x1, y1, x2, y2 = face.bbox.astype(int)
        w, h = x2 - x1, y2 - y1
        cx1, cy1 = max(0, x1 - w // 2), max(0, y1 - h // 2)
        cx2, cy2 = min(img.shape[1], x2 + w // 2), min(img.shape[0], y2 + h // 2)
        cv2.imwrite(str(out_dir / f"{name}.jpg"), img[cy1:cy2, cx1:cx2])
        roster[name] = face.normed_embedding
    return roster


def track_embedding(video_path: Path, track: Track, n_samples: int = 5) -> np.ndarray | None:
    """Average normed face embedding over sampled frames of the track's crop."""
    x1, y1, x2, y2 = track.crop
    idxs = [track.frames[i].frame_idx
            for i in np.linspace(0, len(track.frames) - 1, n_samples).astype(int)]
    cap = cv2.VideoCapture(str(video_path))
    embeddings = []
    for frame_idx in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, frame = cap.read()
        if not ok:
            continue
        faces = face_app().get(frame[y1:y2, x1:x2])
        if not faces:
            continue
        largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        embeddings.append(largest.normed_embedding)
    cap.release()
    if not embeddings:
        return None
    mean = np.mean(embeddings, axis=0)
    return mean / np.linalg.norm(mean)


def recognize_tracks(
    video_path: Path, tracks: TracksFile, roster: dict[str, np.ndarray],
    threshold: float = MATCH_THRESHOLD,
) -> list[dict]:
    """One-to-one greedy assignment of roster names to tracks.

    Absolute similarities can be low across the portrait->classroom domain gap,
    but the per-track ranking is decisive; assigning best-pair-first and never
    reusing a name or a track keeps the mapping clean.
    Returns [{track_id, name, similarity}].
    """
    names = list(roster)
    matrix = np.stack([roster[n] for n in names])  # (N, 512), normed
    sims_by_track: dict[int, np.ndarray] = {}
    for track in tracks.tracks:
        emb = track_embedding(video_path, track)
        if emb is not None:
            sims_by_track[track.track_id] = matrix @ emb

    pairs = sorted(
        ((float(sims[i]), track_id, names[i])
         for track_id, sims in sims_by_track.items()
         for i in range(len(names))),
        reverse=True,
    )
    assigned: dict[int, tuple[str, float]] = {}
    used_names: set[str] = set()
    for sim, track_id, name in pairs:
        if sim < threshold or track_id in assigned or name in used_names:
            continue
        assigned[track_id] = (name, sim)
        used_names.add(name)

    results = []
    for track in tracks.tracks:
        name, sim = assigned.get(track.track_id, (None, 0.0))
        if name is None and track.track_id in sims_by_track:
            sim = float(np.max(sims_by_track[track.track_id]))
        results.append({"track_id": track.track_id, "name": name,
                        "similarity": round(sim, 3)})
    return results

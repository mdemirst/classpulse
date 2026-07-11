from typing import Literal

from pydantic import BaseModel, Field


class TrackFrame(BaseModel):
    frame_idx: int
    t: float
    bbox: list[int]  # [x1, y1, x2, y2] pixels


class Track(BaseModel):
    track_id: int
    frames: list[TrackFrame]
    crop: list[int] | None = None  # fixed crop window [x1, y1, x2, y2]
    clip_path: str | None = None
    thumbnail_path: str | None = None
    name: str | None = None  # roster match
    name_similarity: float | None = None

    @property
    def t_start(self) -> float:
        return self.frames[0].t

    @property
    def t_end(self) -> float:
        return self.frames[-1].t


class TracksFile(BaseModel):
    video: str
    fps: float
    width: int
    height: int
    tracks: list[Track]


class RosterMatch(BaseModel):
    track_id: int
    name: str | None
    confidence: float = Field(ge=0.0, le=1.0)


class RosterMatches(BaseModel):
    matches: list[RosterMatch]


class TimelinePoint(BaseModel):
    t: float
    score: int = Field(ge=0, le=100)


class Evidence(BaseModel):
    t: float
    note: str


class DistractionEvent(BaseModel):
    t_start: float
    t_end: float
    kind: Literal["phone", "asleep", "chatting", "looking_away", "other"]
    note: str


STATE_KINDS = ["listening", "writing", "speaking", "looking_away",
               "chatting", "phone", "asleep", "other"]


class StateSegment(BaseModel):
    """A contiguous stretch of one observable behavior (drives the UI timeline)."""
    t_start: float
    t_end: float
    state: Literal["listening", "writing", "speaking", "looking_away",
                   "chatting", "phone", "asleep", "other"]
    note: str = ""


class StudentAnalysis(BaseModel):
    engagement_score: int = Field(ge=0, le=100)
    engagement_timeline: list[TimelinePoint]
    states: list[StateSegment] = []
    distraction_events: list[DistractionEvent]
    evidence: list[Evidence]
    summary: str
    suggestion: str = ""  # one actionable coaching suggestion for the teacher

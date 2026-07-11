export interface Classroom {
  id: string;
  name: string;
  teacher_name: string | null;
  grade: string | null;
}

export interface Student {
  id: string;
  classroom_id: string;
  name: string;
  roster_photo_object_id: string | null;
}

export interface Evidence { t: number; note: string }
export interface ClassScore { dimension: string; score: number; evidence: Evidence[] }
export interface TimelinePoint { t: number; score: number }
export interface DistractionEvent { t_start: number; t_end: number; kind: string; note: string }

export type StateKind =
  | "listening" | "writing" | "speaking" | "looking_away"
  | "chatting" | "phone" | "asleep" | "other";

export interface StateSegment {
  t_start: number;
  t_end: number;
  state: StateKind;
  note: string;
}

// Butterbase jsonb columns store arrays wrapped as {items: [...]}
export interface Items<T> { items: T[] }

export interface Lesson {
  id: string;
  classroom_id: string;
  title: string;
  lesson_date: string;
  duration_sec: number | null;
  status: string;
  source_hash?: string | null;
  video_object_id?: string | null;
  error?: string | null;
  class_scores: Items<ClassScore> | null;
  engagement_timeline: Items<TimelinePoint> | null;
  notes_md: string | null;
  transcript: string | null;
  highlights: Items<Evidence> | null;
}

export interface StudentResult {
  id: string;
  lesson_id: string;
  student_id: string | null;
  track_id: number | null;
  present: boolean;
  match_confidence: number;
  engagement_score: number | null;
  engagement_timeline: Items<TimelinePoint> | null;
  distraction_events: Items<DistractionEvent> | null;
  clip_object_id: string | null;
  thumbnail_object_id: string | null;
  summary: string | null;
  suggestion: string | null;
  // written by the pipeline; absent on locally-synthesized rows
  states?: Items<StateSegment> | null;
  clip_start_sec?: number | null;
  clip_duration_sec?: number | null;
}

export interface Insight {
  id: string;
  scope: "student" | "classroom";
  classroom_id: string;
  student_id: string | null;
  text: string;
  source: string;
  created_at: string;
}

import type { DistractionEvent } from "../types";

export function distractionPenalty(
  events: DistractionEvent[],
  lessonDuration: number
): number {
  if (lessonDuration <= 0) return 0;
  const distractedSec = events.reduce((s, e) => s + Math.max(0, e.t_end - e.t_start), 0);
  return Math.round((distractedSec / lessonDuration) * 40);
}

export function focusScore(
  engagement: number | null,
  events: DistractionEvent[],
  duration: number
): number | null {
  if (engagement === null) return null;
  return Math.max(0, Math.min(100, engagement - distractionPenalty(events, duration)));
}

export const DISTRACTION_COLORS: Record<string, string> = {
  phone: "#ec835a",
  chatting: "#d03b3b",
  looking_away: "#fab219",
  asleep: "#8a897f",
  other: "#c3c2b7",
};

export function distractionColor(kind: string): string {
  return DISTRACTION_COLORS[kind] ?? DISTRACTION_COLORS.other;
}

import type { ClassScore, Lesson } from "../types";

export const DIMENSIONS = ["engagement", "learning", "efficiency", "fun"] as const;

export function scoreColor(score: number | null): string {
  if (score === null) return "var(--ink-3)";
  if (score >= 75) return "var(--good)";
  if (score >= 55) return "var(--warning)";
  return "var(--critical)";
}

export function engagementOf(lesson: Lesson): number | null {
  const item = lesson.class_scores?.items.find((s) => s.dimension === "engagement");
  return item ? item.score : null;
}

export function dimensionOf(lesson: Lesson, dimension: string): number | null {
  const item = lesson.class_scores?.items.find((s) => s.dimension === dimension);
  return item ? item.score : null;
}

export function dimensionScores(lesson: Lesson): ClassScore[] {
  const items = lesson.class_scores?.items ?? [];
  return DIMENSIONS.map((d) => items.find((s) => s.dimension === d)).filter(
    (s): s is ClassScore => s !== undefined
  );
}

export function trendDelta(latest: number | null, prev: number | null): number | null {
  if (latest === null || prev === null) return null;
  return latest - prev;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

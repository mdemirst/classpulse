/** Convert 0–100 classroom scores to a 1–5 report-card rating. */

export function toFivePoint(score: number | null): number | null {
  if (score === null) return null;
  return Math.max(1, Math.min(5, Math.round((score / 100) * 4 + 1)));
}

export function fivePointColor(rating: number | null): string {
  if (rating === null) return "var(--ink-3)";
  if (rating >= 4) return "var(--good)";
  if (rating >= 3) return "var(--series)";
  if (rating >= 2) return "var(--warning)";
  return "var(--serious)";
}

export function fivePointLabel(rating: number): string {
  switch (rating) {
    case 5: return "Excellent";
    case 4: return "Strong";
    case 3: return "On track";
    case 2: return "Developing";
    default: return "Needs support";
  }
}

/** Which of the three bar segments is active (0 = low, 1 = mid, 2 = high). */
export function activeSegment(rating: number): number {
  if (rating <= 2) return 0;
  if (rating === 3) return 1;
  return 2;
}

export const SEGMENT_LABELS = ["Developing", "On track", "Strong"] as const;

import type { Insight } from "../types";

export type InsightCategory = "alert" | "positive" | "pattern" | "default";

const ALERT_RE = /declin|distraction|asleep|fell asleep|disengag|phone|chatting|check-in/i;
const POSITIVE_RE = /upward trend|improving|lock it in|strong upward|acknowledg/i;

export function categorizeInsight(insight: Insight): InsightCategory {
  if (insight.scope === "classroom") return "pattern";
  const t = insight.text;
  if (ALERT_RE.test(t)) return "alert";
  if (POSITIVE_RE.test(t)) return "positive";
  return "default";
}

export function categoryAccent(cat: InsightCategory): string {
  switch (cat) {
    case "alert": return "var(--critical)";
    case "positive": return "var(--good)";
    case "pattern": return "var(--series)";
    default: return "var(--ink-3)";
  }
}

export function categoryLabel(cat: InsightCategory): string {
  switch (cat) {
    case "alert": return "Needs attention";
    case "positive": return "Positive trend";
    case "pattern": return "Class pattern";
    default: return "Insight";
  }
}

export function categoryIcon(cat: InsightCategory): string {
  switch (cat) {
    case "alert": return "!";
    case "positive": return "↑";
    case "pattern": return "◈";
    default: return "·";
  }
}

export function insightActionPath(insight: Insight): string {
  return `/classroom/${insight.classroom_id}`;
}

export function insightActionLabel(_insight: Insight): string {
  return "View in Classroom";
}

/** Parse sequences like "84 → 66 → 41" from insight text. */
export function parseTrendNumbers(text: string): number[] | null {
  const matches = text.match(/\b(\d{1,3})\b/g);
  if (!matches || matches.length < 2) return null;
  const nums = matches.map(Number).filter((n) => n <= 100);
  return nums.length >= 2 ? nums : null;
}

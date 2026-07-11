import type { ClassScore, Insight, Lesson, StudentResult } from "../types";
import { DIMENSIONS, dimensionOf, dimensionScores } from "./scores";

export type CoachingKind = "strength" | "opportunity" | "action";

export interface CoachingCardData {
  id: string;
  kind: CoachingKind;
  title: string;
  body: string;
  evidence?: { t?: number; note: string };
  priority: number;
  studentName?: string;
}

export const DIM_LABELS: Record<string, string> = {
  engagement: "Engagement",
  learning: "Learning",
  efficiency: "Efficiency",
  fun: "Fun",
};

const WEIGHTS: Record<string, number> = {
  learning: 0.35,
  efficiency: 0.3,
  engagement: 0.2,
  fun: 0.15,
};

export function teachingScore(lesson: Lesson): number | null {
  const scores = dimensionScores(lesson);
  if (scores.length === 0) return null;
  let total = 0;
  let weight = 0;
  for (const d of DIMENSIONS) {
    const s = dimensionOf(lesson, d);
    if (s !== null) {
      total += s * (WEIGHTS[d] ?? 0.25);
      weight += WEIGHTS[d] ?? 0.25;
    }
  }
  return weight > 0 ? Math.round(total / weight) : null;
}

export function dimensionBreakdown(lesson: Lesson): ClassScore[] {
  return dimensionScores(lesson);
}

function strengthTitle(dimension: string): string {
  switch (dimension) {
    case "learning": return "Strong learning outcomes";
    case "efficiency": return "Good pacing";
    case "engagement": return "High engagement delivery";
    case "fun": return "Great classroom energy";
    default: return `Strong ${DIM_LABELS[dimension] ?? dimension}`;
  }
}

function opportunityTitle(dimension: string): string {
  switch (dimension) {
    case "learning": return "Check for understanding";
    case "efficiency": return "Pacing opportunity";
    case "engagement": return "Engagement dip";
    case "fun": return "Energy could lift";
    default: return `${DIM_LABELS[dimension] ?? dimension} gap`;
  }
}

function dedupeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").slice(0, 60);
}

export function lessonCoachingCards(
  lesson: Lesson,
  results: StudentResult[],
  studentName: (id: string | null) => string,
): CoachingCardData[] {
  const cards: CoachingCardData[] = [];
  const seen = new Set<string>();

  for (const s of dimensionScores(lesson)) {
    if (s.score >= 75) {
      const ev = s.evidence[0];
      cards.push({
        id: `strength-dim-${s.dimension}`,
        kind: "strength",
        title: strengthTitle(s.dimension),
        body: ev
          ? `${DIM_LABELS[s.dimension] ?? s.dimension} scored ${s.score} — ${ev.note}`
          : `${DIM_LABELS[s.dimension] ?? s.dimension} scored ${s.score} this lesson.`,
        evidence: ev ? { t: ev.t, note: ev.note } : undefined,
        priority: 100 - s.score,
      });
    } else if (s.score < 65) {
      const ev = s.evidence[0];
      cards.push({
        id: `opp-dim-${s.dimension}`,
        kind: "opportunity",
        title: opportunityTitle(s.dimension),
        body: ev
          ? `${DIM_LABELS[s.dimension] ?? s.dimension} at ${s.score} — ${ev.note}`
          : `${DIM_LABELS[s.dimension] ?? s.dimension} scored ${s.score}; consider adjusting this area next lesson.`,
        evidence: ev ? { t: ev.t, note: ev.note } : undefined,
        priority: s.score,
      });
    }
  }

  for (const h of lesson.highlights?.items ?? []) {
    const key = dedupeKey(h.note);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      id: `strength-hl-${h.t}`,
      kind: "strength",
      title: "What worked",
      body: h.note,
      evidence: { t: h.t, note: h.note },
      priority: 50,
    });
  }

  const present = results.filter((r) => r.present && r.suggestion);
  const actionCandidates = present
    .filter((r) => {
      const score = r.engagement_score ?? 100;
      const events = r.distraction_events?.items ?? [];
      return score < 60 || events.length >= 2;
    })
    .sort((a, b) => (a.engagement_score ?? 100) - (b.engagement_score ?? 100));

  for (const r of actionCandidates) {
    if (!r.suggestion) continue;
    const key = dedupeKey(r.suggestion);
    if (seen.has(key)) continue;
    seen.add(key);
    const name = studentName(r.student_id);
    cards.push({
      id: `action-${r.id}`,
      kind: "action",
      title: name ? `Try with ${name.split(" ")[0]}` : "Student action",
      body: r.suggestion,
      priority: r.engagement_score ?? 0,
      studentName: name,
    });
    if (cards.filter((c) => c.kind === "action").length >= 4) break;
  }

  return cards.sort((a, b) => {
    const kindOrder = { opportunity: 0, action: 1, strength: 2 };
    const ko = kindOrder[a.kind] - kindOrder[b.kind];
    if (ko !== 0) return ko;
    return a.priority - b.priority;
  });
}

export interface ClassroomCoachingProfile {
  cards: CoachingCardData[];
  scoreTrend: { lessonId: string; title: string; score: number }[];
  latestScore: number | null;
  scoreDelta: number | null;
}

export function classroomCoachingProfile(
  lessons: Lesson[],
  results: StudentResult[],
  insights: Insight[],
  classroomId: string,
  studentName: (id: string | null) => string,
): ClassroomCoachingProfile {
  const cards: CoachingCardData[] = [];
  const seen = new Set<string>();

  const scoreTrend = lessons
    .map((l) => ({ lessonId: l.id, title: l.title, score: teachingScore(l) }))
    .filter((x): x is { lessonId: string; title: string; score: number } => x.score !== null);

  const latestScore = scoreTrend.at(-1)?.score ?? null;
  const prevScore = scoreTrend.at(-2)?.score ?? null;
  const scoreDelta = latestScore !== null && prevScore !== null ? latestScore - prevScore : null;

  const classroomInsights = insights.filter(
    (i) => i.scope === "classroom" && i.classroom_id === classroomId,
  );
  for (const ins of classroomInsights) {
    cards.push({
      id: `pattern-${ins.id}`,
      kind: "opportunity",
      title: "Teaching pattern",
      body: ins.text,
      priority: 10,
    });
  }

  if (latestScore !== null && prevScore !== null && scoreDelta !== null) {
    if (scoreDelta >= 5) {
      cards.push({
        id: "trend-up",
        kind: "strength",
        title: "Teaching score improving",
        body: `Your teaching effectiveness rose from ${prevScore} to ${latestScore} across recent lessons.`,
        priority: 30,
      });
    } else if (scoreDelta <= -5) {
      cards.push({
        id: "trend-down",
        kind: "opportunity",
        title: "Teaching score dipped",
        body: `Your teaching effectiveness went from ${prevScore} to ${latestScore}. Review what changed in lesson format or pacing.`,
        priority: 5,
      });
    }
  }

  const latestLesson = lessons.at(-1);
  if (latestLesson) {
    const lessonCards = lessonCoachingCards(
      latestLesson,
      results.filter((r) => r.lesson_id === latestLesson.id),
      studentName,
    );
    for (const c of lessonCards.slice(0, 6)) {
      const key = dedupeKey(c.body);
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ ...c, id: `cls-${c.id}` });
    }
  }

  const suggestionCounts = new Map<string, { text: string; count: number; name: string }>();
  for (const r of results) {
    if (!r.suggestion || !r.present) continue;
    const key = dedupeKey(r.suggestion);
    const existing = suggestionCounts.get(key);
    const name = studentName(r.student_id) ?? "Student";
    if (existing) {
      existing.count += 1;
    } else {
      suggestionCounts.set(key, { text: r.suggestion, count: 1, name });
    }
  }
  for (const [, v] of suggestionCounts) {
    if (v.count < 2) continue;
    const key = dedupeKey(v.text);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      id: `recurring-${key.slice(0, 20)}`,
      kind: "action",
      title: "Recurring recommendation",
      body: `${v.text} (seen across ${v.count} lessons)`,
      priority: 20,
      studentName: v.name,
    });
  }

  return {
    cards: cards.sort((a, b) => {
      const kindOrder = { opportunity: 0, action: 1, strength: 2 };
      const ko = kindOrder[a.kind] - kindOrder[b.kind];
      if (ko !== 0) return ko;
      return a.priority - b.priority;
    }),
    scoreTrend,
    latestScore,
    scoreDelta,
  };
}

export function coachingKindAccent(kind: CoachingKind): string {
  switch (kind) {
    case "strength": return "var(--good)";
    case "opportunity": return "var(--warning)";
    case "action": return "var(--series)";
  }
}

export function coachingKindLabel(kind: CoachingKind): string {
  switch (kind) {
    case "strength": return "Strength";
    case "opportunity": return "Opportunity";
    case "action": return "Action";
  }
}

export function coachingKindIcon(kind: CoachingKind): string {
  switch (kind) {
    case "strength": return "✓";
    case "opportunity": return "◆";
    case "action": return "→";
  }
}

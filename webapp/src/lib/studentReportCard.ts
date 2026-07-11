import { focusScore } from "./focusScore";
import { toFivePoint } from "./ratingScale";
import type { Classroom, Insight, Lesson, Student, StudentResult } from "../types";

export type PerformanceBand = "excelling" | "on_track" | "growing" | "needs_support";
export type ParentInsightCategory = "highlight" | "progress" | "support";

export interface ParentInsight {
  id: string;
  category: ParentInsightCategory;
  title: string;
  body: string;
}

export interface LessonRow {
  lesson: Lesson;
  result: StudentResult | undefined;
  engagement: number | null;
  focus: number | null;
  engagementRating: number | null;
  focusRating: number | null;
}

export interface StudentReportProfile {
  student: Student;
  classroom: Classroom;
  lessonsAttended: number;
  lessonsTotal: number;
  attendancePct: number;
  avgEngagement: number | null;
  avgFocus: number | null;
  overallScore: number | null;
  avgEngagementRating: number | null;
  avgFocusRating: number | null;
  overallRating: number | null;
  latestEngagement: number | null;
  latestRating: number | null;
  trendDelta: number | null;
  ratingTrendDelta: number | null;
  performanceBand: PerformanceBand;
  lessonRows: LessonRow[];
  teacherInsights: Insight[];
  parentInsights: ParentInsight[];
}

export function overallScore(avgEngagement: number | null, avgFocus: number | null): number | null {
  if (avgEngagement === null && avgFocus === null) return null;
  const eng = avgEngagement ?? 0;
  const foc = avgFocus ?? avgEngagement ?? 0;
  return Math.round(eng * 0.6 + foc * 0.4);
}

export function overallRating(avgEngagement: number | null, avgFocus: number | null): number | null {
  return toFivePoint(overallScore(avgEngagement, avgFocus));
}

export function performanceBand(
  rating: number | null,
  ratingTrend: number | null,
): PerformanceBand {
  if (rating === null) return "growing";
  if (rating >= 4 && (ratingTrend === null || ratingTrend >= 0)) return "excelling";
  if (rating >= 3) return "on_track";
  if (rating >= 2 || (ratingTrend !== null && ratingTrend >= 1)) return "growing";
  return "needs_support";
}

export function bandLabel(band: PerformanceBand): string {
  switch (band) {
    case "excelling": return "Excelling";
    case "on_track": return "On track";
    case "growing": return "Growing";
    case "needs_support": return "Needs support";
  }
}

export function bandAccent(band: PerformanceBand): string {
  switch (band) {
    case "excelling": return "var(--good)";
    case "on_track": return "var(--series)";
    case "growing": return "var(--warning)";
    case "needs_support": return "var(--serious)";
  }
}

export function parentCategoryLabel(cat: ParentInsightCategory): string {
  switch (cat) {
    case "highlight": return "Highlight";
    case "progress": return "Progress";
    case "support": return "Support at home";
  }
}

export function parentCategoryAccent(cat: ParentInsightCategory): string {
  switch (cat) {
    case "highlight": return "var(--good)";
    case "progress": return "var(--series)";
    case "support": return "#7eb8f0";
  }
}

export function parentCategoryIcon(cat: ParentInsightCategory): string {
  switch (cat) {
    case "highlight": return "★";
    case "progress": return "↑";
    case "support": return "♥";
  }
}

function softenSummary(text: string): string {
  return text
    .replace(/\blargely disengaged\b/gi, "had a tougher day staying focused")
    .replace(/\bdisengaged\b/gi, "was less engaged")
    .replace(/\bphone\b/gi, "a distraction")
    .replace(/\basleep\b/gi, "resting")
    .replace(/—/g, " — ");
}

function reframeForParents(text: string, firstName: string): string {
  const t = text.toLowerCase();
  if (/declin|dipped|dropping/.test(t)) {
    return `${firstName} may benefit from a quick check-in about how class is feeling — engagement dipped recently. A supportive conversation at home can help.`;
  }
  if (/upward trend|improving|improved/.test(t)) {
    return `${firstName}'s engagement has improved steadily — celebrate the progress together and keep encouraging curiosity.`;
  }
  if (/asleep|wellbeing/.test(t)) {
    return `${firstName} seemed tired during some lessons this week — ensuring good rest and a morning routine may help energy in class.`;
  }
  if (/chatting|seating/.test(t)) {
    return `${firstName} does best with clear structure during instruction — a consistent homework spot at home reinforces focus habits.`;
  }
  if (/phone|distraction/.test(t)) {
    return `${firstName} stays more engaged with active learning — limiting devices during homework time can mirror what works in class.`;
  }
  return softenSummary(text);
}

function reframeSuggestion(suggestion: string): string {
  if (/pair|group|partner/.test(suggestion.toLowerCase())) {
    return "Group study or working through problems together at home may help reinforce what was covered in class.";
  }
  if (/check-in|wellbeing|awake|asleep/.test(suggestion.toLowerCase())) {
    return "A brief daily check-in about how school felt — and consistent sleep — can make a real difference.";
  }
  if (/front|seating|window/.test(suggestion.toLowerCase())) {
    return "A dedicated, distraction-free study space at home can support the same focus habits that help in class.";
  }
  if (/stretch|questions|demonstration|board/.test(suggestion.toLowerCase())) {
    return "Encourage your child to ask questions and explain their thinking — it builds on their natural strengths.";
  }
  if (/acknowledge|improvement|trend/.test(suggestion.toLowerCase())) {
    return "Recognizing recent effort at home reinforces the positive momentum your child is building.";
  }
  return softenSummary(suggestion);
}

function buildParentInsights(
  student: Student,
  profile: Omit<StudentReportProfile, "parentInsights">,
  insights: Insight[],
): ParentInsight[] {
  const cards: ParentInsight[] = [];
  const firstName = student.name.split(" ")[0];
  const seen = new Set<string>();

  function add(cat: ParentInsightCategory, title: string, body: string, id: string) {
    const key = body.slice(0, 50);
    if (seen.has(key)) return;
    seen.add(key);
    cards.push({ id, category: cat, title, body });
  }

  if (profile.ratingTrendDelta !== null && profile.ratingTrendDelta >= 1) {
    add(
      "progress",
      "Moving in the right direction",
      `${firstName}'s engagement rating improved across recent lessons — celebrate the progress together.`,
      "trend-up",
    );
  }

  const bestRow = profile.lessonRows
    .filter((r) => r.engagementRating !== null && r.result?.present)
    .sort((a, b) => (b.engagementRating ?? 0) - (a.engagementRating ?? 0))[0];

  if (bestRow?.result?.summary && (bestRow.engagementRating ?? 0) >= 4) {
    add(
      "highlight",
      "A strong lesson to build on",
      softenSummary(bestRow.result.summary),
      "best-lesson",
    );
  }

  for (const ins of insights.filter((i) => i.student_id === student.id)) {
    add(
      ins.text.toLowerCase().includes("improv") || ins.text.toLowerCase().includes("upward")
        ? "progress"
        : "support",
      `From this week's observations`,
      reframeForParents(ins.text, firstName),
      `insight-${ins.id}`,
    );
  }

  const latestWithSuggestion = [...profile.lessonRows]
    .reverse()
    .find((r) => r.result?.suggestion && r.result.present);

  if (latestWithSuggestion?.result?.suggestion) {
    add(
      "support",
      "Ways to help at home",
      reframeSuggestion(latestWithSuggestion.result.suggestion),
      "support-tip",
    );
  }

  if (profile.lessonsAttended < profile.lessonsTotal) {
    add(
      "support",
      "Attendance",
      `${firstName} was present for ${profile.lessonsAttended} of ${profile.lessonsTotal} lessons this period. Regular attendance supports steady progress.`,
      "attendance",
    );
  }

  if (profile.performanceBand === "excelling" && cards.length === 0) {
    add(
      "highlight",
      "Consistently engaged",
      `${firstName} has been highly engaged across lessons this week — keep nurturing their curiosity and love of learning.`,
      "excelling-default",
    );
  }

  return cards;
}

export function buildStudentReportProfile(
  student: Student,
  classroom: Classroom,
  lessons: Lesson[],
  results: StudentResult[],
  insights: Insight[],
): StudentReportProfile {
  const lessonRows: LessonRow[] = lessons.map((lesson) => {
    const result = results.find((r) => r.lesson_id === lesson.id);
    const duration = lesson.duration_sec ?? 1800;
    const engagement = result?.present ? (result.engagement_score ?? null) : null;
    const focus = result?.present && engagement !== null
      ? focusScore(engagement, result.distraction_events?.items ?? [], duration)
      : null;
    return {
      lesson,
      result,
      engagement,
      focus,
      engagementRating: toFivePoint(engagement),
      focusRating: toFivePoint(focus),
    };
  });

  const presentRows = lessonRows.filter((r) => r.result?.present);
  const engagements = presentRows
    .map((r) => r.engagement)
    .filter((s): s is number => s !== null);
  const focuses = presentRows
    .map((r) => r.focus)
    .filter((s): s is number => s !== null);
  const engagementRatings = presentRows
    .map((r) => r.engagementRating)
    .filter((s): s is number => s !== null);
  const focusRatings = presentRows
    .map((r) => r.focusRating)
    .filter((s): s is number => s !== null);

  const avgEngagement = engagements.length
    ? Math.round(engagements.reduce((a, b) => a + b, 0) / engagements.length)
    : null;
  const avgFocus = focuses.length
    ? Math.round(focuses.reduce((a, b) => a + b, 0) / focuses.length)
    : null;

  const avgEngagementRating = engagementRatings.length
    ? Math.round(engagementRatings.reduce((a, b) => a + b, 0) / engagementRatings.length)
    : null;
  const avgFocusRating = focusRatings.length
    ? Math.round(focusRatings.reduce((a, b) => a + b, 0) / focusRatings.length)
    : null;

  const latestEngagement = engagements.at(-1) ?? null;
  const prevEngagement = engagements.at(-2) ?? null;
  const trend = latestEngagement !== null && prevEngagement !== null
    ? latestEngagement - prevEngagement
    : null;

  const overallR = avgEngagementRating !== null && avgFocusRating !== null
    ? Math.round((avgEngagementRating + avgFocusRating) / 2)
    : avgEngagementRating ?? avgFocusRating ?? null;
  const latestR = engagementRatings.at(-1) ?? null;
  const prevR = engagementRatings.at(-2) ?? null;
  const ratingTrend = latestR !== null && prevR !== null ? latestR - prevR : null;

  const lessonsAttended = presentRows.length;
  const lessonsTotal = lessons.length;
  const attendancePct = lessonsTotal > 0
    ? Math.round((lessonsAttended / lessonsTotal) * 100)
    : 0;

  const score = overallScore(avgEngagement, avgFocus);
  const band = performanceBand(overallR, ratingTrend);

  const base: Omit<StudentReportProfile, "parentInsights"> = {
    student,
    classroom,
    lessonsAttended,
    lessonsTotal,
    attendancePct,
    avgEngagement,
    avgFocus,
    overallScore: score,
    avgEngagementRating,
    avgFocusRating,
    overallRating: overallR,
    latestEngagement,
    latestRating: latestR,
    trendDelta: trend,
    ratingTrendDelta: ratingTrend,
    performanceBand: band,
    lessonRows,
    teacherInsights: insights.filter((i) => i.student_id === student.id),
  };

  return {
    ...base,
    parentInsights: buildParentInsights(student, base, insights),
  };
}

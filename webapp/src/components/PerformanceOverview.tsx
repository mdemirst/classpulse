import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SegmentRatingBar from "./SegmentRatingBar";
import Trend from "./Trend";
import { CHART, tooltipStyle } from "../lib/chartTheme";
import type { LessonRow } from "../lib/studentReportCard";

interface Props {
  overallRating: number | null;
  avgEngagementRating: number | null;
  avgFocusRating: number | null;
  attendancePct: number;
  ratingTrendDelta: number | null;
  lessonRows: LessonRow[];
}

export default function PerformanceOverview({
  overallRating,
  avgEngagementRating,
  avgFocusRating,
  attendancePct,
  ratingTrendDelta,
  lessonRows,
}: Props) {
  const chartData = lessonRows
    .filter((r) => r.engagementRating !== null)
    .map((r, i) => ({
      i,
      rating: r.engagementRating,
      title: r.lesson.title,
      date: new Date(r.lesson.lesson_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  const hasTrend = ratingTrendDelta !== null;

  return (
    <section className="performance-overview section-panel">
      <h2 className="section-hex">Overall performance</h2>
      <div className="segment-ratings-grid">
        <div className="segment-rating-card card glass">
          <SegmentRatingBar label="Overall" rating={overallRating} />
        </div>
        <div className="segment-rating-card card glass">
          <SegmentRatingBar label="Engagement" rating={avgEngagementRating} />
        </div>
        <div className="segment-rating-card card glass">
          <SegmentRatingBar label="Focus" rating={avgFocusRating} />
        </div>
        <div className="segment-rating-card card glass segment-rating-attendance">
          <div className="segment-rating-head">
            <span className="segment-rating-label">Attendance</span>
            <span className="segment-rating-value">{attendancePct}%</span>
          </div>
          <div className="attendance-bar-track">
            <div className="attendance-bar-fill" style={{ width: `${attendancePct}%` }} />
          </div>
        </div>
      </div>
      {hasTrend && (
        <div className="report-trend-row">
          <Trend delta={ratingTrendDelta} threshold={1} />
          <span className="sub"> vs previous lesson (1–5 scale)</span>
        </div>
      )}
      {chartData.length > 1 && (
        <div className="report-sparkline card glass">
          <div className="sub" style={{ marginBottom: 8 }}>Engagement rating across lessons</div>
          <div style={{ height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="i" hide />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, p) => {
                    const row = p?.[0]?.payload;
                    return row ? `${row.title} (${row.date})` : "";
                  }}
                  formatter={(v) => [`${v}/5`, "engagement"]}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke={CHART.series}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: CHART.series }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}

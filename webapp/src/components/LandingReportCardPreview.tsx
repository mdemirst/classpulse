import { Link } from "react-router-dom";
import HexCell from "./HexCell";
import { SegmentTrack } from "./SegmentRatingBar";
import {
  bandAccent,
  bandLabel,
  parentCategoryAccent,
  type ParentInsight,
  type PerformanceBand,
} from "../lib/studentReportCard";
import { fivePointColor } from "../lib/ratingScale";
import { initials } from "../lib/scores";

interface Props {
  studentId: string;
  classroomId: string;
  name: string;
  band: PerformanceBand;
  overallRating: number | null;
  avgEngagementRating: number | null;
  avgFocusRating: number | null;
  parentInsight: ParentInsight | null;
  delay?: number;
}

export default function LandingReportCardPreview({
  studentId,
  classroomId,
  name,
  band,
  overallRating,
  avgEngagementRating,
  avgFocusRating,
  parentInsight,
  delay = 0,
}: Props) {
  const accent = bandAccent(band);
  const ratingColor = fivePointColor(overallRating);
  const insightAccent = parentInsight ? parentCategoryAccent(parentInsight.category) : null;

  return (
    <Link
      to={`/classroom/${classroomId}/student/${studentId}`}
      className="landing-report-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="landing-report-card-top">
        <HexCell size={52} stroke={accent}>
          <span className="landing-report-init">{initials(name)}</span>
        </HexCell>
        <div className="landing-report-meta">
          <div className="landing-report-name">{name}</div>
          <span className="performance-band small" style={{ borderColor: accent, color: accent }}>
            {bandLabel(band)}
          </span>
        </div>
        {overallRating !== null && (
          <div className="landing-report-overall" style={{ color: ratingColor }}>
            {overallRating}<span>/5</span>
          </div>
        )}
      </div>

      <SegmentTrack rating={overallRating} mini ariaLabel={`${name} overall ${overallRating ?? "unrated"} out of 5`} />

      <div className="landing-report-scores">
        <span>Engagement <b style={{ color: fivePointColor(avgEngagementRating) }}>{avgEngagementRating ?? "—"}/5</b></span>
        <span>Focus <b style={{ color: fivePointColor(avgFocusRating) }}>{avgFocusRating ?? "—"}/5</b></span>
      </div>

      {parentInsight && (
        <div className="landing-report-parent" style={{ borderColor: insightAccent ?? undefined }}>
          <span className="landing-report-parent-label" style={{ color: insightAccent ?? undefined }}>
            Parent insight
          </span>
          <p>{parentInsight.body}</p>
        </div>
      )}

      <div className="landing-report-footer">
        <span className="landing-report-no-video">No video</span>
        <span className="landing-report-cta">Full report →</span>
      </div>
    </Link>
  );
}

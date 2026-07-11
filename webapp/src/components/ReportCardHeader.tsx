import HexCell from "./HexCell";
import { SegmentTrack } from "./SegmentRatingBar";
import { bandAccent, bandLabel, type PerformanceBand } from "../lib/studentReportCard";
import { fivePointColor, fivePointLabel } from "../lib/ratingScale";
import { initials } from "../lib/scores";
import type { Classroom, Student } from "../types";

interface Props {
  student: Student;
  classroom: Classroom;
  band: PerformanceBand;
  lessonsTotal: number;
  overallRating: number | null;
}

export default function ReportCardHeader({
  student,
  classroom,
  band,
  lessonsTotal,
  overallRating,
}: Props) {
  const accent = bandAccent(band);
  const ratingColor = fivePointColor(overallRating);

  return (
    <header className="report-card-header card glass">
      <div className="report-card-identity">
        <HexCell size={88} stroke={accent} glow={band === "excelling"}>
          <span className="report-card-init">{initials(student.name)}</span>
        </HexCell>
        <div className="report-card-meta">
          <h1>{student.name}</h1>
          <div className="sub">
            {classroom.name}
            {classroom.grade ? ` · Grade ${classroom.grade}` : ""}
            {classroom.teacher_name ? ` · ${classroom.teacher_name}` : ""}
          </div>
          <div className="report-card-period">
            Report · last {lessonsTotal} lesson{lessonsTotal !== 1 ? "s" : ""} · rated 1–5
          </div>
        </div>
      </div>
      <div className="report-card-band-block">
        <span className={`performance-band ${band}`} style={{ borderColor: accent, color: accent }}>
          {bandLabel(band)}
        </span>
        {overallRating !== null && (
          <div className="report-card-hero-rating">
            <span className="report-card-hero-value" style={{ color: ratingColor }}>
              {overallRating}<span className="segment-rating-denom">/5</span>
            </span>
            <span className="report-card-hero-label" style={{ color: ratingColor }}>
              {fivePointLabel(overallRating)}
            </span>
            <SegmentTrack rating={overallRating} />
          </div>
        )}
      </div>
    </header>
  );
}

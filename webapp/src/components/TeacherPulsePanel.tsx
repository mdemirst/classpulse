import HexCell from "./HexCell";
import Trend from "./Trend";
import { DIM_LABELS, teachingScore } from "../lib/teacherCoaching";
import { DIMENSIONS, dimensionOf, scoreColor } from "../lib/scores";
import type { Lesson } from "../types";

interface Props {
  lesson: Lesson;
  compact?: boolean;
  scoreDelta?: number | null;
  subtitle?: string;
}

export default function TeacherPulsePanel({ lesson, compact, scoreDelta, subtitle }: Props) {
  const score = teachingScore(lesson);
  const color = scoreColor(score);

  if (compact) {
    return (
      <div className="teacher-pulse-panel compact">
        <div className="teacher-pulse-compact-row">
          <HexCell size={72} stroke={color} glow={score != null && score >= 75}>
            <span className="teacher-pulse-score" style={{ color }}>{score ?? "—"}</span>
          </HexCell>
          <div className="teacher-pulse-compact-text">
            <div className="teacher-pulse-label">Teaching score</div>
            <div className="sub">{subtitle ?? "Latest lesson effectiveness"}</div>
            {scoreDelta != null && <Trend delta={scoreDelta} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-pulse-panel">
      <div className="teacher-pulse-header">
        <h2 className="section-hex">Your teaching pulse</h2>
        <div className="sub">{subtitle ?? "How effective this lesson was for your class"}</div>
      </div>
      <div className="teacher-pulse-cluster">
        <div className="hex-satellite top">
          <HexCell size={44} stroke={scoreColor(dimensionOf(lesson, "learning"))}>
            <span className="hex-mini-label">learn</span>
            <span className="hex-mini-val" style={{ color: scoreColor(dimensionOf(lesson, "learning")) }}>
              {dimensionOf(lesson, "learning") ?? "—"}
            </span>
          </HexCell>
        </div>
        <div className="hex-satellite left">
          <HexCell size={44} stroke={scoreColor(dimensionOf(lesson, "efficiency"))}>
            <span className="hex-mini-label">pace</span>
            <span className="hex-mini-val" style={{ color: scoreColor(dimensionOf(lesson, "efficiency")) }}>
              {dimensionOf(lesson, "efficiency") ?? "—"}
            </span>
          </HexCell>
        </div>
        <HexCell size={88} stroke={color} glow={score != null && score >= 75}>
          <span className="teacher-pulse-score large" style={{ color }}>{score ?? "—"}</span>
          <span className="teacher-pulse-score-label">teaching</span>
        </HexCell>
        <div className="hex-satellite right">
          <HexCell size={44} stroke={scoreColor(dimensionOf(lesson, "fun"))}>
            <span className="hex-mini-label">fun</span>
            <span className="hex-mini-val" style={{ color: scoreColor(dimensionOf(lesson, "fun")) }}>
              {dimensionOf(lesson, "fun") ?? "—"}
            </span>
          </HexCell>
        </div>
        <div className="hex-satellite bottom">
          <HexCell size={44} stroke={scoreColor(dimensionOf(lesson, "engagement"))}>
            <span className="hex-mini-label">eng</span>
            <span className="hex-mini-val" style={{ color: scoreColor(dimensionOf(lesson, "engagement")) }}>
              {dimensionOf(lesson, "engagement") ?? "—"}
            </span>
          </HexCell>
        </div>
      </div>
      {scoreDelta != null && (
        <div className="teacher-pulse-trend">
          <Trend delta={scoreDelta} />
          <span className="sub"> vs previous lesson</span>
        </div>
      )}
      <div className="teacher-pulse-legend">
        {DIMENSIONS.map((d) => (
          <span key={d} className="teacher-pulse-legend-item">
            {DIM_LABELS[d]}
          </span>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import HexCell from "./HexCell";
import PulseChart from "./PulseChart";
import DistractionTimeline from "./DistractionTimeline";
import { focusScore } from "../lib/focusScore";
import { scoreColor, initials } from "../lib/scores";
import type { Student, StudentResult } from "../types";

interface Props {
  result: StudentResult;
  student: Student | undefined;
  duration: number;
  highlight?: boolean;
  compact?: boolean;
  onSelect?: () => void;
  selected?: boolean;
  trendDelta?: number | null;
  reportCardHref?: string;
}

export default function StudentHexCard({
  result,
  student,
  duration,
  highlight,
  compact,
  onSelect,
  selected,
  trendDelta,
  reportCardHref,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const name = student?.name ?? "Unknown";
  const events = result.distraction_events?.items ?? [];
  const timeline = result.engagement_timeline?.items ?? [];
  const focus = focusScore(result.engagement_score, events, duration);
  const engColor = scoreColor(result.engagement_score);
  const focusColor = scoreColor(focus);
  const distColor = events.length > 0 ? "var(--serious)" : "var(--border)";

  if (compact) {
    return (
      <button
        type="button"
        className={`student-hex-compact${selected ? " selected" : ""}`}
        onClick={onSelect}
      >
        <HexCell
          size={64}
          stroke={engColor}
          glow={highlight || selected}
          fill={selected ? "rgba(57,135,229,0.15)" : "var(--card)"}
        >
          <div className="hex-compact-inner">
            <span className="hex-compact-init">{initials(name)}</span>
            <span className="hex-compact-score" style={{ color: engColor }}>
              {result.engagement_score ?? "—"}
            </span>
            <span className="hex-compact-name">{name.split(" ")[0]}</span>
          </div>
        </HexCell>
        {trendDelta != null && trendDelta !== 0 && (
          <span className={`hex-compact-trend ${trendDelta > 0 ? "up" : "down"}`}>
            {trendDelta > 0 ? "▲" : "▼"}{Math.abs(trendDelta)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`student-hex-card${highlight ? " highlighted" : ""}${expanded ? " expanded" : ""}`}>
      <button
        type="button"
        className="student-hex-cluster"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="hex-satellite top">
          <HexCell size={40} stroke={focusColor}>
            <span className="hex-mini-label">focus</span>
            <span className="hex-mini-val" style={{ color: focusColor }}>{focus ?? "—"}</span>
          </HexCell>
        </div>
        <div className="hex-satellite left">
          <HexCell size={40} stroke={engColor}>
            <span className="hex-mini-label">eng</span>
            <span className="hex-mini-val" style={{ color: engColor }}>{result.engagement_score ?? "—"}</span>
          </HexCell>
        </div>
        <HexCell size={80} stroke={engColor} glow={(result.engagement_score ?? 0) < 55}>
          <span className="hex-center-init">{initials(name)}</span>
          <span className="hex-center-name">{name.split(" ")[0]}</span>
        </HexCell>
        <div className="hex-satellite right">
          <HexCell size={40} stroke={distColor}>
            <span className="hex-mini-label">dist</span>
            <span className="hex-mini-val" style={{ color: distColor }}>{events.length}</span>
          </HexCell>
        </div>
      </button>

      {expanded && (
        <div className="student-hex-detail">
          {timeline.length > 0 && (
            <PulseChart data={timeline} height={48} compact label="engagement" />
          )}
          <DistractionTimeline events={events} duration={duration} />
          {events.length > 0 && (
            <div className="distraction-tags">
              {events.map((d, i) => (
                <span className="pill kind" key={i} title={d.note}>
                  {d.kind.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
          {result.summary && <p>{result.summary}</p>}
          {result.suggestion && (
            <div className="suggest"><b>Try:</b> {result.suggestion}</div>
          )}
          {reportCardHref && student && (
            <Link to={reportCardHref} className="report-card-link">
              Full report card →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

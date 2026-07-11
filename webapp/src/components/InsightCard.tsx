import { useState } from "react";
import { Link } from "react-router-dom";
import HexCell from "./HexCell";
import { relativeTime } from "../lib/scores";
import {
  categorizeInsight,
  categoryAccent,
  categoryIcon,
  categoryLabel,
  insightActionLabel,
  insightActionPath,
  parseTrendNumbers,
} from "../lib/insightCategory";
import type { Insight } from "../types";

interface Props {
  insight: Insight;
  whoLabel: string;
  animationDelay?: number;
}

export default function InsightCard({ insight, whoLabel, animationDelay = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cat = categorizeInsight(insight);
  const accent = categoryAccent(cat);
  const trends = parseTrendNumbers(insight.text);

  function toggle() {
    setExpanded((e) => !e);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <article
      className={`insight-card ${cat}${expanded ? " expanded" : ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-expanded={expanded}
    >
      <div
        className="insight-card-header"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <div className="insight-card-icon">
          <HexCell size={44} stroke={accent} glow={cat === "alert"}>
            <span className="insight-hex-glyph" style={{ color: accent }}>
              {categoryIcon(cat)}
            </span>
          </HexCell>
        </div>
        <div className="insight-card-body">
          <div className="insight-meta">
            <span className="who" style={{ color: accent }}>{whoLabel}</span>
            <span className="insight-cat-badge" style={{ borderColor: accent, color: accent }}>
              {categoryLabel(cat)}
            </span>
            <span className="badge">{insight.source}</span>
            <span className="sub">{relativeTime(insight.created_at)}</span>
          </div>
          <p className={`insight-summary${expanded ? " full" : ""}`}>{insight.text}</p>
        </div>
        <span className={`insight-chevron${expanded ? " open" : ""}`} aria-hidden>›</span>
      </div>

      {expanded && (
        <div className="insight-card-expand">
          {trends && (
            <div className="insight-trend-row">
              {trends.map((n, i) => (
                <span key={i} className="insight-trend-chip">
                  {i > 0 && <span className="insight-trend-arrow">→</span>}
                  <span style={{ color: accent }}>{n}</span>
                </span>
              ))}
            </div>
          )}
          <Link to={insightActionPath(insight)} className="insight-action">
            {insightActionLabel(insight)} →
          </Link>
        </div>
      )}
    </article>
  );
}

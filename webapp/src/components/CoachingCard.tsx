import { useState } from "react";
import HexCell from "./HexCell";
import { fmtTime } from "../api";
import {
  coachingKindAccent,
  coachingKindIcon,
  coachingKindLabel,
  type CoachingCardData,
} from "../lib/teacherCoaching";

interface Props {
  card: CoachingCardData;
  animationDelay?: number;
}

export default function CoachingCard({ card, animationDelay = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const accent = coachingKindAccent(card.kind);

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
      className={`coaching-card ${card.kind}${expanded ? " expanded" : ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-expanded={expanded}
    >
      <div
        className="coaching-card-header"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <div className="coaching-card-icon">
          <HexCell size={44} stroke={accent} glow={card.kind === "action"}>
            <span className="coaching-hex-glyph" style={{ color: accent }}>
              {coachingKindIcon(card.kind)}
            </span>
          </HexCell>
        </div>
        <div className="coaching-card-body">
          <div className="coaching-meta">
            <span className="coaching-cat-badge" style={{ borderColor: accent, color: accent }}>
              {coachingKindLabel(card.kind)}
            </span>
            {card.studentName && (
              <span className="badge">{card.studentName.split(" ")[0]}</span>
            )}
          </div>
          <div className="coaching-title">{card.title}</div>
          <p className={`coaching-summary${expanded ? " full" : ""}`}>{card.body}</p>
        </div>
        <span className={`coaching-chevron${expanded ? " open" : ""}`} aria-hidden>›</span>
      </div>

      {expanded && card.evidence && (
        <div className="coaching-card-expand">
          {card.evidence.t != null && (
            <span className="coaching-evidence-time">{fmtTime(card.evidence.t)}</span>
          )}
          <p className="coaching-evidence-note">{card.evidence.note}</p>
        </div>
      )}
    </article>
  );
}

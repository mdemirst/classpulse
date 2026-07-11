import { useMemo, useState } from "react";
import CoachingCard from "./CoachingCard";
import type { CoachingCardData, CoachingKind } from "../lib/teacherCoaching";

type Filter = "all" | CoachingKind;

interface Props {
  cards: CoachingCardData[];
  teacherName?: string | null;
  title?: string;
  description?: string;
}

export default function TeacherCoachingSection({
  cards,
  teacherName,
  title,
  description,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c) => c.kind === filter);
  }, [cards, filter]);

  const headerTitle = title ?? (teacherName ? `Coaching for ${teacherName}` : "Your coaching");

  return (
    <section className="teacher-coaching-section">
      <div className="teacher-coaching-header">
        <div>
          <h2 className="section-hex">{headerTitle}</h2>
          <div className="sub section-desc">
            {description ?? "Personalized recommendations to help you teach even better"}
          </div>
        </div>
        <span className="coaching-count">{cards.length} items</span>
      </div>

      <div className="coaching-filters" role="tablist" aria-label="Filter coaching">
        {([
          ["all", "All"],
          ["strength", "Strengths"],
          ["opportunity", "Opportunities"],
          ["action", "Actions"],
        ] as const).map(([f, label]) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`coaching-filter${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="coaching-list">
        {filtered.length === 0 ? (
          <p className="coaching-empty">Strong lesson — no urgent coaching items.</p>
        ) : (
          filtered.map((c, idx) => (
            <CoachingCard key={c.id} card={c} animationDelay={idx * 70} />
          ))
        )}
      </div>
    </section>
  );
}

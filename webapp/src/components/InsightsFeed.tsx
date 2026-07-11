import { useMemo, useState } from "react";
import InsightCard from "./InsightCard";
import type { Classroom, Insight } from "../types";

type Filter = "all" | "student" | "classroom";

interface Props {
  insights: Insight[];
  classrooms: Classroom[];
  studentName: (id: string | null) => string | undefined;
}

export default function InsightsFeed({ insights, classrooms, studentName }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return insights;
    return insights.filter((i) => i.scope === filter);
  }, [insights, filter]);

  function whoLabel(i: Insight): string {
    if (i.scope === "student") return studentName(i.student_id) ?? "Student";
    return classrooms.find((c) => c.id === i.classroom_id)?.name ?? "Classroom";
  }

  return (
    <section className="insights-feed">
      <div className="insights-feed-header">
        <div>
          <h2 className="section-hex">Insights</h2>
          <div className="sub section-desc">Where your attention helps most</div>
        </div>
        <span className="insights-count">{insights.length} insights</span>
      </div>

      <div className="insights-filters" role="tablist" aria-label="Filter insights">
        {(["all", "student", "classroom"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`insights-filter${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "student" ? "Students" : "Teaching"}
          </button>
        ))}
      </div>

      <div className="insights-list">
        {filtered.length === 0 ? (
          <p className="insights-empty">No insights match this filter.</p>
        ) : (
          filtered.map((i, idx) => (
            <InsightCard
              key={i.id}
              insight={i}
              whoLabel={whoLabel(i)}
              animationDelay={idx * 80}
            />
          ))
        )}
      </div>
    </section>
  );
}

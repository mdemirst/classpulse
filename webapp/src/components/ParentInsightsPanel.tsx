import HexCell from "./HexCell";
import {
  parentCategoryAccent,
  parentCategoryIcon,
  parentCategoryLabel,
  type ParentInsight,
} from "../lib/studentReportCard";

interface Props {
  insights: ParentInsight[];
  studentName: string;
}

export default function ParentInsightsPanel({ insights, studentName }: Props) {
  const firstName = studentName.split(" ")[0];

  return (
    <section className="parent-insights-panel section-panel">
      <div className="parent-insights-header">
        <div>
          <h2 className="section-hex">Insights for parents</h2>
          <div className="sub section-desc">
            Share-ready summary for {firstName}&apos;s family — no classroom footage included
          </div>
        </div>
        <button
          type="button"
          className="print-report-btn"
          onClick={() => window.print()}
        >
          Print report
        </button>
      </div>

      <div className="parent-insights-list">
        {insights.length === 0 ? (
          <p className="parent-insights-empty">
            {firstName} had a steady week — check back after more lessons for family insights.
          </p>
        ) : (
          insights.map((ins, idx) => {
            const accent = parentCategoryAccent(ins.category);
            return (
              <article
                key={ins.id}
                className={`parent-insight-card ${ins.category}`}
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="parent-insight-icon">
                  <HexCell size={44} stroke={accent}>
                    <span className="parent-insight-glyph" style={{ color: accent }}>
                      {parentCategoryIcon(ins.category)}
                    </span>
                  </HexCell>
                </div>
                <div className="parent-insight-body">
                  <span
                    className="parent-insight-cat"
                    style={{ borderColor: accent, color: accent }}
                  >
                    {parentCategoryLabel(ins.category)}
                  </span>
                  <div className="parent-insight-title">{ins.title}</div>
                  <p className="parent-insight-text">{ins.body}</p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

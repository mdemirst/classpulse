import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import RatingCell from "./RatingCell";
import type { LessonRow } from "../lib/studentReportCard";

interface Props {
  rows: LessonRow[];
}

export default function LessonHistoryTable({ rows }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="lesson-history-section section-panel">
      <h2 className="section-hex">Lesson history</h2>
      <div className="sub section-desc">Per-lesson ratings (1–5) — no classroom footage</div>
      <div className="lesson-history-table-wrap card glass">
        <table className="lesson-history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Lesson</th>
              <th>Engagement</th>
              <th>Focus</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lesson, result, engagementRating, focusRating }) => {
              const present = result?.present ?? false;
              const isOpen = expanded === lesson.id;
              return (
                <Fragment key={lesson.id}>
                  <tr
                    className={result?.summary ? "clickable" : ""}
                    onClick={() => {
                      if (result?.summary) {
                        setExpanded(isOpen ? null : lesson.id);
                      }
                    }}
                  >
                    <td>
                      {new Date(lesson.lesson_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <Link
                        to={`/lesson/${lesson.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lesson.title}
                      </Link>
                    </td>
                    <td className="rating-cell">
                      {present ? <RatingCell rating={engagementRating} /> : "—"}
                    </td>
                    <td className="rating-cell">
                      {present ? <RatingCell rating={focusRating} /> : "—"}
                    </td>
                    <td>
                      <span className={`attendance-pill${present ? " present" : ""}`}>
                        {present ? "Present" : "Absent"}
                      </span>
                    </td>
                  </tr>
                  {isOpen && result?.summary && (
                    <tr className="lesson-history-detail">
                      <td colSpan={5}>{result.summary}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

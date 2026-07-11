import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtTime, row, rows } from "../api";
import type { Classroom, Lesson, Student, StudentResult } from "../types";

function scoreColor(score: number | null): string {
  if (score === null) return "var(--ink-3)";
  if (score >= 75) return "var(--good)";
  if (score >= 55) return "var(--warning)";
  return "var(--critical)";
}

export default function LessonPage() {
  const { id } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    row<Lesson>("lessons", id)
      .then(async (l) => {
        setLesson(l);
        const [c, r, s] = await Promise.all([
          row<Classroom>("classrooms", l.classroom_id),
          rows<StudentResult>("student_results", `lesson_id=eq.${l.id}`),
          rows<Student>("students", `classroom_id=eq.${l.classroom_id}`),
        ]);
        setClassroom(c); setResults(r); setStudents(s);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!lesson) return <div className="loading">Loading lesson…</div>;

  const nameOf = (sid: string | null) =>
    students.find((s) => s.id === sid)?.name ?? "Unknown student";
  const timeline = lesson.engagement_timeline?.items ?? [];
  const highlights = lesson.highlights?.items ?? [];
  const present = results.filter((r) => r.present);
  const sortedResults = results.slice().sort(
    (a, b) => (a.engagement_score ?? -1) - (b.engagement_score ?? -1)
  );

  return (
    <>
      <div className="crumb"><Link to="/">← All classrooms</Link></div>
      <h1>{lesson.title}</h1>
      <div className="sub">
        {classroom?.name} · {classroom?.teacher_name} ·{" "}
        {new Date(lesson.lesson_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        {lesson.duration_sec ? ` · ${Math.round(lesson.duration_sec / 60)} min` : ""}
      </div>

      <h2>Lesson scores</h2>
      <div className="statrow">
        {(lesson.class_scores?.items ?? []).map((s) => (
          <div className="stat" key={s.dimension}>
            <div className="label">{s.dimension}</div>
            <div className="value" style={{ color: scoreColor(s.score) }}>{s.score}</div>
            <details>
              <summary>evidence</summary>
              <ul>
                {s.evidence.map((e, i) => (
                  <li key={i}><b>{fmtTime(e.t)}</b> — {e.note}</li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>

      {timeline.length > 0 && (
        <>
          <h2>Class pulse</h2>
          <div className="card" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 16, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#3a3a38" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="t" tickFormatter={fmtTime} stroke="#8a897f" fontSize={12} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#8a897f" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#242423", border: "1px solid #3a3a38", borderRadius: 8 }}
                  labelFormatter={(t) => `at ${fmtTime(Number(t))}`}
                  formatter={(v) => [`${v}`, "engagement"]}
                />
                <Line type="monotone" dataKey="score" stroke="#3987e5" strokeWidth={2} dot={false} isAnimationActive={false} />
                {highlights.map((h, i) => {
                  const nearest = timeline.reduce((a, b) =>
                    Math.abs(b.t - h.t) < Math.abs(a.t - h.t) ? b : a);
                  return (
                    <ReferenceDot key={i} x={nearest.t} y={nearest.score} r={5}
                      fill="#fab219" stroke="#1a1a19" strokeWidth={2} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {highlights.length > 0 && (
            <div className="sub" style={{ marginTop: 8 }}>
              {highlights.map((h, i) => (
                <div key={i}>● {fmtTime(h.t)} — {h.note}</div>
              ))}
            </div>
          )}
        </>
      )}

      <h2>Attendance ({present.length}/{results.length || students.length})</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {results.map((r) => (
          <span className={`pill ${r.present ? "present" : "absent"}`} key={r.id}>
            {nameOf(r.student_id)}{r.present ? "" : " · absent"}
          </span>
        ))}
      </div>

      <h2>Students</h2>
      <div className="grid cols-3">
        {sortedResults.filter((r) => r.present).map((r) => (
          <div className="card student-card" key={r.id}>
            <div className="head">
              <span className="name">{nameOf(r.student_id)}</span>
              <span className="big" style={{ color: scoreColor(r.engagement_score) }}>
                {r.engagement_score ?? "—"}
              </span>
            </div>
            {(r.distraction_events?.items ?? []).length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.distraction_events!.items.map((d, i) => (
                  <span className="pill kind" key={i} title={d.note}>
                    {d.kind.replace("_", " ")} @ {fmtTime(d.t_start)}
                  </span>
                ))}
              </div>
            )}
            {r.summary && <p>{r.summary}</p>}
            {r.suggestion && (
              <div className="suggest"><b>Try:</b> {r.suggestion}</div>
            )}
          </div>
        ))}
      </div>

      {lesson.notes_md && (
        <>
          <h2>Lesson notes</h2>
          <div className="notes">{lesson.notes_md.replace(/^#+\s*/gm, "").replace(/\*\*/g, "")}</div>
        </>
      )}
    </>
  );
}

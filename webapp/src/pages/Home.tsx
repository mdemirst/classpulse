import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { rows } from "../api";
import type { Classroom, Insight, Lesson, Student } from "../types";

function engagementOf(lesson: Lesson): number | null {
  const item = lesson.class_scores?.items.find((s) => s.dimension === "engagement");
  return item ? item.score : null;
}

function Trend({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta > 2) return <span className="trend-up">▲ +{delta}</span>;
  if (delta < -2) return <span className="trend-down">▼ {delta}</span>;
  return <span className="trend-flat">— steady</span>;
}

export default function Home() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      rows<Classroom>("classrooms"),
      rows<Lesson>("lessons", "order=lesson_date.asc&status=eq.done"),
      rows<Insight>("insights", "order=created_at.desc"),
      rows<Student>("students"),
    ])
      .then(([c, l, i, s]) => { setClassrooms(c); setLessons(l); setInsights(i); setStudents(s); })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!classrooms.length) return <div className="loading">Taking the classroom's pulse…</div>;

  const studentName = (id: string | null) => students.find((s) => s.id === id)?.name;

  return (
    <>
      <h1>Your classrooms</h1>
      <div className="sub">This week's pulse, from analyzed lessons</div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        {classrooms.map((c) => {
          const clsLessons = lessons.filter((l) => l.classroom_id === c.id);
          const scores = clsLessons
            .map((l) => ({ title: l.title, score: engagementOf(l) }))
            .filter((x) => x.score !== null) as { title: string; score: number }[];
          const latest = scores.at(-1)?.score ?? null;
          const prev = scores.at(-2)?.score ?? null;
          return (
            <div className="card" key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="sub">{c.teacher_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{latest ?? "—"}</div>
                  <div style={{ fontSize: 12 }}>
                    <Trend delta={latest !== null && prev !== null ? latest - prev : null} />
                  </div>
                </div>
              </div>
              <div style={{ height: 46, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scores}>
                    <Line type="monotone" dataKey="score" stroke="#3987e5" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 10 }}>
                {clsLessons.slice().reverse().map((l) => (
                  <Link to={`/lesson/${l.id}`} className="lesson-row" key={l.id}>
                    <span>{l.title}</span>
                    <span>
                      <span className="sub" style={{ marginRight: 10 }}>
                        {new Date(l.lesson_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <span className="score-num">{engagementOf(l) ?? "—"}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <h2>Insights — where your attention helps most</h2>
      {insights.map((i) => (
        <div className="insight" key={i.id}>
          <span className="who">
            {i.scope === "student" ? studentName(i.student_id) ?? "Student" :
              classrooms.find((c) => c.id === i.classroom_id)?.name ?? "Classroom"}
          </span>
          <span>{i.text}</span>
        </div>
      ))}
    </>
  );
}

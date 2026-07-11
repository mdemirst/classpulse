import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tooltip, XAxis, YAxis } from "recharts";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import HexRadar from "../components/HexRadar";
import HexStat from "../components/HexStat";
import InsightsFeed from "../components/InsightsFeed";
import Trend from "../components/Trend";
import { rows } from "../api";
import { CHART, tooltipStyle } from "../lib/chartTheme";
import { teachingScore } from "../lib/teacherCoaching";
import { engagementOf, scoreColor, trendDelta } from "../lib/scores";
import type { Classroom, Insight, Lesson, Student } from "../types";

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
  const allEngagements = lessons
    .map(engagementOf)
    .filter((s): s is number => s !== null);
  const avgEngagement = allEngagements.length
    ? Math.round(allEngagements.reduce((a, b) => a + b, 0) / allEngagements.length)
    : null;

  return (
    <>
      <div className="hex-stats-row">
        <HexStat label="Avg engagement" value={avgEngagement ?? "—"} score={avgEngagement} />
        <HexStat label="Lessons" value={lessons.length} />
        <HexStat label="Students" value={students.length} />
        <HexStat label="Classrooms" value={classrooms.length} />
      </div>

      <h1>Your classrooms</h1>
      <div className="sub">This week's pulse, from analyzed lessons</div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        {classrooms.map((c) => {
          const clsLessons = lessons.filter((l) => l.classroom_id === c.id);
          const scores = clsLessons
            .map((l) => ({ title: l.title, score: engagementOf(l), lesson: l }))
            .filter((x) => x.score !== null) as { title: string; score: number; lesson: Lesson }[];
          const latest = scores.at(-1)?.score ?? null;
          const prev = scores.at(-2)?.score ?? null;
          const latestLesson = clsLessons.at(-1);
          const teachScore = latestLesson ? teachingScore(latestLesson) : null;

          return (
            <Link to={`/classroom/${c.id}`} className="card glass classroom-card" key={c.id}>
              <div className="classroom-card-head">
                <div>
                  <div className="classroom-name">{c.name}</div>
                  <div className="sub">{c.teacher_name}{c.grade ? ` · Grade ${c.grade}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="sub" style={{ fontSize: 11 }}>engagement</div>
                  <div className="score-display" style={{ color: scoreColor(latest) }}>
                    {latest ?? "—"}
                  </div>
                  <Trend delta={trendDelta(latest, prev)} />
                </div>
              </div>

              {latestLesson && <HexRadar lesson={latestLesson} compact showEvidence={false} />}

              {teachScore != null && (
                <div className="teaching-score-teaser">
                  <span className="sub">Teaching score</span>
                  <span className="teaching-score-val" style={{ color: scoreColor(teachScore) }}>
                    {teachScore}
                  </span>
                </div>
              )}

              <div style={{ height: 48, marginTop: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scores} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <XAxis dataKey="title" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.title ?? ""}
                      formatter={(v) => [`${v}`, "engagement"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={CHART.series}
                      strokeWidth={2}
                      dot={{ r: 2, fill: CHART.series }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: 8 }}>
                {clsLessons.slice().reverse().slice(0, 3).map((l) => (
                  <div className="lesson-row" key={l.id} onClick={(e) => e.stopPropagation()}>
                    <Link to={`/lesson/${l.id}`}>{l.title}</Link>
                    <span>
                      <span className="sub" style={{ marginRight: 10 }}>
                        {new Date(l.lesson_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <span className="score-num" style={{ color: scoreColor(engagementOf(l)) }}>
                        {engagementOf(l) ?? "—"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <InsightsFeed
        insights={insights}
        classrooms={classrooms}
        studentName={studentName}
      />
    </>
  );
}

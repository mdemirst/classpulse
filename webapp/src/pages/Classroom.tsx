import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import HexStat from "../components/HexStat";
import HoneycombGrid from "../components/HoneycombGrid";
import PulseChart from "../components/PulseChart";
import StudentHexCard from "../components/StudentHexCard";
import TeacherCoachingSection from "../components/TeacherCoachingSection";
import TeacherPulsePanel from "../components/TeacherPulsePanel";
import Trend from "../components/Trend";
import { rows, row } from "../api";
import { CHART, axisProps, tooltipStyle } from "../lib/chartTheme";
import { classroomCoachingProfile } from "../lib/teacherCoaching";
import {
  DIMENSIONS, dimensionOf, engagementOf as lessonEngagement,
  scoreColor, trendDelta,
} from "../lib/scores";
import type { Classroom, Insight, Lesson, Student, StudentResult } from "../types";

export default function ClassroomPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    row<Classroom>("classrooms", id)
      .then(async (c) => {
        setClassroom(c);
        const [l, s, r, ins] = await Promise.all([
          rows<Lesson>("lessons", `classroom_id=eq.${id}&order=lesson_date.asc&status=eq.done`),
          rows<Student>("students", `classroom_id=eq.${id}`),
          rows<StudentResult>("student_results"),
          rows<Insight>("insights", `classroom_id=eq.${id}`),
        ]);
        const lessonIds = new Set(l.map((x) => x.id));
        setLessons(l);
        setStudents(s);
        setResults(r.filter((x) => lessonIds.has(x.lesson_id)));
        setInsights(ins);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  const lessonChartData = useMemo(() =>
    lessons.map((l) => ({
      name: new Date(l.lesson_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      lessonId: l.id,
      engagement: dimensionOf(l, "engagement"),
      learning: dimensionOf(l, "learning"),
      efficiency: dimensionOf(l, "efficiency"),
      fun: dimensionOf(l, "fun"),
    })),
  [lessons]);

  const studentTrends = useMemo(() => {
    return students.map((student) => {
      const studentResults = lessons.map((lesson) => {
        const r = results.find((x) => x.lesson_id === lesson.id && x.student_id === student.id);
        return { lesson, result: r, score: r?.engagement_score ?? null };
      });
      const scores = studentResults.map((x) => x.score).filter((s): s is number => s !== null);
      const latest = scores.at(-1) ?? null;
      const prev = scores.at(-2) ?? null;
      const delta = latest !== null && prev !== null ? latest - prev : null;
      return { student, studentResults, latest, delta };
    });
  }, [students, lessons, results]);

  const coachingProfile = useMemo(() => {
    if (!classroom) {
      return { cards: [], scoreTrend: [], latestScore: null, scoreDelta: null };
    }
    const resolveName = (sid: string | null) =>
      students.find((s) => s.id === sid)?.name ?? "Student";
    return classroomCoachingProfile(lessons, results, insights, classroom.id, resolveName);
  }, [classroom, lessons, results, insights, students]);

  if (error) return <div className="error">{error}</div>;
  if (!classroom) return <div className="loading">Loading classroom…</div>;

  const latestLesson = lessons.at(-1);
  const latestEng = latestLesson ? lessonEngagement(latestLesson) : null;
  const prevEng = lessons.length > 1 ? lessonEngagement(lessons.at(-2)!) : null;

  return (
    <>
      <div className="crumb"><Link to="/">← All classrooms</Link></div>
      <h1>{classroom.name}</h1>
      <div className="sub">
        {classroom.teacher_name}
        {classroom.grade ? ` · Grade ${classroom.grade}` : ""}
        {" · "}{lessons.length} lessons
      </div>

      <div className="hex-stats-row compact">
        <HexStat label="Latest engagement" value={latestEng ?? "—"} score={latestEng} />
        <HexStat label="Students" value={students.length} />
        <div className="hex-stat-trend">
          <Trend delta={trendDelta(latestEng, prevEng)} />
        </div>
      </div>

      {latestLesson && (
        <section className="section-panel teacher-coaching-block">
          <div className="teacher-classroom-arc">
            <TeacherPulsePanel
              lesson={latestLesson}
              compact
              scoreDelta={coachingProfile.scoreDelta}
              subtitle={`${classroom.teacher_name ?? "Your"} teaching arc`}
            />
            {coachingProfile.scoreTrend.length > 1 && (
              <div className="teacher-score-sparkline card glass">
                <div className="sub" style={{ marginBottom: 8 }}>Teaching score over lessons</div>
                <div style={{ height: 72 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={coachingProfile.scoreTrend.map((x, i) => ({
                      i, score: x.score, title: x.title,
                    }))}>
                      <XAxis dataKey="i" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ""}
                        formatter={(v) => [`${v}`, "teaching score"]}
                      />
                      <Line type="monotone" dataKey="score" stroke={CHART.series}
                        strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
          <TeacherCoachingSection
            cards={coachingProfile.cards}
            teacherName={classroom.teacher_name}
            description="Cross-lesson patterns and personalized recommendations"
          />
        </section>
      )}

      <h2 className="section-hex">Roster</h2>
      <div className="sub section-desc">Click a student to open their report card</div>
      <HoneycombGrid className="roster-honeycomb">
        {studentTrends.map(({ student, latest, delta, studentResults }, i) => {
          const latestResult = studentResults.at(-1)?.result;
          return (
            <div key={student.id} className="honeycomb-item" style={{ animationDelay: `${i * 35}ms` }}>
              <StudentHexCard
                compact
                result={latestResult ?? {
                  id: student.id,
                  lesson_id: "",
                  student_id: student.id,
                  track_id: null,
                  present: true,
                  match_confidence: 0,
                  engagement_score: latest,
                  engagement_timeline: null,
                  distraction_events: null,
                  clip_object_id: null,
                  thumbnail_object_id: null,
                  summary: null,
                  suggestion: null,
                }}
                student={student}
                duration={lessons.at(-1)?.duration_sec ?? 1800}
                onSelect={() => navigate(`/classroom/${id}/student/${student.id}`)}
                trendDelta={delta}
              />
            </div>
          );
        })}
      </HoneycombGrid>

      <h2 className="section-hex">Lesson history</h2>
      <div className="card glass" style={{ height: 260, padding: "12px 8px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={lessonChartData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis domain={[0, 100]} {...axisProps} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {DIMENSIONS.map((d, i) => (
              <Bar key={d} dataKey={d} fill={[CHART.series, "#0ca30c", "#fab219", "#ec835a"][i]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="lesson-links">
        {lessons.map((l) => (
          <Link to={`/lesson/${l.id}`} className="lesson-row card glass" key={l.id}>
            <span>{l.title}</span>
            <span className="score-num" style={{ color: scoreColor(lessonEngagement(l)) }}>
              {lessonEngagement(l) ?? "—"}
            </span>
          </Link>
        ))}
      </div>

      {latestLesson && latestLesson.engagement_timeline?.items.length && (
        <>
          <h2 className="section-hex">Latest class pulse</h2>
          <PulseChart
            data={latestLesson.engagement_timeline.items}
            highlights={latestLesson.highlights?.items ?? []}
          />
        </>
      )}
    </>
  );
}

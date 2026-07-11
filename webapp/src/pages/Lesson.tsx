import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DistractionTimeline from "../components/DistractionTimeline";
import HexCell from "../components/HexCell";
import HexRadar from "../components/HexRadar";
import HoneycombGrid from "../components/HoneycombGrid";
import PulseChart from "../components/PulseChart";
import StudentHexCard from "../components/StudentHexCard";
import TeacherCoachingSection from "../components/TeacherCoachingSection";
import TeacherPulsePanel from "../components/TeacherPulsePanel";
import TranscriptPanel from "../components/TranscriptPanel";
import { fmtTime, row, rows } from "../api";
import { lessonCoachingCards, teachingScore } from "../lib/teacherCoaching";
import { initials } from "../lib/scores";
import type { Classroom, Lesson, Student, StudentResult } from "../types";

export default function LessonPage() {
  const { id } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classroomLessons, setClassroomLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    row<Lesson>("lessons", id)
      .then(async (l) => {
        setLesson(l);
        const [c, r, s, clsLessons] = await Promise.all([
          row<Classroom>("classrooms", l.classroom_id),
          rows<StudentResult>("student_results", `lesson_id=eq.${l.id}`),
          rows<Student>("students", `classroom_id=eq.${l.classroom_id}`),
          rows<Lesson>("lessons", `classroom_id=eq.${l.classroom_id}&order=lesson_date.asc&status=eq.done`),
        ]);
        setClassroom(c); setResults(r); setStudents(s); setClassroomLessons(clsLessons);
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
  const duration = lesson.duration_sec ?? 1800;
  const allDistractions = results.flatMap((r) => r.distraction_events?.items ?? []);
  const sortedResults = results
    .filter((r) => r.present)
    .slice()
    .sort((a, b) => (a.engagement_score ?? -1) - (b.engagement_score ?? -1));

  const lessonIdx = classroomLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIdx > 0 ? classroomLessons[lessonIdx - 1] : null;
  const scoreDelta = prevLesson
    ? (teachingScore(lesson) ?? 0) - (teachingScore(prevLesson) ?? 0)
    : null;
  const coachingCards = lessonCoachingCards(lesson, results, nameOf);

  return (
    <>
      <div className="crumb">
        <Link to="/">← All classrooms</Link>
        {classroom && (
          <> · <Link to={`/classroom/${classroom.id}`}>{classroom.name}</Link></>
        )}
      </div>

      <div className="lesson-hero">
        <div className="lesson-hero-text">
          <h1>{lesson.title}</h1>
          <div className="sub">
            {classroom?.name} · {classroom?.teacher_name} ·{" "}
            {new Date(lesson.lesson_date).toLocaleDateString(undefined, {
              weekday: "long", month: "long", day: "numeric",
            })}
            {lesson.duration_sec ? ` · ${Math.round(lesson.duration_sec / 60)} min` : ""}
          </div>
        </div>
        <div className="lesson-hero-radar card glass">
          <HexRadar lesson={lesson} />
        </div>
      </div>

      <section className="section-panel teacher-coaching-block">
        <TeacherPulsePanel
          lesson={lesson}
          scoreDelta={scoreDelta}
          subtitle={`Coaching for ${classroom?.teacher_name ?? "you"} — this lesson`}
        />
        <TeacherCoachingSection
          cards={coachingCards}
          teacherName={classroom?.teacher_name}
          description="Strengths to keep, gaps to address, and student-specific actions"
        />
      </section>

      {timeline.length > 0 && (
        <section className="section-panel">
          <h2 className="section-hex">Class pulse</h2>
          <PulseChart
            data={timeline}
            highlights={highlights}
            distractions={allDistractions}
          />
          <div className="chart-legend">
            <span><i className="dot series" /> Engagement</span>
            <span><i className="dot highlight" /> Highlights</span>
            <span><i className="dot distraction" /> Distractions</span>
          </div>
          {highlights.length > 0 && (
            <div className="sub" style={{ marginTop: 8 }}>
              {highlights.map((h, i) => (
                <div key={i}>● {fmtTime(h.t)} — {h.note}</div>
              ))}
            </div>
          )}
          <h3 className="section-sub">Distraction density</h3>
          <DistractionTimeline events={allDistractions} duration={duration} height={14} />
        </section>
      )}

      <h2 className="section-hex">Attendance ({present.length}/{results.length || students.length})</h2>
      <div className="attendance-hex-row">
        {results.map((r) => {
          const name = nameOf(r.student_id);
          return (
            <div className="attendance-hex" key={r.id} title={name}>
              <HexCell
                size={52}
                stroke={r.present ? "var(--good)" : "var(--border)"}
                fill={r.present ? "rgba(12,163,12,0.08)" : "var(--card)"}
              >
                <span className="attendance-hex-init">{initials(name)}</span>
              </HexCell>
              <span className="attendance-hex-name">{name.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      <h2 className="section-hex">Students</h2>
      <div className="sub section-desc">Needs attention first — click a hex to expand</div>
      <HoneycombGrid>
        {sortedResults.map((r, i) => (
          <div key={r.id} className="honeycomb-item" style={{ animationDelay: `${i * 40}ms` }}>
            <StudentHexCard
              result={r}
              student={students.find((s) => s.id === r.student_id)}
              duration={duration}
              highlight={(r.engagement_score ?? 100) < 55}
              reportCardHref={
                classroom && r.student_id
                  ? `/classroom/${classroom.id}/student/${r.student_id}`
                  : undefined
              }
            />
          </div>
        ))}
      </HoneycombGrid>

      {lesson.notes_md && (
        <section className="section-panel">
          <h2 className="section-hex">Lesson notes</h2>
          <div className="notes">{lesson.notes_md.replace(/^#+\s*/gm, "").replace(/\*\*/g, "")}</div>
        </section>
      )}

      <TranscriptPanel transcript={lesson.transcript} />
    </>
  );
}

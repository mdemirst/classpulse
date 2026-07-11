import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LessonHistoryTable from "../components/LessonHistoryTable";
import ParentInsightsPanel from "../components/ParentInsightsPanel";
import PerformanceOverview from "../components/PerformanceOverview";
import ReportCardHeader from "../components/ReportCardHeader";
import { row, rows } from "../api";
import { buildStudentReportProfile } from "../lib/studentReportCard";
import type { Classroom, Insight, Lesson, Student, StudentResult } from "../types";

export default function StudentReport() {
  const { classroomId, studentId } = useParams();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classroomId || !studentId) return;
    Promise.all([
      row<Classroom>("classrooms", classroomId),
      row<Student>("students", studentId),
      rows<Lesson>("lessons", `classroom_id=eq.${classroomId}&order=lesson_date.asc&status=eq.done`),
      rows<StudentResult>("student_results", `student_id=eq.${studentId}`),
      rows<Insight>("insights", `student_id=eq.${studentId}`),
    ])
      .then(([c, s, l, r, i]) => {
        if (s.classroom_id !== classroomId) {
          throw new Error("Student not found in this classroom");
        }
        setClassroom(c);
        setStudent(s);
        setLessons(l);
        setResults(r);
        setInsights(i);
      })
      .catch((e) => setError(String(e)));
  }, [classroomId, studentId]);

  const profile = useMemo(() => {
    if (!student || !classroom) return null;
    return buildStudentReportProfile(student, classroom, lessons, results, insights);
  }, [student, classroom, lessons, results, insights]);

  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div className="loading">Loading report card…</div>;

  return (
    <div className="report-card-page">
      <div className="crumb no-print">
        <Link to="/">← All classrooms</Link>
        {" · "}
        <Link to={`/classroom/${classroomId}`}>{profile.classroom.name}</Link>
        {" · "}
        <span>{profile.student.name}</span>
      </div>

      <ReportCardHeader
        student={profile.student}
        classroom={profile.classroom}
        band={profile.performanceBand}
        lessonsTotal={profile.lessonsTotal}
        overallRating={profile.overallRating}
      />

      <PerformanceOverview
        overallRating={profile.overallRating}
        avgEngagementRating={profile.avgEngagementRating}
        avgFocusRating={profile.avgFocusRating}
        attendancePct={profile.attendancePct}
        ratingTrendDelta={profile.ratingTrendDelta}
        lessonRows={profile.lessonRows}
      />

      <LessonHistoryTable rows={profile.lessonRows} />

      <ParentInsightsPanel
        insights={profile.parentInsights}
        studentName={profile.student.name}
      />
    </div>
  );
}

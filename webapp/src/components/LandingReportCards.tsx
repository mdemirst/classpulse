import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LandingReportCardPreview from "./LandingReportCardPreview";
import { rows } from "../api";
import { buildStudentReportProfile } from "../lib/studentReportCard";
import type { Classroom, Insight, Lesson, Student, StudentResult } from "../types";

const DEMO_CLASSROOM_ID = "1e7ad7b2-3a3f-4f99-8bf4-0a9e4578e2cf";

export default function LandingReportCards() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [profiles, setProfiles] = useState<ReturnType<typeof buildStudentReportProfile>[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      rows<Classroom>("classrooms", `id=eq.${DEMO_CLASSROOM_ID}`),
      rows<Student>("students", `classroom_id=eq.${DEMO_CLASSROOM_ID}&order=name.asc`),
      rows<Lesson>("lessons", `classroom_id=eq.${DEMO_CLASSROOM_ID}&order=lesson_date.asc&status=eq.done`),
      rows<StudentResult>("student_results"),
      rows<Insight>("insights", `classroom_id=eq.${DEMO_CLASSROOM_ID}`),
    ])
      .then(([classrooms, students, lessons, allResults, insights]) => {
        const c = classrooms[0];
        if (!c) throw new Error("Demo classroom not found");
        const lessonIds = new Set(lessons.map((l) => l.id));
        const results = allResults.filter((r) => lessonIds.has(r.lesson_id));
        const built = students.map((student) =>
          buildStudentReportProfile(student, c, lessons, results, insights),
        );
        setClassroom(c);
        setProfiles(built);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const sorted = useMemo(
    () => [...profiles].sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0)),
    [profiles],
  );

  return (
    <section className="landing-report-section">
      <div className="landing-report-header">
        <h2 className="landing-report-title">Student report cards</h2>
        <p className="landing-report-lead">
          Overall performance & parent insights for every student — ratings only, no classroom footage
        </p>
        {classroom && (
          <div className="landing-report-class">
            Demo · {classroom.name}
            {classroom.grade ? ` · Grade ${classroom.grade}` : ""}
          </div>
        )}
      </div>

      {error && <p className="landing-report-error">{error}</p>}
      {!error && !profiles.length && (
        <p className="landing-report-loading">Loading report cards…</p>
      )}

      <div className="landing-report-grid">
        {sorted.map((profile, i) => (
          <LandingReportCardPreview
            key={profile.student.id}
            studentId={profile.student.id}
            classroomId={DEMO_CLASSROOM_ID}
            name={profile.student.name}
            band={profile.performanceBand}
            overallRating={profile.overallRating}
            avgEngagementRating={profile.avgEngagementRating}
            avgFocusRating={profile.avgFocusRating}
            parentInsight={profile.parentInsights[0] ?? null}
            delay={i * 60}
          />
        ))}
      </div>

      <div className="landing-report-actions">
        <Link to={`/classroom/${DEMO_CLASSROOM_ID}`} className="landing-cta secondary">
          View classroom
        </Link>
        <Link to="/dashboard" className="landing-cta primary">
          Open dashboard
        </Link>
      </div>
    </section>
  );
}

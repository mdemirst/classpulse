import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fmtTime, getDownloadUrl, row, rows } from "../api";
import ClipTimeline from "../components/ClipTimeline";
import { scoreColor } from "../lib/scores";
import type { Classroom, Lesson, Student, StudentResult } from "../types";

export default function Studio() {
  const { id } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const lessonVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;
    row<Lesson>("lessons", id)
      .then(async (l) => {
        setLesson(l);
        if (l.video_object_id) {
          getDownloadUrl(l.video_object_id).then(setLessonUrl).catch(() => {});
        }
        const [c, r, s] = await Promise.all([
          row<Classroom>("classrooms", l.classroom_id),
          rows<StudentResult>("student_results", `lesson_id=eq.${l.id}`),
          rows<Student>("students", `classroom_id=eq.${l.classroom_id}`),
        ]);
        setClassroom(c);
        setStudents(s);
        const present = r
          .filter((x) => x.clip_object_id)
          .sort((a, b) => (a.engagement_score ?? 999) - (b.engagement_score ?? 999));
        setResults(present.concat(r.filter((x) => !x.clip_object_id)));
        if (present[0]) setSelected(present[0].id);
        const pairs = await Promise.all(
          present
            .filter((x) => x.thumbnail_object_id)
            .map(async (x) => [x.id, await getDownloadUrl(x.thumbnail_object_id!)] as const)
        );
        setThumbs(Object.fromEntries(pairs));
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  const active = useMemo(() => results.find((r) => r.id === selected) ?? null, [results, selected]);

  useEffect(() => {
    setClipUrl(null);
    setCurrentTime(0);
    if (!active?.clip_object_id) return;
    let cancelled = false;
    getDownloadUrl(active.clip_object_id)
      .then((u) => !cancelled && setClipUrl(u))
      .catch((e) => setError(String(e)));
    return () => { cancelled = true; };
  }, [active?.id, active?.clip_object_id]);

  const nameOf = (sid: string | null) =>
    students.find((s) => s.id === sid)?.name ?? "Unknown student";

  /** Scrub the student clip and follow along in the full lesson video. */
  function seek(t: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
    if (lessonVideoRef.current && active) {
      lessonVideoRef.current.currentTime = (active.clip_start_sec ?? 0) + t;
    }
  }

  if (error) return <div className="error">{error}</div>;
  if (!lesson) return <div className="loading">Loading studio…</div>;

  const withClips = results.filter((r) => r.clip_object_id);
  const duration = active?.clip_duration_sec ?? lesson.duration_sec ?? 0;

  return (
    <>
      <div className="crumb">
        <Link to={`/lesson/${lesson.id}`}>← Lesson report</Link>
      </div>
      <h1>{lesson.title} — student clips</h1>
      <div className="sub">
        {classroom?.name} · {withClips.length} students detected and analyzed
      </div>

      <div className="lesson-source">
        <div className="lesson-source-head">
          <span className="section-hex">Full lesson recording</span>
          <span className="sub">source video · every clip below is cropped from it</span>
        </div>
        <div className="lesson-source-video">
          {lessonUrl ? (
            <video ref={lessonVideoRef} src={lessonUrl} controls />
          ) : (
            <div className="loading">Loading lesson video…</div>
          )}
        </div>
      </div>

      {withClips.length === 0 && (
        <div className="notice" style={{ marginTop: 16 }}>
          No per-student clips for this lesson yet. Process a video from the{" "}
          <Link to="/upload">Upload</Link> tab to generate them.
        </div>
      )}

      {withClips.length > 0 && (
        <div className="studio">
          <aside className="studio-list">
            {withClips.map((r) => (
              <button
                key={r.id}
                className={`studio-student ${r.id === selected ? "active" : ""}`}
                onClick={() => setSelected(r.id)}
              >
                {thumbs[r.id] ? (
                  <img src={thumbs[r.id]} alt="" className="studio-thumb" />
                ) : (
                  <div className="studio-thumb placeholder" />
                )}
                <span className="studio-student-meta">
                  <span className="studio-student-name">{nameOf(r.student_id)}</span>
                  <span className="sub">
                    {(r.distraction_events?.items ?? []).length} events
                  </span>
                </span>
                <span
                  className="studio-student-score"
                  style={{ color: scoreColor(r.engagement_score) }}
                >
                  {r.engagement_score ?? "—"}
                </span>
              </button>
            ))}
          </aside>

          <section className="studio-main">
            {active && (
              <>
                <div className="studio-head">
                  <div>
                    <h2 style={{ margin: 0 }}>{nameOf(active.student_id)}</h2>
                    <div className="sub">
                      clip starts at {fmtTime(active.clip_start_sec ?? 0)} of the lesson
                      {active.match_confidence
                        ? ` · face match ${(active.match_confidence * 100).toFixed(0)}%`
                        : ""}
                    </div>
                  </div>
                  <div className="studio-score" style={{ color: scoreColor(active.engagement_score) }}>
                    {active.engagement_score ?? "—"}
                    <span className="sub"> engagement</span>
                  </div>
                </div>

                <div className="studio-video">
                  {clipUrl ? (
                    <video
                      ref={videoRef}
                      src={clipUrl}
                      controls
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    />
                  ) : (
                    <div className="loading">Loading clip…</div>
                  )}
                </div>

                <ClipTimeline
                  duration={duration}
                  currentTime={currentTime}
                  states={active.states?.items ?? []}
                  events={active.distraction_events?.items ?? []}
                  onSeek={seek}
                />

                {(active.distraction_events?.items ?? []).length > 0 && (
                  <div className="studio-events">
                    {active.distraction_events!.items.map((e, i) => (
                      <button key={i} className="studio-event" onClick={() => seek(e.t_start)}>
                        <span className="pill kind">{e.kind.replace("_", " ")}</span>
                        <span className="sub">{fmtTime(e.t_start)}</span>
                        <span>{e.note}</span>
                      </button>
                    ))}
                  </div>
                )}

                {active.summary && <p className="studio-summary">{active.summary}</p>}
                {active.suggestion && (
                  <div className="suggest"><b>Try:</b> {active.suggestion}</div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

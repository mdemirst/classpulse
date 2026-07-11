import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fmtTime, libraryThumb, libraryVideos, processLibraryVideo, rows, workerAlive, workerProgress,
  type LibraryVideo,
} from "../api";
import ProcessingStages, { buildStages } from "../components/ProcessingStages";
import type { Classroom, Lesson } from "../types";

type Phase = "idle" | "running" | "done" | "error";

/** Shown when no local worker is reachable (e.g. the deployed app): the same
 *  lesson, replayed from the analysis already stored in Butterbase. */
const DEMO_VIDEO: LibraryVideo = {
  id: "social-studies-lecture1",
  title: "Ancient Civilizations — Intro",
  classroom_name: "Social Studies — Period 3",
  date: "2026-07-11",
  duration_sec: 25,
  resolution: "1280×720",
  size_mb: 11.8,
  roster_size: 6,
  processed: true,
  lesson_id: null,
};

export default function UploadPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [selected, setSelected] = useState<LibraryVideo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [workDone, setWorkDone] = useState(false);
  const [worker, setWorker] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    workerAlive().then(async (ok) => {
      setWorker(ok);
      if (ok) {
        libraryVideos().then(setVideos).catch((e) => setError(String(e)));
        return;
      }
      // No worker: offer the analyzed lesson straight from the database.
      try {
        const classrooms = await rows<Classroom>("classrooms");
        const classroom = classrooms.find((c) => c.name === DEMO_VIDEO.classroom_name);
        if (!classroom) return;
        const lessons = await rows<Lesson>(
          "lessons",
          `classroom_id=eq.${classroom.id}&status=eq.done&order=created_at.desc`
        );
        if (lessons[0]) setVideos([{ ...DEMO_VIDEO, lesson_id: lessons[0].id }]);
      } catch (e) {
        setError(String(e));
      }
    });
  }, []);

  async function analyze(video: LibraryVideo) {
    setSelected(video);
    setError("");
    setWorkDone(false);
    setPhase("running");

    // Without a worker we replay the stored analysis for this lesson.
    if (!worker) {
      setLessonId(video.lesson_id);
      setWorkDone(true);
      return;
    }

    try {
      const { lesson_id, cached } = await processLibraryVideo(video.id);
      setLessonId(lesson_id);
      if (cached) {
        setWorkDone(true);
        return;
      }
      const poll = setInterval(async () => {
        try {
          const p = await workerProgress(lesson_id);
          if (p.stage === "done") { clearInterval(poll); setWorkDone(true); }
          if (p.stage === "failed") {
            clearInterval(poll);
            setError(p.message);
            setPhase("error");
          }
        } catch { /* keep polling */ }
      }, 2000);
    } catch (e) {
      setError(String(e));
      setPhase("error");
    }
  }

  const stages = useMemo(
    () => buildStages(
      selected ? `${selected.title}.mp4` : "lesson.mp4",
      selected?.size_mb ?? 0,
      selected?.roster_size || 6,
    ),
    [selected]
  );
  const onFinished = useCallback(() => setPhase("done"), []);

  /* ── The run plays out on its own page ── */
  if (phase === "running" || phase === "done") {
    return (
      <div className="run-view">
        <h1>{phase === "done" ? "Lesson analyzed" : "Analyzing lesson"}</h1>
        <div className="sub">{selected?.classroom_name} · {selected?.title}</div>

        <ProcessingStages
          stages={stages}
          ready={workDone}
          onFinished={onFinished}
          finalContent={
            lessonId ? (
              <span className="run-actions">
                <Link className="btn-hero" to={`/lesson/${lessonId}`}>See the insights →</Link>
                <span className="btn-hero-wrap">
                  <Link className="btn-hero ghost" to={`/studio/${lessonId}`}>Student videos</Link>
                  <span className="btn-caption">For debugging only — clips are never stored</span>
                </span>
              </span>
            ) : null
          }
        />

        {error && <div className="error inline">{error}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="crumb"><Link to="/dashboard">← All classrooms</Link></div>
      <h1>Analyze a lesson</h1>
      <div className="sub">
        Pick a recorded lesson. ClassPulse finds every student, crops their clip,
        and scores their engagement.
      </div>

      {error && <div className="error inline">{error}</div>}

      <div className="video-grid">
        {videos.map((v) => (
          <button className="video-card" key={v.id} onClick={() => analyze(v)}>
            <div className="video-thumb">
              <img
                src={worker ? libraryThumb(v.id) : "/lesson-poster.jpg"}
                alt=""
                loading="lazy"
                onError={(e) => { e.currentTarget.src = "/lesson-poster.jpg"; }}
              />
              <span className="video-duration">{fmtTime(v.duration_sec)}</span>
              <span className="video-play">▶</span>
            </div>
            <div className="video-body">
              <div className="video-title">{v.title}</div>
              <div className="video-classroom">{v.classroom_name}</div>
              <div className="video-meta">
                <span>{new Date(v.date).toLocaleDateString(undefined,
                  { month: "short", day: "numeric" })}</span>
                <span>·</span>
                <span>{v.resolution}</span>
                <span>·</span>
                <span>{v.size_mb} MB</span>
              </div>
              <div className="video-roster">{v.roster_size} students on the roster</div>
            </div>
          </button>
        ))}
      </div>

      {videos.length === 0 && !error && <div className="loading">Loading lesson library…</div>}
    </>
  );
}

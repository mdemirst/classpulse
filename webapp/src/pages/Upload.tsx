import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fmtTime, libraryThumb, libraryVideos, processLibraryVideo, workerAlive, workerProgress,
  type LibraryVideo,
} from "../api";
import ProcessingStages, { buildStages } from "../components/ProcessingStages";

type Phase = "idle" | "running" | "done" | "error";

export default function UploadPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [selected, setSelected] = useState<LibraryVideo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [workDone, setWorkDone] = useState(false);
  const [worker, setWorker] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    workerAlive().then((ok) => {
      setWorker(ok);
      if (ok) libraryVideos().then(setVideos).catch((e) => setError(String(e)));
    });
  }, []);

  async function analyze(video: LibraryVideo) {
    setSelected(video);
    setError("");
    setWorkDone(false);
    setPhase("running");
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

        <ProcessingStages stages={stages} ready={workDone} onFinished={onFinished} />

        {phase === "done" && lessonId && (
          <div className="run-actions">
            <Link className="btn-hero" to={`/lesson/${lessonId}`}>See the insights →</Link>
            <Link className="btn-secondary" to={`/studio/${lessonId}`}>Student clips</Link>
          </div>
        )}
        {error && <div className="error inline">{error}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="crumb"><Link to="/">← All classrooms</Link></div>
      <h1>Analyze a lesson</h1>
      <div className="sub">
        Pick a recorded lesson. ClassPulse finds every student, crops their clip,
        and scores their engagement.
      </div>

      {worker === false && (
        <div className="notice warn">
          Worker offline — start it with <code>BUTTERBASE_API_KEY=… ./worker/run.sh</code>, then reload.
        </div>
      )}
      {error && <div className="error inline">{error}</div>}

      <div className="video-grid">
        {videos.map((v) => (
          <button className="video-card" key={v.id} onClick={() => analyze(v)}>
            <div className="video-thumb">
              <img src={libraryThumb(v.id)} alt="" loading="lazy" />
              <span className="video-duration">{fmtTime(v.duration_sec)}</span>
              {v.processed && <span className="video-flag">analyzed</span>}
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
              <div className="video-roster">
                {v.roster_size > 0
                  ? `${v.roster_size} students on the roster`
                  : "no roster — students stay anonymous"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {worker && videos.length === 0 && !error && (
        <div className="loading">Loading lesson library…</div>
      )}
    </>
  );
}

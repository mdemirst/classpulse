import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  findProcessedLesson, hashFile, hasUploadAuth, insertRow, patchRow, row, rows,
  startProcessing, uploadFile, workerAlive, workerProgress,
} from "../api";
import type { Classroom, Lesson } from "../types";

type Phase = "idle" | "hashing" | "cached" | "uploading" | "processing" | "done" | "error";

export default function UploadPage() {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [cached, setCached] = useState<Lesson | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [pct, setPct] = useState(0);
  const [error, setError] = useState("");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [worker, setWorker] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    rows<Classroom>("classrooms").then(setClassrooms).catch((e) => setError(String(e)));
    workerAlive().then(setWorker);
  }, []);

  // poll the worker while it processes
  useEffect(() => {
    if (phase !== "processing" || !lessonId) return;
    const timer = setInterval(async () => {
      try {
        const p = await workerProgress(lessonId);
        setPct(p.progress);
        setMessage(p.message);
        if (p.stage === "done") {
          clearInterval(timer);
          setPhase("done");
        } else if (p.stage === "failed") {
          clearInterval(timer);
          setPhase("error");
          setError(p.message);
        }
      } catch {
        const l = await row<Lesson>("lessons", lessonId).catch(() => null);
        if (l?.status === "done") { clearInterval(timer); setPhase("done"); }
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [phase, lessonId]);

  async function pickFile(f: File) {
    setFile(f);
    setCached(null);
    setError("");
    setPhase("hashing");
    setMessage("Checking whether this video was already processed…");
    try {
      const h = await hashFile(f);
      setHash(h);
      const existing = await findProcessedLesson(h);
      if (existing) {
        setCached(existing);
        setPhase("cached");
      } else {
        setPhase("idle");
        setMessage("");
      }
    } catch (e) {
      setError(String(e));
      setPhase("error");
    }
  }

  async function process(force: boolean) {
    if (!file || !classroomId) return;
    setError("");
    setPhase("uploading");
    setPct(5);
    setMessage("Uploading video to Butterbase…");
    try {
      let id = lessonId;
      if (!id) {
        const objectId = await uploadFile(file);
        const lesson = await insertRow<Lesson>("lessons", {
          classroom_id: classroomId,
          title: file.name.replace(/\.[^.]+$/, ""),
          lesson_date: new Date().toISOString().slice(0, 10),
          status: "uploaded",
          video_object_id: objectId,
          source_hash: hash,
        });
        id = lesson.id;
        setLessonId(id);
      }
      setPhase("processing");
      setMessage("Handing off to the ClassPulse worker…");
      await startProcessing(id!, force);
    } catch (e) {
      setError(String(e));
      setPhase("error");
    }
  }

  async function reprocessCached() {
    if (!cached) return;
    setLessonId(cached.id);
    await patchRow("lessons", cached.id, { status: "processing" }).catch(() => {});
    setPhase("processing");
    setPct(0);
    setMessage("Reprocessing…");
    await startProcessing(cached.id, true).catch((e) => {
      setError(String(e));
      setPhase("error");
    });
  }

  const busy = phase === "uploading" || phase === "processing" || phase === "hashing";
  const ready = file && classroomId && hasUploadAuth() && worker;

  return (
    <>
      <div className="crumb"><Link to="/">← All classrooms</Link></div>
      <h1>Upload lesson</h1>
      <div className="sub">
        Drop a classroom recording, pick the class, and ClassPulse finds every student,
        crops their clip, and scores their engagement.
      </div>

      {!hasUploadAuth() && (
        <div className="notice">
          Set <code>VITE_BUTTERBASE_API_KEY</code> in <code>webapp/.env.local</code> to upload.
        </div>
      )}
      {worker === false && (
        <div className="notice warn">
          Worker offline — start it with <code>BUTTERBASE_API_KEY=… ./worker/run.sh</code>,
          then reload. (The dashboard still works without it.)
        </div>
      )}

      <div
        className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f?.type.startsWith("video/")) pickFile(f);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        {file ? (
          <>
            <div className="dropzone-title">{file.name}</div>
            <div className="sub">{(file.size / 1e6).toFixed(1)} MB · click to replace</div>
          </>
        ) : (
          <>
            <div className="dropzone-title">Drop a lesson video here</div>
            <div className="sub">or click to browse · mp4, mov</div>
          </>
        )}
      </div>

      <div className="upload-form card glass">
        <label>
          Classroom
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} required>
            <option value="">Select classroom…</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="sub">The classroom's roster is used to name each student.</span>
        </label>

        {phase === "cached" && cached ? (
          <div className="cache-hit">
            <div>
              <b>This video was already processed.</b>
              <div className="sub">“{cached.title}” — reuse the saved results, or run it again?</div>
            </div>
            <div className="cache-actions">
              <button className="btn-primary" onClick={() => navigate(`/studio/${cached.id}`)}>
                Use cached results
              </button>
              <button className="btn-secondary" onClick={reprocessCached}>Process again</button>
            </div>
          </div>
        ) : (
          <button className="btn-primary" disabled={!ready || busy} onClick={() => process(false)}>
            {busy ? "Working…" : "Analyze lesson"}
          </button>
        )}
      </div>

      {(busy || phase === "done") && (
        <div className="card processing-card">
          <h2>{phase === "done" ? "Analysis complete" : "Processing"}</h2>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="processing-row">
            <span className="sub">{message}</span>
            <span className="score-num">{pct}%</span>
          </div>
          {phase === "done" && lessonId && (
            <div className="cache-actions" style={{ marginTop: 12 }}>
              <Link className="btn-primary" to={`/studio/${lessonId}`}>View student clips →</Link>
              <Link className="btn-secondary" to={`/lesson/${lessonId}`}>Lesson report</Link>
            </div>
          )}
        </div>
      )}

      {error && <div className="error inline">{error}</div>}
    </>
  );
}

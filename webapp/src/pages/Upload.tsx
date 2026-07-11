import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  findProcessedLesson, hashFile, hasUploadAuth, insertRow, rows,
  startProcessing, uploadFile, workerAlive, workerProgress,
} from "../api";
import ProcessingStages, { buildStages } from "../components/ProcessingStages";
import type { Classroom, Lesson, Student } from "../types";

type Phase = "idle" | "hashing" | "running" | "done" | "error";

export default function UploadPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [workDone, setWorkDone] = useState(false);
  const [worker, setWorker] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    rows<Classroom>("classrooms").then(setClassrooms).catch((e) => setError(String(e)));
    workerAlive().then(setWorker);
  }, []);

  useEffect(() => {
    if (!classroomId) return;
    rows<Student>("students", `classroom_id=eq.${classroomId}`).then(setStudents).catch(() => {});
  }, [classroomId]);

  async function pickFile(f: File) {
    setFile(f);
    setError("");
    setPhase("hashing");
    try {
      setHash(await hashFile(f));
    } catch (e) {
      setError(String(e));
    }
    setPhase("idle");
  }

  async function analyze() {
    if (!file || !classroomId) return;
    setError("");
    setWorkDone(false);
    setPhase("running");
    try {
      // Same video already analyzed? Reuse it silently — the run still plays out.
      const existing = hash ? await findProcessedLesson(hash) : null;
      if (existing) {
        setLessonId(existing.id);
        setWorkDone(true);
        return;
      }

      const objectId = await uploadFile(file);
      const lesson = await insertRow<Lesson>("lessons", {
        classroom_id: classroomId,
        title: file.name.replace(/\.[^.]+$/, ""),
        lesson_date: new Date().toISOString().slice(0, 10),
        status: "uploaded",
        video_object_id: objectId,
        source_hash: hash,
      });
      setLessonId(lesson.id);
      await startProcessing(lesson.id);

      const poll = setInterval(async () => {
        try {
          const p = await workerProgress(lesson.id);
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
    () => buildStages(file?.name ?? "lesson.mp4", (file?.size ?? 0) / 1e6, students.length || 6),
    [file, students.length]
  );
  const onFinished = useCallback(() => setPhase("done"), []);

  /* ── Processing view: the run plays out on its own page ── */
  if (phase === "running" || phase === "done") {
    return (
      <div className="run-view">
        <h1>{phase === "done" ? "Lesson analyzed" : "Analyzing lesson"}</h1>
        <div className="sub">
          {classrooms.find((c) => c.id === classroomId)?.name} · {file?.name}
        </div>

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
          Worker offline — start it with <code>BUTTERBASE_API_KEY=… ./worker/run.sh</code>, then reload.
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
        <input ref={inputRef} type="file" accept="video/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
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

        <button className="btn-primary" disabled={!ready || phase === "hashing"} onClick={analyze}>
          {phase === "hashing" ? "Reading video…" : "Analyze lesson"}
        </button>
      </div>

      {error && <div className="error inline">{error}</div>}
    </>
  );
}

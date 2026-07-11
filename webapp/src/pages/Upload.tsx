import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hasUploadAuth, insertRow, row, rows, uploadFile } from "../api";
import type { Classroom, Lesson } from "../types";

export default function UploadPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [title, setTitle] = useState("");
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lessonStatus, setLessonStatus] = useState<string | null>(null);

  useEffect(() => {
    rows<Classroom>("classrooms").then(setClassrooms).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!lessonId) return;
    const timer = setInterval(async () => {
      try {
        const l = await row<Lesson>("lessons", lessonId);
        setLessonStatus(l.status);
        if (l.status === "done" || l.status === "failed") clearInterval(timer);
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [lessonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classroomId || !title || !file) return;
    setError("");
    setStatus("Uploading video…");
    try {
      const objectId = await uploadFile(file);
      setStatus("Creating lesson record…");
      const lesson = await insertRow<Lesson>("lessons", {
        classroom_id: classroomId,
        title,
        lesson_date: lessonDate,
        status: "uploaded",
        video_object_id: objectId,
      });
      setLessonId(lesson.id);
      setLessonStatus(lesson.status);
      setStatus("Lesson queued for processing.");
    } catch (err) {
      setError(String(err));
      setStatus("");
    }
  }

  return (
    <>
      <div className="crumb"><Link to="/">← All classrooms</Link></div>
      <h1>Upload lesson</h1>
      <div className="sub">Record a lesson, upload the video, and ClassPulse will analyze it.</div>

      {!hasUploadAuth() && (
        <div className="notice">
          Upload requires <code>VITE_BUTTERBASE_API_KEY</code> in <code>webapp/.env.local</code>.
          The dashboard still works with seeded data without it.
        </div>
      )}

      <form className="upload-form card glass" onSubmit={handleSubmit}>
        <label>
          Classroom
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} required>
            <option value="">Select classroom…</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label>
          Lesson title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Fractions: Adding & Subtracting"
            required
          />
        </label>

        <label>
          Date
          <input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} required />
        </label>

        <label>
          Video file
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        <button type="submit" className="btn-primary" disabled={!hasUploadAuth() || !file}>
          Upload & analyze
        </button>
      </form>

      {status && <div className="status-msg">{status}</div>}
      {error && <div className="error inline">{error}</div>}

      {lessonId && (
        <div className="card processing-card">
          <h2>Processing status</h2>
          <div className="processing-row">
            <span className={`status-dot ${lessonStatus ?? "uploaded"}`} />
            <span>{lessonStatus ?? "uploaded"}</span>
            {lessonStatus === "processing" && <span className="sub">Analyzing classroom video…</span>}
            {lessonStatus === "done" && (
              <Link to={`/lesson/${lessonId}`} className="btn-link">View lesson report →</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

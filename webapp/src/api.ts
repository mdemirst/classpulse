import type { Lesson } from "./types";

export const APP_ID = "app_k03t6gua7dg1";
const API = `https://api.butterbase.ai/v1/${APP_ID}`;
const STORAGE_API = `https://api.butterbase.ai/storage/${APP_ID}`;
const API_KEY = import.meta.env.VITE_BUTTERBASE_API_KEY as string | undefined;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  return h;
}

export async function rows<T>(table: string, query = ""): Promise<T[]> {
  const r = await fetch(`${API}/${table}${query ? `?${query}` : ""}`);
  if (!r.ok) throw new Error(`${table}: HTTP ${r.status}`);
  return r.json();
}

export async function row<T>(table: string, id: string): Promise<T> {
  const r = await fetch(`${API}/${table}/${id}`);
  if (!r.ok) throw new Error(`${table}/${id}: HTTP ${r.status}`);
  return r.json();
}

export async function insertRow<T>(table: string, data: Record<string, unknown>): Promise<T> {
  if (!API_KEY) throw new Error("Upload requires VITE_BUTTERBASE_API_KEY in .env.local");
  const r = await fetch(`${API}/${table}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`${table} insert: HTTP ${r.status}`);
  return r.json();
}

export async function getUploadUrl(
  filename: string,
  contentType: string,
  sizeBytes: number
): Promise<{ uploadUrl: string; objectId: string }> {
  if (!API_KEY) throw new Error("Upload requires VITE_BUTTERBASE_API_KEY in .env.local");
  const r = await fetch(`${STORAGE_API}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ filename, contentType, sizeBytes }),
  });
  if (!r.ok) throw new Error(`storage upload URL: HTTP ${r.status}`);
  return r.json();
}

export async function uploadFile(file: File): Promise<string> {
  const { uploadUrl, objectId } = await getUploadUrl(file.name, file.type, file.size);
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`storage PUT: HTTP ${put.status}`);
  return objectId;
}

export async function getDownloadUrl(objectId: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const r = await fetch(`${STORAGE_API}/download/${objectId}`, { headers });
  if (!r.ok) throw new Error(`storage download: HTTP ${r.status}`);
  const data = await r.json();
  return data.downloadUrl;
}

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function patchRow<T>(table: string, id: string, data: Record<string, unknown>): Promise<T> {
  if (!API_KEY) throw new Error("Requires VITE_BUTTERBASE_API_KEY in .env.local");
  const r = await fetch(`${API}/${table}/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`${table} patch: HTTP ${r.status}`);
  return r.json();
}

/* ── Local worker (runs the CV + AI pipeline; the browser can't) ── */

export const WORKER_URL =
  (import.meta.env.VITE_WORKER_URL as string | undefined) ?? "http://127.0.0.1:8000";

export interface WorkerProgress {
  stage: string;
  message: string;
  progress: number;
}

export async function workerAlive(): Promise<boolean> {
  try {
    const r = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function startProcessing(lessonId: string, force = false): Promise<void> {
  const r = await fetch(`${WORKER_URL}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lesson_id: lessonId, force }),
  });
  if (!r.ok) throw new Error(`worker: HTTP ${r.status}`);
}

export async function workerProgress(lessonId: string): Promise<WorkerProgress> {
  const r = await fetch(`${WORKER_URL}/progress/${lessonId}`);
  if (!r.ok) throw new Error(`worker progress: HTTP ${r.status}`);
  return r.json();
}

/** SHA-256 of the file — the cache key that lets us skip reprocessing. */
export async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function findProcessedLesson(hash: string): Promise<Lesson | null> {
  const found = await rows<Lesson>("lessons", `source_hash=eq.${hash}&status=eq.done`);
  return found[0] ?? null;
}

export function hasUploadAuth(): boolean {
  return Boolean(API_KEY);
}

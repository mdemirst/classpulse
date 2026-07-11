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

export function hasUploadAuth(): boolean {
  return Boolean(API_KEY);
}

const API = "https://api.butterbase.ai/v1/app_k03t6gua7dg1";

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

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

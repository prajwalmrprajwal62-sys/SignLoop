// In dev: Vite proxies /api → localhost:3001. BASE_URL is empty so fetch('/api/...') works.
// In production: VITE_API_URL is set to the Render backend URL (e.g. https://signloop-backend.onrender.com)
declare const __API_URL__: string;
const BASE_URL = typeof __API_URL__ !== 'undefined' ? __API_URL__ : '';

// All API calls use relative /api paths — Vite proxies /api -> http://localhost:3001

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${errBody}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`PATCH ${path} failed: ${res.status} ${errBody}`);
  }
  return res.json() as Promise<T>;
}

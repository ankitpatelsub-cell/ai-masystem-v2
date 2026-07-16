// src/lib/api.ts — thin fetch wrapper with JWT + refresh.
const TOKEN_KEY = 'mas_token';
const REFRESH_KEY = 'mas_refresh';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setAuth(token: string, refresh: string) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(REFRESH_KEY, refresh); }
export function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); }

async function refresh(): Promise<boolean> {
  const r = localStorage.getItem(REFRESH_KEY);
  if (!r) return false;
  const res = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: r }) });
  if (!res.ok) { clearAuth(); return false; }
  const d = await res.json();
  localStorage.setItem(TOKEN_KEY, d.token);
  return true;
}

export async function api<T = any>(method: string, path: string, body?: any): Promise<T> {
  const call = () => fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let res = await call();
  if (res.status === 401 && (await refresh())) res = await call();
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
  return res.json();
}

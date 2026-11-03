import type { ApiResult, Session } from "./types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const ACCESS_KEY = "smartcondo.access";
const REFRESH_KEY = "smartcondo.refresh";
const SESSION_KEY = "smartcondo.session";

export function saveSession(session: Session) {
  sessionStorage.setItem(ACCESS_KEY, session.accessToken);
  sessionStorage.setItem(REFRESH_KEY, session.refreshToken);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (!saved) return null;
  try { return JSON.parse(saved) as Session; } catch { return null; }
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasSession() {
  return Boolean(sessionStorage.getItem(ACCESS_KEY));
}

async function refreshSession(): Promise<string | null> {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const result = await response.json();
    sessionStorage.setItem(ACCESS_KEY, result.data.accessToken);
    sessionStorage.setItem(REFRESH_KEY, result.data.refreshToken);
    const session = loadSession();
    if (session) saveSession({ ...session, accessToken: result.data.accessToken, refreshToken: result.data.refreshToken });
    return result.data.accessToken as string;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem(ACCESS_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (response.status === 401 && !retried && !path.startsWith("/auth/")) {
    const next = await refreshSession();
    if (next) return api<T>(path, options, true);
    clearSession();
    window.dispatchEvent(new Event("smartcondo:session-expired"));
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Yêu cầu thất bại (${response.status}).`);
  }
  return body as T;
}

export async function login(email: string, password: string) {
  const result = await api<ApiResult<Session>>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  saveSession(result.data);
  return result.data;
}

export async function logout() {
  try { await api<null>("/auth/logout", { method: "POST" }); } finally { clearSession(); }
}

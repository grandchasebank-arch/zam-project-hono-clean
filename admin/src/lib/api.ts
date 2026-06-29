/**
 * Admin API client — talks to Hono backend.
 * Response shape matches Laravel-style JSON: { success, data } | { success: false, error, code }
 */
const API = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE = (
  API ?? (import.meta.env.DEV ? "/api" : "http://localhost:8787")
).replace(/\/$/, "");

export const SESSION_KEY = "spacex_admin_session";
export const DEV_BYPASS_TOKEN = "dev-bypass";
export const DEV_BYPASS_ADMIN_TOKEN = "dev-bypass-admin";

export interface StoredSession {
  member_id: string;
  email: string;
  token: string;
  issued_at: number;
}

export interface ApiMember {
  id: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  status: string;
  created_at?: string;
}

export interface ApiUpgradeRequest {
  id: string;
  member_id: string;
  from_tier: string;
  to_tier: string;
  status: string;
  admin_notes?: string | null;
  payment_reference?: string | null;
  payment_verified?: boolean;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ApiTier {
  id: string;
  name: string;
  label: string;
  price: number;
  description: string | null;
  benefits: string[];
  rank: number;
  is_active: boolean;
}

export interface ApiSettings {
  id: number;
  site_name: string;
  site_tagline: string | null;
  logo_url: string | null;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_website: string | null;
  support_email: string | null;
  mail_from_email: string | null;
  mail_from_name: string | null;
  mail_reply_to: string | null;
  maintenance_mode: boolean;
  upgrade_enabled: boolean;
  feature_flags: Record<string, unknown>;
  updated_at: string;
}

export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getSession()?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const msg = json?.error ?? json?.message ?? `HTTP ${res.status}`;
    throw new ApiError(msg, json?.code, res.status);
  }
  return (json?.data ?? json) as T;
}

export function initDevAdminSession(): void {
  if (!import.meta.env.DEV) return;
  const memberId = import.meta.env.VITE_DEV_ADMIN_MEMBER_ID as string | undefined;
  if (!memberId) return;
  const existing = getSession();
  if (existing?.token === DEV_BYPASS_ADMIN_TOKEN && existing.member_id === memberId) return;
  setSession({
    member_id: memberId,
    email:
      (import.meta.env.VITE_DEV_ADMIN_EMAIL as string | undefined) ??
      "admin@spacex.hq",
    token: DEV_BYPASS_ADMIN_TOKEN,
    issued_at: Date.now(),
  });
}

export async function sendOtp(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error ?? "Failed to send OTP", json?.code, res.status);
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<StoredSession> {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error ?? "Invalid OTP", json?.code, res.status);
  }
  const data = json?.data ?? json;
  const session: StoredSession = {
    member_id: data.member_id,
    email,
    token: data.token,
    issued_at: Date.now(),
  };
  setSession(session);
  return session;
}

export async function getCurrentMember(): Promise<ApiMember> {
  return apiFetch<ApiMember>("/members/me");
}

export async function adminNotify(
  memberId: string,
  title: string,
  message: string
): Promise<void> {
  await apiFetch("/admin/notify", {
    method: "POST",
    body: JSON.stringify({ member_id: memberId, title, message }),
  });
}

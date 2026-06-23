/**
 * API layer — all data fetching goes through here.
 * Calls the Hono backend at VITE_API_BASE_URL (default: http://localhost:8787).
 */
import type { Member } from "@/types/user";
import type { TierOption, UpgradeRequest } from "@/types/upgrade";
import type { PaymentRecord } from "@/types/payment";
import type { AppNotification } from "@/types/notification";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787").replace(/\/$/, "");

const SESSION_KEY = "spacex_session";

// ── Session helpers ──────────────────────────────────────────────────────────

interface StoredSession {
  member_id: string;
  email: string;
  token: string;
  issued_at: number;
}

function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  return getSession()?.token ?? null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json?.data ?? json) as T;
}

// ── Shape helpers ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function joinedLabel(iso: string): string {
  const d = new Date(iso);
  return `Joined ${d.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
}

type Tier = "Explorer" | "Pioneer" | "Vanguard";

function clearanceLabel(tier: Tier | string): string {
  if (tier === "Pioneer") return "Clearance Level 2";
  if (tier === "Vanguard") return "Full Operational Clearance";
  return "Clearance Level 1";
}

function subtitleLabel(tier: Tier | string, status: string): string {
  return `${tier} · ${status ?? "Active"}`;
}

const TIER_PRICE_MAP: Record<string, string> = {
  Explorer: "$1,500",
  Pioneer: "$4,000",
  Vanguard: "$6,000",
};

function statusLabel(raw: string): "Approved" | "Pending" | "Rejected" | "Under Review" {
  if (raw === "APPROVED") return "Approved";
  if (raw === "REJECTED") return "Rejected";
  if (raw === "UNDER_REVIEW") return "Under Review";
  return "Pending";
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function sendOTP(email: string) {
  const data = await apiFetch<{ ok: boolean; email: string; _dev_code?: string }>(
    "/auth/send-otp",
    { method: "POST", body: JSON.stringify({ email }) }
  );
  return data;
}

export async function verifyOTP(email: string, code: string) {
  const data = await apiFetch<{ member_id: string; token: string }>(
    "/auth/verify-otp",
    { method: "POST", body: JSON.stringify({ email, code }) }
  );
  const session: StoredSession = {
    member_id: data.member_id,
    email,
    token: data.token,
    issued_at: Date.now(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export async function isLoggedIn(): Promise<boolean> {
  return !!getSession();
}

export async function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ── Member ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMember(raw: any): Member {
  const tier: Tier = raw.tier ?? "Explorer";
  return {
    id: raw.id,
    email: raw.email,
    name: raw.full_name ?? raw.name ?? raw.email,
    subtitle: subtitleLabel(tier, raw.status),
    tier,
    clearance: clearanceLabel(tier),
    status: raw.status ?? "Active",
    joined: raw.created_at ? joinedLabel(raw.created_at) : "Member",
    avatarUrl:
      raw.avatar_url ??
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };
}

export async function getMember(): Promise<Member> {
  const raw = await apiFetch<Record<string, unknown>>("/members/me");
  return mapMember(raw);
}

// ── Upgrade tiers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTier(raw: any): TierOption {
  const clearance = raw.clearance?.startsWith("Level")
    ? `Clearance ${raw.clearance}`
    : raw.clearance;
  return {
    id: raw.id,
    name: raw.name,
    price: raw.price,
    priceValue: typeof raw.price_cents === "number" ? raw.price_cents / 100 : raw.priceValue ?? 0,
    clearance,
    description: raw.description,
    features: raw.features ?? [],
    benefits: raw.features?.slice(0, 4) ?? [],
    variant: raw.variant,
  };
}

export async function getUpgradeTiers(): Promise<TierOption[]> {
  const data = await apiFetch<unknown[]>("/tiers");
  return data.map(mapTier);
}

export async function submitUpgradeRequest(req: UpgradeRequest) {
  // Map frontend field names → DB column names (from_tier / to_tier)
  const data = await apiFetch<{ id: string }>("/upgrade-requests", {
    method: "POST",
    body: JSON.stringify({
      from_tier: req.current_tier,
      to_tier: req.requested_tier,
    }),
  });
  return {
    ok: true,
    reference: `UPG-${(data.id ?? Date.now().toString(36)).slice(0, 6).toUpperCase()}`,
  };
}

// ── Notifications ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(raw: any): AppNotification {
  return {
    id: raw.id,
    kind: raw.kind ?? raw.type ?? "system",
    title: raw.title,
    message: raw.message,
    time: raw.created_at ? relativeTime(raw.created_at) : raw.time ?? "",
    unread: raw.unread ?? (raw.read !== undefined ? !raw.read : false),
  };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const data = await apiFetch<unknown[]>("/notifications");
  return data.map(mapNotification);
}

export async function getNotificationById(id: string): Promise<AppNotification | null> {
  try {
    const raw = await apiFetch<Record<string, unknown>>(`/notifications/${id}`);
    return mapNotification(raw);
  } catch {
    return null;
  }
}

export async function markNotificationAsRead(id: string): Promise<{ ok: boolean }> {
  await apiFetch(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read: true }),
  });
  return { ok: true };
}

export async function markAllNotificationsRead() {
  await apiFetch("/notifications/read-all", { method: "PATCH" });
  return { ok: true };
}

// ── Payment history — sourced from upgrade_requests ──────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(raw: any): PaymentRecord {
  const tier = raw.to_tier ?? raw.requested_tier ?? raw.tier ?? "Explorer";
  return {
    id: raw.id,
    date: raw.created_at
      ? new Date(raw.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : raw.date ?? "",
    tier,
    amount: TIER_PRICE_MAP[tier] ?? raw.amount ?? "",
    status: statusLabel(raw.status ?? ""),
    reference: raw.reference ?? `UPG-${raw.id?.slice(0, 6).toUpperCase() ?? "XXXXXX"}`,
    read: !raw.unread,
  };
}

export async function getHistory(): Promise<PaymentRecord[]> {
  const data = await apiFetch<unknown[]>("/upgrade-requests");
  return data.map(mapPayment);
}

export async function getPaymentById(id: string): Promise<PaymentRecord | null> {
  try {
    const raw = await apiFetch<Record<string, unknown>>(`/upgrade-requests/${id}`);
    return mapPayment(raw);
  } catch {
    return null;
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminNotifyMember(memberId: string, message: string) {
  await apiFetch("/admin/notify", {
    method: "POST",
    body: JSON.stringify({ member_id: memberId, title: "Admin Notice", message }),
  });
  return { ok: true, memberId, message };
}

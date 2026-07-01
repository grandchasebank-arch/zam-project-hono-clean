/**
 * API layer â€” all data fetching goes through here.
 * Calls the Hono backend at VITE_API_BASE_URL (default: http://localhost:8787).
 */
import type { Member } from "@/types/user";
import type { TierOption, UpgradeRequest } from "@/types/upgrade";
import type { PaymentRecord } from "@/types/payment";
import type { AppNotification } from "@/types/notification";
import type { Badge } from "@/types/badge";
import type { UpgradeRequestDetail, PaymentReceipt } from "@/types/receipt";
import { historyStatusLabel } from "@/lib/upgradeStatus";

const API = import.meta.env.VITE_API_BASE_URL as string | undefined;
/** In dev, default to same-origin `/api` proxy so LAN/localhost URLs all work. */
const BASE = (API ?? (import.meta.env.DEV ? "/api" : "http://localhost:8787")).replace(/\/$/, "");

const SESSION_KEY = "spacex_session";
export const DEV_BYPASS_TOKEN = "dev-bypass";

// â”€â”€ Session helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

/** Auto-login in Vite dev when VITE_DEV_MEMBER_ID is set (skips OTP). */
export function initDevSession(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;

  const memberId = import.meta.env.VITE_DEV_MEMBER_ID as string | undefined;
  if (!memberId) return;

  const existing = getSession();
  if (
    existing?.token === DEV_BYPASS_TOKEN &&
    existing.member_id === memberId
  ) {
    return;
  }

  const session: StoredSession = {
    member_id: memberId,
    email: (import.meta.env.VITE_DEV_MEMBER_EMAIL as string | undefined) ?? "operator@spacex.hq",
    token: DEV_BYPASS_TOKEN,
    issued_at: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  console.info("[dev] auto session for member", memberId);
}

// â”€â”€ Fetch wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Shape helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  return `${tier} Â· ${status ?? "Active"}`;
}

const TIER_PRICE_MAP: Record<string, string> = {
  Explorer: "$1,500",
  Pioneer: "$4,000",
  Vanguard: "$6,000",
};

function statusLabel(raw: string): "Approved" | "Pending" | "Rejected" | "Under Review" {
  return historyStatusLabel(raw);
}

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function sendOTP(email: string) {
  const res = await fetch(`${BASE}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error?.message ?? payload?.message ?? "Failed to send OTP");
  }
  return payload?.data ?? payload;
}

export async function verifyOTP(email: string, code: string) {
  const res = await fetch(`${BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error?.message ?? payload?.message ?? "Failed to verify OTP");
  }
  const data = payload?.data ?? payload;
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

// â”€â”€ Member â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Upgrade tiers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // Map frontend field names â†’ DB column names (from_tier / to_tier)
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

// â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Payment history â€” sourced from upgrade_requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(raw: any): PaymentRecord {
  const tier = raw.to_tier ?? raw.requested_tier ?? raw.tier ?? "Explorer";
  const total = raw.total_amount != null ? Number(raw.total_amount) : null;
  const paid = raw.amount_paid != null ? Number(raw.amount_paid) : null;
  let amount = TIER_PRICE_MAP[tier] ?? raw.amount ?? "";
  if (total != null && total > 0) {
    amount =
      paid != null && paid > 0
        ? `$${paid.toLocaleString()} / $${total.toLocaleString()}`
        : `$${total.toLocaleString()}`;
  }
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
    amount,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBadge(raw: any): Badge {
  return {
    id: raw.id,
    name: raw.name,
    tierRequired: raw.tier_required ?? "Explorer",
    description: raw.description ?? "",
    iconUrl: raw.icon_url ?? null,
  };
}

export async function getBadges(): Promise<Badge[]> {
  const data = await apiFetch<unknown[]>("/badges");
  return data.map(mapBadge);
}

// ── Public settings + feature flags ───────────────────────────

export interface PublicSettings {
  site_name: string;
  site_tagline?: string | null;
  logo_url?: string | null;
  support_email?: string | null;
  maintenance_mode: boolean;
  upgrade_enabled: boolean;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>("/settings/public");
}

export type FeatureFlagsMap = Record<string, boolean>;

export async function getFeatureFlags(): Promise<FeatureFlagsMap> {
  return apiFetch<FeatureFlagsMap>("/feature-flags/public");
}

export async function getUpgradeRequestDetail(id: string): Promise<UpgradeRequestDetail> {
  return apiFetch<UpgradeRequestDetail>(`/upgrade-requests/${id}`);
}

export async function getReceipts(requestId: string): Promise<PaymentReceipt[]> {
  return apiFetch<PaymentReceipt[]>(`/upgrade-requests/${requestId}/receipts`);
}

export async function uploadReceipt(
  requestId: string,
  formData: FormData
): Promise<PaymentReceipt> {
  const res = await fetch(`${BASE}/upgrade-requests/${requestId}/receipts`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json?.data ?? json) as PaymentReceipt;
}

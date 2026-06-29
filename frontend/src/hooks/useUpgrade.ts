import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { UpgradeRequest } from "@/types/upgrade";

const SESSION_KEY = "spacex_session";
const API = import.meta.env.VITE_API_BASE_URL as string | undefined;
const BASE = (API ?? (import.meta.env.DEV ? "/api" : "http://localhost:8787")).replace(/\/$/, "");

class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const token = raw ? (JSON.parse(raw) as { token?: string }).token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function authFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
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
    throw new ApiRequestError(msg, res.status);
  }
  return (json?.data ?? json) as T;
}

export function useUpgradeTiers() {
  return useQuery({
    queryKey: queryKeys.upgradeTiers(),
    queryFn: api.getUpgradeTiers,
  });
}

export interface PendingUpgradeRequest {
  id: string;
  from_tier: string;
  to_tier: string;
  status: string;
  created_at?: string;
}

export function usePendingRequests() {
  return useQuery({
    queryKey: queryKeys.pendingRequests(),
    queryFn: () => authFetch<PendingUpgradeRequest[]>("/upgrade-requests/pending"),
  });
}

export function useSubmitUpgrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: UpgradeRequest) =>
      authFetch<{ id: string }>("/upgrade-requests", {
        method: "POST",
        body: JSON.stringify({
          from_tier: req.current_tier,
          to_tier: req.requested_tier,
        }),
      }),
    onSuccess: () => {
      toast.success("Upgrade request submitted!", {
        description: "Your request is under review. We'll notify you on any update.",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.history() }); // FIX: refresh history
      queryClient.invalidateQueries({ queryKey: queryKeys.member() }); // FIX: refresh member tier
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingRequests() }); // FIX: refresh pending badges
    },
    onError: (error: Error) => {
      const status = error instanceof ApiRequestError ? error.status : 0;
      if (status === 409) {
        toast.warning("Request already pending", { description: error.message }); // FIX: 409 toast
        return;
      }
      if (status === 400) {
        toast.error("Invalid tier selection", { description: error.message }); // FIX: 400 toast
        return;
      }
      toast.error("Something went wrong", {
        description: "Please try again or contact support.",
      }); // FIX: generic error toast
    },
  });
}

export function useCancelUpgrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authFetch<{ message: string }>(`/upgrade-requests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Request cancelled", {
        description: "You can now submit a new upgrade request.",
      }); // FIX: cancel success toast
      queryClient.invalidateQueries({ queryKey: queryKeys.history() }); // FIX: refresh history
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingRequests() }); // FIX: refresh pending badges
    },
    onError: (error: Error) => {
      toast.error("Could not cancel request", { description: error.message }); // FIX: cancel error toast
    },
  });
}

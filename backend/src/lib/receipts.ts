import type { SupabaseClient } from "./supabase";

/** Statuses where a request is still in progress (blocks duplicate to_tier). */
export const IN_FLIGHT_UPGRADE_STATUSES = [
  "REQUESTED",
  "AWAITING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "UNDER_REVIEW",
  "PARTIALLY_PAID",
  // Legacy until all rows migrated
  "PENDING",
] as const;

export type UpgradeRequestStatus =
  | "REQUESTED"
  | "AWAITING_PAYMENT"
  | "PAYMENT_SUBMITTED"
  | "UNDER_REVIEW"
  | "PARTIALLY_PAID"
  | "APPROVED"
  | "REJECTED"
  | "PENDING";

export interface PaymentReceiptRow {
  id: string;
  upgrade_request_id: string;
  member_id: string;
  file_url: string;
  file_type: "pdf" | "image";
  amount_claimed: number;
  member_note?: string | null;
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
  admin_note?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface UpgradeRequestRow {
  id: string;
  member_id: string;
  from_tier: string;
  to_tier: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
}

export async function sumAcceptedReceipts(
  sb: SupabaseClient,
  upgradeRequestId: string
): Promise<number> {
  const rows = await sb.select<PaymentReceiptRow>(
    "payment_receipts",
    `upgrade_request_id=eq.${upgradeRequestId}&status=eq.ACCEPTED&select=amount_claimed`
  );
  return rows.reduce((sum, r) => sum + Number(r.amount_claimed), 0);
}

export async function recomputeUpgradePayment(
  sb: SupabaseClient,
  requestId: string,
  options?: { splitPaymentEnabled?: boolean }
): Promise<UpgradeRequestRow | null> {
  const request = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${requestId}`
  );
  if (!request) return null;

  const amountPaid = await sumAcceptedReceipts(sb, requestId);
  const total = Number(request.total_amount);
  const split = options?.splitPaymentEnabled ?? false;

  let status = request.status;
  if (amountPaid >= total && total > 0) {
    status = "APPROVED";
  } else if (split && amountPaid > 0 && amountPaid < total) {
    status = "PARTIALLY_PAID";
  } else if (amountPaid > 0 && request.status !== "APPROVED") {
    status = "UNDER_REVIEW";
  }

  return sb.update<UpgradeRequestRow>("upgrade_requests", `id=eq.${requestId}`, {
    amount_paid: amountPaid,
    status,
    updated_at: new Date().toISOString(),
  });
}

export async function applyApprovedUpgrade(
  sb: SupabaseClient,
  request: UpgradeRequestRow,
  reviewerMemberId: string
): Promise<void> {
  await sb.insert("tier_change_history", {
    member_id: request.member_id,
    changed_by: reviewerMemberId,
    previous_tier: request.from_tier,
    new_tier: request.to_tier,
  });
  await sb.update("members", `id=eq.${request.member_id}`, { tier: request.to_tier });
}

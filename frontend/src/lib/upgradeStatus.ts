/** Plain-English copy per PAYMENT_FLOW.md Rule 1 */

export const UPGRADE_STATUS_COPY: Record<string, { label: string; message: string }> = {
  REQUESTED: {
    label: "Requested",
    message: "We've received your request. Next: payment instructions.",
  },
  AWAITING_PAYMENT: {
    label: "Awaiting payment",
    message: "Contact our team for secure payment instructions.",
  },
  PAYMENT_SUBMITTED: {
    label: "Receipt submitted",
    message: "Your receipt is in. We'll review it within 24 hours.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    message: "Our team is checking your payment now.",
  },
  PARTIALLY_PAID: {
    label: "Partially paid",
    message: "Part of your payment was confirmed. Upload another receipt to continue.",
  },
  APPROVED: {
    label: "Approved",
    message: "You're all set! Your new tier is active.",
  },
  REJECTED: {
    label: "Rejected",
    message: "We couldn't verify your receipt. Please resubmit.",
  },
  PENDING: {
    label: "Pending",
    message: "Your request is in queue for review.",
  },
};

export function statusDisplayLabel(raw: string): string {
  return UPGRADE_STATUS_COPY[raw]?.label ?? raw.replace(/_/g, " ");
}

export function statusMessage(raw: string, adminNote?: string | null): string {
  if (raw === "REJECTED" && adminNote) {
    return `We couldn't verify this receipt. ${adminNote} Please resubmit.`;
  }
  return UPGRADE_STATUS_COPY[raw]?.message ?? "Check History for updates.";
}

export function historyStatusLabel(
  raw: string
): "Approved" | "Pending" | "Rejected" | "Under Review" {
  if (raw === "APPROVED") return "Approved";
  if (raw === "REJECTED") return "Rejected";
  if (raw === "UNDER_REVIEW" || raw === "PAYMENT_SUBMITTED") return "Under Review";
  return "Pending";
}

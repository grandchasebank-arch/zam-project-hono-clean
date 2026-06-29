/**
 * notify.ts — shared helper for upgrade-request lifecycle notifications.
 * Creates an app notification row AND fires a Resend email (fire-and-forget).
 * Email failure never blocks the caller — it is logged and swallowed.
 */
import type { SupabaseClient } from "./supabase";

export type UpgradeStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

const CONTENT: Record<UpgradeStatus, (adminNotes?: string) => { title: string; message: string }> = {
  PENDING: () => ({
    title: "Upgrade Request Submitted",
    message: "Your upgrade request has been received and is in queue for review.",
  }),
  UNDER_REVIEW: () => ({
    title: "Your Request Is Under Review",
    message:
      "An administrator has started reviewing your upgrade request. We'll notify you once a decision is made.",
  }),
  APPROVED: () => ({
    title: "Upgrade Request Approved",
    message: "Your tier upgrade has been approved. Your new membership level is now active.",
  }),
  REJECTED: (adminNotes?: string) => ({
    title: "Upgrade Request Update",
    message: adminNotes
      ? `Your upgrade request was not approved. Admin note: ${adminNotes}`
      : "Your upgrade request could not be approved at this time. Please contact support.",
  }),
};

export interface NotifyUpgradeInput {
  memberId: string;
  memberEmail: string;
  status: UpgradeStatus | string;
  adminNotes?: string;
  sb: SupabaseClient;
  resendApiKey?: string;
  resendFrom?: string;
  resendReplyTo?: string;
}

export async function notifyUpgradeStatus(input: NotifyUpgradeInput): Promise<void> {
  const {
    memberId,
    memberEmail,
    status,
    adminNotes,
    sb,
    resendApiKey,
    resendFrom,
    resendReplyTo,
  } = input;
  const contentFn = CONTENT[status as UpgradeStatus];
  if (!contentFn) return;

  const { title, message } = contentFn(adminNotes);

  // 1. App notification row (side effect — wrap so it never blocks the main response)
  try {
    await sb.insert("notifications", {
      member_id: memberId,
      type: "upgrade",
      title,
      message,
      read: false,
    });
  } catch (err) {
    console.error("[notify] Failed to insert notification row:", err);
  }

  // 2. Resend email — fire-and-forget, never blocks
  if (resendApiKey && memberEmail && resendFrom) {
    sendResendEmail({
      apiKey: resendApiKey,
      from: resendFrom,
      replyTo: resendReplyTo,
      to: memberEmail,
      subject: title,
      text: message,
    }).catch((err) => console.error("[notify] Resend email failed:", err));
  }
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const { apiKey, from, to, subject, text, replyTo } = params;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      html: `<p style="font-family:sans-serif;line-height:1.6">${text}</p>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

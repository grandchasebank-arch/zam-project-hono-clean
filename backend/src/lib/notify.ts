/**
 * notify.ts — upgrade-request lifecycle notifications.
 * In-app row + outbound email (Mailtrap sandbox in dev, Resend in prod).
 */
import type { SupabaseClient } from "./supabase";
import type { Bindings } from "../types/env";
import { sendEmail } from "./mail";

export type UpgradeStatus =
  | "REQUESTED"
  | "AWAITING_PAYMENT"
  | "PAYMENT_SUBMITTED"
  | "UNDER_REVIEW"
  | "PARTIALLY_PAID"
  | "APPROVED"
  | "REJECTED"
  | "PENDING";

const CONTENT: Record<string, (adminNotes?: string) => { title: string; message: string }> = {
  REQUESTED: () => ({
    title: "Upgrade Request Received",
    message: "We've received your request. Next step: payment instructions.",
  }),
  AWAITING_PAYMENT: () => ({
    title: "Awaiting Payment",
    message:
      "Contact our team for secure payment instructions. Upload your receipt once you've paid.",
  }),
  PAYMENT_SUBMITTED: () => ({
    title: "Receipt Received",
    message: "Your receipt is in. We'll review it within 24 hours.",
  }),
  PENDING: () => ({
    title: "Upgrade Request Submitted",
    message: "Your upgrade request has been received and is in queue for review.",
  }),
  UNDER_REVIEW: () => ({
    title: "Your Request Is Under Review",
    message:
      "An administrator is checking your payment now. We'll notify you once a decision is made.",
  }),
  PARTIALLY_PAID: () => ({
    title: "Partial Payment Received",
    message: "Part of your payment was confirmed. Upload another receipt to complete your upgrade.",
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

type MailEnv = Pick<
  Bindings,
  | "EMAIL_PROVIDER"
  | "MAILTRAP_API_KEY"
  | "MAILTRAP_INBOX_ID"
  | "RESEND_API_KEY"
  | "RESEND_FROM"
>;

export interface NotifyUpgradeInput {
  memberId: string;
  memberEmail: string;
  status: UpgradeStatus | string;
  adminNotes?: string;
  sb: SupabaseClient;
  mailEnv: MailEnv;
  from: string;
  replyTo?: string;
}

export async function notifyUpgradeStatus(input: NotifyUpgradeInput): Promise<void> {
  const { memberId, memberEmail, status, adminNotes, sb, mailEnv, from, replyTo } = input;
  const contentFn = CONTENT[status as UpgradeStatus];
  if (!contentFn) return;

  const { title, message } = contentFn(adminNotes);

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

  if (memberEmail && from) {
    try {
      await sendEmail(mailEnv, {
        from,
        replyTo,
        to: memberEmail,
        subject: title,
        text: message,
      });
    } catch (err) {
      console.error("[notify] Email failed:", err);
    }
  }
}

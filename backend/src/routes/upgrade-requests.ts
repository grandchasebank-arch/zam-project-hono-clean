import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAdmin, requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import { notifyUpgradeStatus } from "../lib/notify";
import { getAppSettings, resolveMailFrom, resolveMailReplyTo } from "../lib/settings";
import { isFeatureEnabled } from "../lib/featureFlags";
import {
  IN_FLIGHT_UPGRADE_STATUSES,
  applyApprovedUpgrade,
  type PaymentReceiptRow,
  type UpgradeRequestRow,
} from "../lib/receipts";
import type { Bindings, Variables } from "../types/env";
import type { SupabaseClient } from "../lib/supabase";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const RECEIPT_BUCKET = "payment-receipts";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

interface TierRow {
  id: string;
  name: string;
  label: string;
  price: number;
  description: string | null;
  benefits: string[];
  rank: number;
  is_active: boolean;
}

function inFlightFilter(memberId: string, toTier: string): string {
  const statuses = IN_FLIGHT_UPGRADE_STATUSES.join(",");
  return `member_id=eq.${memberId}&to_tier=eq.${toTier}&status=in.(${statuses})`;
}

function mimeToFileType(mime: string): "pdf" | "image" | null {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") return "image";
  return null;
}

// GET /upgrade-requests — own requests
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select("upgrade_requests", `member_id=eq.${memberId}&order=created_at.desc`);
  return c.json({ success: true, data });
});

// GET /upgrade-requests/pending — in-flight requests for badges
app.get("/pending", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const statuses = IN_FLIGHT_UPGRADE_STATUSES.join(",");
  const rows = await sb.select<UpgradeRequestRow>(
    "upgrade_requests",
    `member_id=eq.${memberId}&status=in.(${statuses})&order=created_at.desc`
  );
  const data = rows.map((row) => ({
    id: row.id,
    from_tier: row.from_tier,
    to_tier: row.to_tier,
    status: row.status,
    total_amount: row.total_amount,
    amount_paid: row.amount_paid,
    created_at: row.created_at,
  }));
  return c.json({ success: true, data });
});

// GET /upgrade-requests/:id/receipts
app.get("/:id/receipts", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const requestId = c.req.param("id");
  const request = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${requestId}&member_id=eq.${memberId}`
  );
  if (!request) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");
  const data = await sb.select<PaymentReceiptRow>(
    "payment_receipts",
    `upgrade_request_id=eq.${requestId}&order=submitted_at.desc`
  );
  return c.json({ success: true, data });
});

// POST /upgrade-requests/:id/receipts — upload payment proof
app.post("/:id/receipts", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);

  const uploadEnabled = await isFeatureEnabled(sb, "receipt_upload", memberId);
  if (!uploadEnabled) {
    throw new AppError(403, "Receipt upload is not enabled yet.", "FORBIDDEN");
  }

  const requestId = c.req.param("id");
  const request = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${requestId}&member_id=eq.${memberId}`
  );
  if (!request) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");

  const uploadable = [
    "AWAITING_PAYMENT",
    "PAYMENT_SUBMITTED",
    "UNDER_REVIEW",
    "PARTIALLY_PAID",
    "REJECTED",
    "REQUESTED",
    "PENDING",
  ];
  if (!uploadable.includes(request.status)) {
    throw new AppError(400, "Cannot upload a receipt for this request status.", "BAD_REQUEST");
  }

  const form = await c.req.formData();
  const file = form.get("file");
  const amountRaw = form.get("amount_claimed");
  const memberNote = form.get("member_note");

  if (!(file instanceof File)) {
    throw new AppError(400, "file is required", "VALIDATION_ERROR");
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new AppError(400, "File must be 10 MB or smaller.", "VALIDATION_ERROR");
  }

  const fileType = mimeToFileType(file.type);
  if (!fileType) {
    throw new AppError(400, "File must be PDF or image (JPEG, PNG, WebP).", "VALIDATION_ERROR");
  }

  const amountClaimed = Number(amountRaw);
  if (!Number.isFinite(amountClaimed) || amountClaimed <= 0) {
    throw new AppError(400, "amount_claimed must be a positive number", "VALIDATION_ERROR");
  }

  const ext = fileType === "pdf" ? "pdf" : file.type.split("/")[1] ?? "bin";
  const storagePath = `${memberId}/${requestId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  await sb.uploadStorage(RECEIPT_BUCKET, storagePath, buffer, file.type);

  const receipt = await sb.insert<PaymentReceiptRow>("payment_receipts", {
    upgrade_request_id: requestId,
    member_id: memberId,
    file_url: storagePath,
    file_type: fileType,
    amount_claimed: amountClaimed,
    member_note: typeof memberNote === "string" && memberNote.trim() ? memberNote.trim() : null,
    status: "PENDING_REVIEW",
  });

  await sb.update("upgrade_requests", `id=eq.${requestId}`, {
    status: "PAYMENT_SUBMITTED",
    updated_at: new Date().toISOString(),
  });

  return c.json({ success: true, data: receipt }, 201);
});

// GET /upgrade-requests/:id
app.get("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.selectOne(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`
  );
  if (!data) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// POST /upgrade-requests — submit new request
app.post("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const body = await c.req.json();

  const settings = await getAppSettings(sb);
  if (settings && !settings.upgrade_enabled) {
    throw new AppError(403, "Upgrades are temporarily disabled.", "FORBIDDEN");
  }

  const fromTierName = body.from_tier ?? body.current_tier;
  const toTierName = body.to_tier ?? body.requested_tier;

  const fromTier = await sb.selectOne<TierRow>(
    "tiers",
    `name=eq.${fromTierName}&is_active=eq.true`
  );
  const toTier = await sb.selectOne<TierRow>(
    "tiers",
    `name=eq.${toTierName}&is_active=eq.true`
  );
  if (!fromTier || !toTier) {
    throw new AppError(400, "Invalid tier.", "BAD_REQUEST");
  }

  if (toTier.rank <= fromTier.rank) {
    throw new AppError(400, "Requested tier must be higher than current tier.", "BAD_REQUEST");
  }

  const inFlight = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    inFlightFilter(memberId, toTierName)
  );
  if (inFlight) {
    throw new AppError(
      409,
      "You already have an active request for this tier. Cancel it first or choose a different tier.",
      "CONFLICT"
    );
  }

  const data = await sb.insert<UpgradeRequestRow>("upgrade_requests", {
    from_tier: fromTierName,
    to_tier: toTierName,
    member_id: memberId,
    status: "AWAITING_PAYMENT",
    total_amount: toTier.price,
    amount_paid: 0,
  });

  const mail = await resolveMailConfig(sb, c.env);
  await notifyUpgradeStatus({
    memberId,
    memberEmail: await getMemberEmail(sb, memberId),
    status: "AWAITING_PAYMENT",
    sb,
    mailEnv: c.env,
    from: mail.from,
    replyTo: mail.replyTo,
  }).catch((err) => console.error("[upgrade-requests] POST notify error:", err));

  return c.json({ success: true, data }, 201);
});

// DELETE /upgrade-requests/:id — cancel early-stage request
app.delete("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const row = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`
  );
  if (!row) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");
  if (row.member_id !== memberId) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }

  const cancellable = ["REQUESTED", "AWAITING_PAYMENT", "PENDING"];
  if (!cancellable.includes(row.status)) {
    throw new AppError(400, "Only requests awaiting payment can be cancelled.", "BAD_REQUEST");
  }

  const accepted = await sb.select<PaymentReceiptRow>(
    "payment_receipts",
    `upgrade_request_id=eq.${row.id}&status=eq.ACCEPTED&limit=1`
  );
  if (accepted.length > 0) {
    throw new AppError(400, "Cannot cancel after a receipt has been accepted.", "BAD_REQUEST");
  }

  await sb.remove("upgrade_requests", `id=eq.${c.req.param("id")}`);
  return c.json({ success: true, message: "Request cancelled." });
});

// PATCH /upgrade-requests/:id — admin status transitions
app.patch("/:id", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const rawBody = await c.req.json();
  const { notify, amount_paid: manualAmountPaid, ...updateBody } = rawBody;
  const shouldNotify = notify !== false;

  const current = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`
  );
  if (!current) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");

  const oldStatus = current.status;
  const newStatus: string | undefined = updateBody.status;
  const reviewerMemberId = c.get("memberId");
  if (!reviewerMemberId) {
    throw new AppError(404, "Admin member not found for this account", "NOT_FOUND");
  }

  const patch: Record<string, unknown> = {
    ...updateBody,
    updated_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerMemberId,
  };

  if (manualAmountPaid !== undefined) {
    patch.amount_paid = Number(manualAmountPaid);
  }

  const data = await sb.update<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`,
    patch
  );
  if (!data) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");

  const finalStatus = data.status;
  if (finalStatus === "APPROVED" && oldStatus !== "APPROVED") {
    await applyApprovedUpgrade(sb, data, reviewerMemberId);
  }

  if (shouldNotify && newStatus && newStatus !== oldStatus) {
    const mail = await resolveMailConfig(sb, c.env);
    await notifyUpgradeStatus({
      memberId: current.member_id,
      memberEmail: await getMemberEmail(sb, current.member_id),
      status: newStatus,
      adminNotes: updateBody.admin_notes,
      sb,
      mailEnv: c.env,
      from: mail.from,
      replyTo: mail.replyTo,
    }).catch((err) => console.error("[upgrade-requests] PATCH notify error:", err));
  }

  return c.json({ success: true, data });
});

async function resolveMailConfig(sb: SupabaseClient, env: Bindings) {
  const settings = await getAppSettings(sb);
  return {
    from: resolveMailFrom(settings, env.RESEND_FROM),
    replyTo: resolveMailReplyTo(settings, env.RESEND_FROM),
  };
}

async function getMemberEmail(
  sb: ReturnType<typeof createSupabase>,
  memberId: string
): Promise<string> {
  const member = await sb.selectOne<{ email: string }>("members", `id=eq.${memberId}`);
  return member?.email ?? "";
}

export default app;

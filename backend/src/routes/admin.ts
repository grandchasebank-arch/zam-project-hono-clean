import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";
import type { SettingsRow } from "../types/settings";
import { SETTINGS_PATCH_FIELDS } from "../types/settings";
import {
  applyApprovedUpgrade,
  recomputeUpgradePayment,
  type PaymentReceiptRow,
  type UpgradeRequestRow,
} from "../lib/receipts";
import { getAllFeatureFlags, isFeatureEnabled } from "../lib/featureFlags";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /admin/notify — send notification to a member
app.post("/notify", requireAdmin, async (c) => {
  const { member_id, type, title, message } = await c.req.json();
  if (!member_id || !title || !message) {
    throw new AppError(400, "member_id, title, and message are required", "VALIDATION_ERROR");
  }
  const sb = createSupabase(c.env);
  const row = await sb.insert<Record<string, unknown>>("notifications", {
    member_id,
    type: type ?? "system",
    title,
    message,
    read: false,
  });
  const { type: dbType, read, ...rest } = row;
  return c.json({ success: true, data: { ...rest, kind: dbType, unread: !read } }, 201);
});

// GET /admin/members — list all members (admin)
app.get("/members", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("members", "order=created_at.desc");
  return c.json({ success: true, data });
});

// PATCH /admin/members/:id — update any member (admin)
app.patch("/members/:id", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const data = await sb.update("members", `id=eq.${c.req.param("id")}`, {
    ...body,
    updated_at: new Date().toISOString(),
  });
  if (!data) throw new AppError(404, "Member not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// GET /admin/upgrade-requests — all upgrade requests (admin)
app.get("/upgrade-requests", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("upgrade_requests", "order=created_at.desc");
  return c.json({ success: true, data });
});

// FIX: GET /admin/tiers — list all tiers
app.get("/tiers", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("tiers", "order=rank.asc");
  return c.json({ success: true, data });
});

// FIX: POST /admin/tiers — create tier
app.post("/tiers", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const data = await sb.insert("tiers", body);
  return c.json({ success: true, data }, 201);
});

// FIX: PATCH /admin/tiers/:id — update tier
app.patch("/tiers/:id", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const data = await sb.update("tiers", `id=eq.${c.req.param("id")}`, body);
  if (!data) throw new AppError(404, "Tier not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// FIX: DELETE /admin/tiers/:id — soft delete
app.delete("/tiers/:id", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.update("tiers", `id=eq.${c.req.param("id")}`, { is_active: false });
  if (!data) throw new AppError(404, "Tier not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// GET /admin/settings — read platform config (admin)
app.get("/settings", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.selectOne<SettingsRow>("settings", "id=eq.1");
  if (!data) throw new AppError(404, "Settings not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// PATCH /admin/settings — update platform config (admin)
app.patch("/settings", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const update: Record<string, unknown> = {};
  for (const key of SETTINGS_PATCH_FIELDS) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No valid settings fields provided", "VALIDATION_ERROR");
  }
  const data = await sb.update<SettingsRow>("settings", "id=eq.1", update);
  if (!data) throw new AppError(404, "Settings not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// GET /admin/receipts — flat inbox (PENDING_REVIEW)
app.get("/receipts", requireAdmin, async (c) => {
  const inboxEnabled = await isFeatureEnabled(createSupabase(c.env), "receipt_review_inbox");
  if (!inboxEnabled) {
    throw new AppError(403, "Receipt inbox is not enabled.", "FORBIDDEN");
  }
  const sb = createSupabase(c.env);
  const status = c.req.query("status") ?? "PENDING_REVIEW";
  const data = await sb.select<PaymentReceiptRow>(
    "payment_receipts",
    `status=eq.${status}&order=submitted_at.asc`
  );
  return c.json({ success: true, data });
});

// PATCH /admin/receipts/:id — accept or reject receipt
app.patch("/receipts/:id", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const { status, admin_note } = body;

  if (!status || !["ACCEPTED", "REJECTED"].includes(status)) {
    throw new AppError(400, "status must be ACCEPTED or REJECTED", "VALIDATION_ERROR");
  }

  const reviewerMemberId = c.get("memberId");
  if (!reviewerMemberId) {
    throw new AppError(404, "Admin member not found for this account", "NOT_FOUND");
  }

  const receipt = await sb.selectOne<PaymentReceiptRow>(
    "payment_receipts",
    `id=eq.${c.req.param("id")}`
  );
  if (!receipt) throw new AppError(404, "Receipt not found", "NOT_FOUND");

  const updated = await sb.update<PaymentReceiptRow>(
    "payment_receipts",
    `id=eq.${receipt.id}`,
    {
      status,
      admin_note: admin_note ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerMemberId,
    }
  );
  if (!updated) throw new AppError(404, "Receipt not found", "NOT_FOUND");

  const splitEnabled = await isFeatureEnabled(sb, "split_payment");
  const before = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${receipt.upgrade_request_id}`
  );
  const request = await recomputeUpgradePayment(sb, receipt.upgrade_request_id, {
    splitPaymentEnabled: splitEnabled,
  });

  if (request?.status === "APPROVED" && before?.status !== "APPROVED") {
    await applyApprovedUpgrade(sb, request, reviewerMemberId);
  }

  return c.json({ success: true, data: { receipt: updated, request } });
});

// GET /admin/upgrade-requests/:id/receipts
app.get("/upgrade-requests/:id/receipts", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select<PaymentReceiptRow>(
    "payment_receipts",
    `upgrade_request_id=eq.${c.req.param("id")}&order=submitted_at.desc`
  );
  return c.json({ success: true, data });
});

// GET /admin/feature-flags
app.get("/feature-flags", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const data = await getAllFeatureFlags(sb);
  return c.json({ success: true, data });
});

// PATCH /admin/feature-flags/:key
app.patch("/feature-flags/:key", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  if (body.enabled === undefined) {
    throw new AppError(400, "enabled is required", "VALIDATION_ERROR");
  }
  const data = await sb.update("feature_flags", `key=eq.${c.req.param("key")}`, {
    enabled: Boolean(body.enabled),
    updated_at: new Date().toISOString(),
  });
  if (!data) throw new AppError(404, "Feature flag not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

export default app;

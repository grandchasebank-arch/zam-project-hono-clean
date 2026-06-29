import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";
import type { SettingsRow } from "../types/settings";
import { SETTINGS_PATCH_FIELDS } from "../types/settings";

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

export default app;

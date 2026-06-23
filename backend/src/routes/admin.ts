import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /admin/notify — send notification to a member
app.post("/notify", requireAuth, async (c) => {
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
app.get("/members", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("members", "order=created_at.desc");
  return c.json({ success: true, data });
});

// PATCH /admin/members/:id — update any member (admin)
app.patch("/members/:id", requireAuth, async (c) => {
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
app.get("/upgrade-requests", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("upgrade_requests", "order=created_at.desc");
  return c.json({ success: true, data });
});

export default app;

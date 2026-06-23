import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth, requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Map DB row → frontend shape (type → kind, read → unread)
function mapNotification(row: Record<string, unknown>) {
  const { type, read, ...rest } = row;
  return { ...rest, kind: type, unread: !read };
}

// GET /notifications — own notifications
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const rows = await sb.select<Record<string, unknown>>(
    "notifications",
    `member_id=eq.${memberId}&order=created_at.desc`
  );
  return c.json({ success: true, data: rows.map(mapNotification) });
});

// GET /notifications/:id
app.get("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const row = await sb.selectOne<Record<string, unknown>>(
    "notifications",
    `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`
  );
  if (!row) throw new AppError(404, "Notification not found", "NOT_FOUND");
  return c.json({ success: true, data: mapNotification(row) });
});

// POST /notifications — create (admin use, or system)
app.post("/", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const row = await sb.insert<Record<string, unknown>>("notifications", body);
  return c.json({ success: true, data: mapNotification(row) }, 201);
});

// PATCH /notifications/read-all — mark all as read for current member
app.patch("/read-all", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  await sb.update("notifications", `member_id=eq.${memberId}`, { read: true });
  return c.json({ success: true, data: { ok: true } });
});

// PATCH /notifications/:id — update (mark read, etc.)
app.patch("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const updated = await sb.update<Record<string, unknown>>(
    "notifications",
    `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`,
    body
  );
  if (!updated) throw new AppError(404, "Notification not found", "NOT_FOUND");
  return c.json({ success: true, data: mapNotification(updated) });
});

export default app;

import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth, requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /members — list all (service-key-level, admin use)
app.get("/", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("members");
  return c.json({ success: true, data });
});

// GET /members/me — current member by session
app.get("/me", requireAuthWithMember, async (c) => {
  const sb = createSupabase(c.env);
  const memberId = c.get("memberId");
  const authUserId = c.get("authUserId");
  // Prefer direct members.id lookup (session-token auth); fall back to auth_user_id (Supabase JWT)
  const query = memberId
    ? `id=eq.${memberId}`
    : `auth_user_id=eq.${authUserId}`;
  const member = await sb.selectOne("members", query);
  if (!member) throw new AppError(404, "Member not found", "NOT_FOUND");
  return c.json({ success: true, data: member });
});

// GET /members/:id — get by id
app.get("/:id", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const member = await sb.selectOne("members", `id=eq.${c.req.param("id")}`);
  if (!member) throw new AppError(404, "Member not found", "NOT_FOUND");
  return c.json({ success: true, data: member });
});

// POST /members — create member (registration, called from auth flow)
app.post("/", async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const member = await sb.insert("members", body);
  return c.json({ success: true, data: member }, 201);
});

// PATCH /members/:id — update member
app.patch("/:id", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const updated = await sb.update("members", `id=eq.${c.req.param("id")}`, {
    ...body,
    updated_at: new Date().toISOString(),
  });
  if (!updated) throw new AppError(404, "Member not found", "NOT_FOUND");
  return c.json({ success: true, data: updated });
});

export default app;

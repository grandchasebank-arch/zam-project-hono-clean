import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /sessions — own sessions
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select("sessions", `member_id=eq.${memberId}&order=created_at.desc`);
  return c.json({ success: true, data });
});

// DELETE /sessions/:id — revoke session
app.delete("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  await sb.remove("sessions", `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`);
  return c.json({ success: true, data: null });
});

export default app;

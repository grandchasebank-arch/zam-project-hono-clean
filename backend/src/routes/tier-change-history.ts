import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /tier-change-history — own history
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select(
    "tier_change_history",
    `member_id=eq.${memberId}&order=changed_at.desc`
  );
  return c.json({ success: true, data });
});

export default app;

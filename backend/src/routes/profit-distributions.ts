import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /profit-distributions — own distributions
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select(
    "profit_distributions",
    `member_id=eq.${memberId}&order=period_month.desc`
  );
  return c.json({ success: true, data });
});

// GET /profit-distributions/:id
app.get("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.selectOne(
    "profit_distributions",
    `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`
  );
  if (!data) throw new AppError(404, "Profit distribution not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

export default app;

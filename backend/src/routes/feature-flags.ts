import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { getPublicFeatureFlags } from "../lib/featureFlags";
import { requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /feature-flags/public — member-relevant flags (resolved with overrides)
app.get("/public", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  const sb = createSupabase(c.env);
  const flags = await getPublicFeatureFlags(sb, memberId);
  return c.json({ success: true, data: flags });
});

// GET /feature-flags/public-anon — flags without member overrides (pre-login gates)
app.get("/public-anon", async (c) => {
  const sb = createSupabase(c.env);
  const flags = await getPublicFeatureFlags(sb, null);
  return c.json({ success: true, data: flags });
});

export default app;

import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /badges — public
app.get("/", async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.select("badges", "order=created_at.asc");
  return c.json({ success: true, data });
});

// GET /badges/:id — public
app.get("/:id", async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.selectOne("badges", `id=eq.${c.req.param("id")}`);
  if (!data) throw new AppError(404, "Badge not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// POST /badges — create (admin)
app.post("/", requireAuth, async (c) => {
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const data = await sb.insert("badges", body);
  return c.json({ success: true, data }, 201);
});

export default app;

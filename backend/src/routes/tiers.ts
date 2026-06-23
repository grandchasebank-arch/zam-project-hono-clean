import { Hono } from "hono";
import { TIERS } from "../lib/config";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /tiers — public, served from config (not DB)
app.get("/", (c) => {
  return c.json({ success: true, data: TIERS });
});

// GET /tiers/:id
app.get("/:id", (c) => {
  const tier = TIERS.find((t) => t.id === c.req.param("id"));
  if (!tier) throw new AppError(404, "Tier not found", "NOT_FOUND");
  return c.json({ success: true, data: tier });
});

export default app;

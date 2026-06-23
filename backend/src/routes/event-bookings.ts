import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /event-bookings — own bookings
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select(
    "event_bookings",
    `member_id=eq.${memberId}&order=event_date.desc`
  );
  return c.json({ success: true, data });
});

// POST /event-bookings — create booking
app.post("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const data = await sb.insert("event_bookings", {
    ...body,
    member_id: memberId,
    booking_status: "CONFIRMED",
  });
  return c.json({ success: true, data }, 201);
});

// PATCH /event-bookings/:id — update booking status
app.patch("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const body = await c.req.json();
  const data = await sb.update(
    "event_bookings",
    `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`,
    body
  );
  if (!data) throw new AppError(404, "Event booking not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

export default app;

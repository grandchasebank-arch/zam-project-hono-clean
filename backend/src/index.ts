import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Bindings, Variables } from "./types/env";
import { errorHandler } from "./middleware/error";

import members from "./routes/members";
import notifications from "./routes/notifications";
import upgradeRequests from "./routes/upgrade-requests";
import badges from "./routes/badges";
import sessions from "./routes/sessions";
import otp from "./routes/otp";
import profitDistributions from "./routes/profit-distributions";
import tierChangeHistory from "./routes/tier-change-history";
import eventBookings from "./routes/event-bookings";
import tiers from "./routes/tiers";
import admin from "./routes/admin";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(logger());

// Environment-aware CORS: reads ALLOWED_ORIGINS (comma-separated) from env.
// Falls back to localhost:5173 so local dev always works without configuration.
app.use("*", async (c, next) => {
  const raw = c.env.ALLOWED_ORIGINS ?? "http://localhost:5173";
  const allowedOrigins = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const localDevOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;
  const mw = cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] ?? "http://localhost:5173";
      if (allowedOrigins.includes(origin)) return origin;
      if (c.env.DEV_BYPASS_MEMBER_ID && localDevOrigin.test(origin)) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range"],
    credentials: true,
  });
  return mw(c, next);
});

app.onError(errorHandler);

app.get("/", (c) => c.json({ status: "zamproject API OK", time: new Date().toISOString() }));
app.get("/health", (c) => c.json({ success: true, data: { healthy: true } }));

app.route("/members", members);
app.route("/notifications", notifications);
app.route("/upgrade-requests", upgradeRequests);
app.route("/badges", badges);
app.route("/sessions", sessions);
app.route("/auth", otp);
app.route("/profit-distributions", profitDistributions);
app.route("/tier-change-history", tierChangeHistory);
app.route("/event-bookings", eventBookings);
app.route("/tiers", tiers);
app.route("/admin", admin);

export default app;

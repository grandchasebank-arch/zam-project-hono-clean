import { Hono } from "hono";
import { getEmailProviderStatus, resolveEmailProvider, sendEmail } from "../lib/mail";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function requireLocalDev(env: Bindings): void {
  if (!env.DEV_BYPASS_MEMBER_ID) {
    throw new AppError(404, "Not found", "NOT_FOUND");
  }
}

// GET /dev/mail-test — which provider is active and Mailtrap inbox link
app.get("/mail-test", (c) => {
  requireLocalDev(c.env);
  return c.json({ success: true, data: getEmailProviderStatus(c.env) });
});

// POST /dev/mail-test — send a test email through the active provider
app.post("/mail-test", async (c) => {
  requireLocalDev(c.env);

  const body = await c.req.json().catch(() => ({}));
  const to = typeof body.to === "string" && body.to.trim() ? body.to.trim() : "operator@spacex.hq";
  const from = c.env.RESEND_FROM?.trim() || "noreply@localhost";
  const status = getEmailProviderStatus(c.env);
  const provider = resolveEmailProvider(c.env);

  if (!provider) {
    throw new AppError(
      503,
      `No email provider available (flag=${status.configured_flag}). Set MAILTRAP_API_KEY for local dev or RESEND_API_KEY for production.`,
      "SERVICE_UNAVAILABLE"
    );
  }

  const sent = await sendEmail(c.env, {
    from,
    to,
    subject: "Zam API — mail test",
    text: `Test email via ${provider} at ${new Date().toISOString()}. If using Mailtrap, check your sandbox inbox.`,
  });

  if (!sent) {
    throw new AppError(503, "Email send failed — check from/to addresses", "SERVICE_UNAVAILABLE");
  }

  return c.json({
    success: true,
    data: {
      sent: true,
      provider,
      to,
      from,
      mailtrap_inbox_url: provider === "mailtrap" ? status.mailtrap_inbox_url : null,
    },
  });
});

export default app;

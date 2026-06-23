import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /auth/send-otp — store a 6-digit code for email
app.post("/send-otp", async (c) => {
  const { email } = await c.req.json();
  if (!email) throw new AppError(400, "email is required", "VALIDATION_ERROR");

  const sb = createSupabase(c.env);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await sb.insert("otp_codes", { email, code, expires_at, used: false, attempts: 0 });

  // In production: send email with code via transactional email service
  // For MVP: code is returned in response (remove before production)
  return c.json({ success: true, data: { ok: true, _dev_code: code } });
});

// POST /auth/verify-otp — verify code, create session token
app.post("/verify-otp", async (c) => {
  const { email, code } = await c.req.json();
  if (!email || !code) throw new AppError(400, "email and code are required", "VALIDATION_ERROR");

  const sb = createSupabase(c.env);
  const otpRow = await sb.selectOne<{
    id: string;
    code: string;
    expires_at: string;
    used: boolean;
    attempts: number;
  }>(
    "otp_codes",
    `email=eq.${encodeURIComponent(email)}&used=eq.false&order=created_at.desc`
  );

  if (!otpRow) throw new AppError(400, "No valid OTP found for this email", "INVALID_OTP");
  if (new Date(otpRow.expires_at) < new Date()) {
    throw new AppError(400, "OTP has expired", "OTP_EXPIRED");
  }
  if (otpRow.code !== code) {
    await sb.update("otp_codes", `id=eq.${otpRow.id}`, { attempts: otpRow.attempts + 1 });
    throw new AppError(400, "Invalid OTP code", "INVALID_OTP");
  }

  await sb.update("otp_codes", `id=eq.${otpRow.id}`, { used: true });

  const member = await sb.selectOne<{ id: string; email: string; role: string }>(
    "members",
    `email=eq.${encodeURIComponent(email)}`
  );
  if (!member) throw new AppError(404, "No member found for this email", "NOT_FOUND");

  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  await sb.insert("sessions", { member_id: member.id, token, expires_at });

  return c.json({ success: true, data: { token, member_id: member.id, email: member.email } });
});

export default app;

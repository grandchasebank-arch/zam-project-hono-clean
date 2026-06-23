import { createMiddleware } from "hono/factory";
import { createSupabase } from "../lib/supabase";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

/**
 * Resolves a Bearer token to an authUserId.
 * Tries Supabase JWT first; falls back to checking our custom sessions table.
 */
async function resolveToken(
  token: string,
  env: Bindings
): Promise<{ authUserId: string | null; memberId: string | null }> {
  const sb = createSupabase(env);

  // 1. Try Supabase JWT
  const supaUser = await sb.getUser(token);
  if (supaUser) {
    const member = await sb.selectOne<{ id: string }>(
      "members",
      `auth_user_id=eq.${supaUser.id}&select=id`
    );
    return { authUserId: supaUser.id, memberId: member?.id ?? null };
  }

  // 2. Fall back to custom session token (from our OTP flow)
  const session = await sb.selectOne<{ member_id: string; expires_at: string }>(
    "sessions",
    `token=eq.${token}`
  );
  if (!session) return { authUserId: null, memberId: null };
  if (new Date(session.expires_at) < new Date()) return { authUserId: null, memberId: null };

  return { authUserId: session.member_id, memberId: session.member_id };
}

export const requireAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Missing or invalid Authorization header", "UNAUTHORIZED");
    }
    const token = authHeader.slice(7);
    const { authUserId } = await resolveToken(token, c.env);
    if (!authUserId) throw new AppError(401, "Invalid or expired token", "UNAUTHORIZED");
    c.set("authUserId", authUserId);
    await next();
  }
);

export const requireAuthWithMember = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Missing or invalid Authorization header", "UNAUTHORIZED");
    }
    const token = authHeader.slice(7);
    const { authUserId, memberId } = await resolveToken(token, c.env);
    if (!authUserId) throw new AppError(401, "Invalid or expired token", "UNAUTHORIZED");
    c.set("authUserId", authUserId);
    if (memberId) c.set("memberId", memberId);
    await next();
  }
);

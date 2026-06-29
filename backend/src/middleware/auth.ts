import { createMiddleware } from "hono/factory";
import { createSupabase } from "../lib/supabase";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

/** Fixed token used with DEV_BYPASS_MEMBER_ID (local dev only). */
export const DEV_BYPASS_TOKEN = "dev-bypass";
/** Admin portal dev bypass (local dev only). */
export const DEV_BYPASS_ADMIN_TOKEN = "dev-bypass-admin";

async function resolveToken(
  token: string,
  env: Bindings
): Promise<{ authUserId: string | null; memberId: string | null }> {
  if (env.DEV_BYPASS_MEMBER_ID && token === DEV_BYPASS_TOKEN) {
    return { authUserId: env.DEV_BYPASS_MEMBER_ID, memberId: env.DEV_BYPASS_MEMBER_ID };
  }
  if (env.DEV_BYPASS_ADMIN_MEMBER_ID && token === DEV_BYPASS_ADMIN_TOKEN) {
    return {
      authUserId: env.DEV_BYPASS_ADMIN_MEMBER_ID,
      memberId: env.DEV_BYPASS_ADMIN_MEMBER_ID,
    };
  }

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

export const requireAdmin = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
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

    const sb = createSupabase(c.env);
    const member = await sb.selectOne<{ role: string }>(
      "members",
      memberId ? `id=eq.${memberId}&select=role` : `auth_user_id=eq.${authUserId}&select=role`
    );
    if (!member || member.role !== "admin") {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    await next();
  }
);

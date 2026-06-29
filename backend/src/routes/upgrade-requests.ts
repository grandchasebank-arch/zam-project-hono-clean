import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAdmin, requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import { notifyUpgradeStatus } from "../lib/notify";
import { getAppSettings, resolveMailFrom, resolveMailReplyTo } from "../lib/settings";
import type { Bindings, Variables } from "../types/env";
import type { SupabaseClient } from "../lib/supabase";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface UpgradeRequestRow {
  id: string;
  member_id: string;
  from_tier: string;
  to_tier: string;
  status: string;
  admin_notes?: string;
  payment_reference?: string;
  payment_verified?: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface TierRow {
  id: string;
  name: string;
  label: string;
  price: number;
  description: string | null;
  benefits: string[];
  rank: number;
  is_active: boolean;
}

// GET /upgrade-requests — own requests
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select("upgrade_requests", `member_id=eq.${memberId}&order=created_at.desc`);
  return c.json({ success: true, data });
});

// FIX: GET /upgrade-requests/pending — member's pending requests only
app.get("/pending", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const rows = await sb.select<UpgradeRequestRow>(
    "upgrade_requests",
    `member_id=eq.${memberId}&status=eq.PENDING&order=created_at.desc`
  );
  const data = rows.map((row) => ({
    id: row.id,
    from_tier: row.from_tier,
    to_tier: row.to_tier,
    status: row.status,
    created_at: row.created_at,
  }));
  return c.json({ success: true, data });
});

// GET /upgrade-requests/:id
app.get("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.selectOne(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}&member_id=eq.${memberId}`
  );
  if (!data) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");
  return c.json({ success: true, data });
});

// POST /upgrade-requests — submit new request (always PENDING)
app.post("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const body = await c.req.json();

  const fromTierName = body.from_tier ?? body.current_tier;
  const toTierName = body.to_tier ?? body.requested_tier;

  // FIX: validate tiers exist in DB
  const fromTier = await sb.selectOne<TierRow>(
    "tiers",
    `name=eq.${fromTierName}&is_active=eq.true`
  );
  const toTier = await sb.selectOne<TierRow>(
    "tiers",
    `name=eq.${toTierName}&is_active=eq.true`
  );
  if (!fromTier || !toTier) {
    throw new AppError(400, "Invalid tier.", "BAD_REQUEST");
  }

  // FIX: requested tier must be higher rank
  if (toTier.rank <= fromTier.rank) {
    throw new AppError(400, "Requested tier must be higher than current tier.", "BAD_REQUEST");
  }

  // FIX: block duplicate pending request for the same target tier only
  const pendingSameTier = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `member_id=eq.${memberId}&status=eq.PENDING&to_tier=eq.${toTierName}`
  );
  if (pendingSameTier) {
    throw new AppError(
      409,
      "You already have a pending request for this tier. Cancel it first or choose a different tier.",
      "CONFLICT"
    );
  }

  // Map frontend field names → DB column names; ignore any client-sent status
  const data = await sb.insert<UpgradeRequestRow>("upgrade_requests", {
    from_tier: fromTierName,
    to_tier: toTierName,
    member_id: memberId,
    status: "PENDING",
  });

  // Look up member email for notification (fire-and-forget)
  const mail = await resolveMailConfig(sb, c.env);
  notifyUpgradeStatus({
    memberId,
    memberEmail: await getMemberEmail(sb, memberId),
    status: "PENDING",
    sb,
    resendApiKey: c.env.RESEND_API_KEY,
    resendFrom: mail.from,
    resendReplyTo: mail.replyTo,
  }).catch((err) => console.error("[upgrade-requests] POST notify error:", err));

  return c.json({ success: true, data }, 201);
});

// FIX: DELETE /upgrade-requests/:id — member cancels own pending request
app.delete("/:id", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const row = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`
  );
  if (!row) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");
  if (row.member_id !== memberId) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  if (row.status !== "PENDING") {
    throw new AppError(400, "Only pending requests can be cancelled.", "BAD_REQUEST");
  }
  await sb.remove("upgrade_requests", `id=eq.${c.req.param("id")}`);
  return c.json({ success: true, message: "Request cancelled." });
});

// PATCH /upgrade-requests/:id — admin status transitions
app.patch("/:id", requireAdmin, async (c) => {
  const sb = createSupabase(c.env);
  const rawBody = await c.req.json();

  // Extract notify meta-flag — do not persist to DB
  const { notify, ...updateBody } = rawBody;
  const shouldNotify = notify !== false;

  // Fetch current record to detect status change
  const current = await sb.selectOne<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`
  );
  if (!current) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");

  const oldStatus = current.status;
  const newStatus: string | undefined = updateBody.status;
  const reviewerMemberId = c.get("memberId");
  if (!reviewerMemberId) {
    throw new AppError(404, "Admin member not found for this account", "NOT_FOUND");
  }

  const data = await sb.update<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`,
    {
      ...updateBody,
      updated_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(), // FIX: always set reviewed_at
      reviewed_by: reviewerMemberId, // FK → members.id
    }
  );
  if (!data) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");

  if (newStatus === "APPROVED" && oldStatus !== "APPROVED") {
    await sb.insert("tier_change_history", {
      member_id: current.member_id,
      changed_by: reviewerMemberId,
      previous_tier: current.from_tier,
      new_tier: current.to_tier,
    });
    await sb.update("members", `id=eq.${current.member_id}`, { tier: current.to_tier });
  }

  // Notify only when status actually changed AND notify !== false
  if (shouldNotify && newStatus && newStatus !== oldStatus) {
    const mail = await resolveMailConfig(sb, c.env);
    notifyUpgradeStatus({
      memberId: current.member_id,
      memberEmail: await getMemberEmail(sb, current.member_id),
      status: newStatus,
      adminNotes: updateBody.admin_notes,
      sb,
      resendApiKey: c.env.RESEND_API_KEY,
      resendFrom: mail.from,
      resendReplyTo: mail.replyTo,
    }).catch((err) => console.error("[upgrade-requests] PATCH notify error:", err));
  }

  return c.json({ success: true, data });
});

async function resolveMailConfig(sb: SupabaseClient, env: Bindings) {
  const settings = await getAppSettings(sb);
  return {
    from: resolveMailFrom(settings, env.RESEND_FROM),
    replyTo: resolveMailReplyTo(settings, env.RESEND_FROM),
  };
}

async function getMemberEmail(
  sb: ReturnType<typeof createSupabase>,
  memberId: string
): Promise<string> {
  const member = await sb.selectOne<{ email: string }>("members", `id=eq.${memberId}`);
  return member?.email ?? "";
}

export default app;

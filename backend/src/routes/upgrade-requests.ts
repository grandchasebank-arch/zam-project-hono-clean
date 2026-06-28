import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { requireAuth, requireAuthWithMember } from "../middleware/auth";
import { AppError } from "../lib/errors";
import { notifyUpgradeStatus } from "../lib/notify";
import type { Bindings, Variables } from "../types/env";

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

// GET /upgrade-requests — own requests
app.get("/", requireAuthWithMember, async (c) => {
  const memberId = c.get("memberId");
  if (!memberId) throw new AppError(404, "Member not found for this account", "NOT_FOUND");
  const sb = createSupabase(c.env);
  const data = await sb.select("upgrade_requests", `member_id=eq.${memberId}&order=created_at.desc`);
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

  // Map frontend field names → DB column names; ignore any client-sent status
  const data = await sb.insert<UpgradeRequestRow>("upgrade_requests", {
    from_tier: body.from_tier ?? body.current_tier,
    to_tier: body.to_tier ?? body.requested_tier,
    member_id: memberId,
    status: "PENDING",
  });

  // Look up member email for notification (fire-and-forget)
  notifyUpgradeStatus({
    memberId,
    memberEmail: await getMemberEmail(sb, memberId),
    status: "PENDING",
    sb,
    resendApiKey: c.env.RESEND_API_KEY,
    resendFrom: c.env.RESEND_FROM,
  }).catch((err) => console.error("[upgrade-requests] POST notify error:", err));

  return c.json({ success: true, data }, 201);
});

// PATCH /upgrade-requests/:id — admin status transitions
app.patch("/:id", requireAuth, async (c) => {
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

  const data = await sb.update<UpgradeRequestRow>(
    "upgrade_requests",
    `id=eq.${c.req.param("id")}`,
    { ...updateBody, updated_at: new Date().toISOString() }
  );
  if (!data) throw new AppError(404, "Upgrade request not found", "NOT_FOUND");

  // Notify only when status actually changed AND notify !== false
  if (shouldNotify && newStatus && newStatus !== oldStatus) {
    notifyUpgradeStatus({
      memberId: current.member_id,
      memberEmail: await getMemberEmail(sb, current.member_id),
      status: newStatus,
      adminNotes: updateBody.admin_notes,
      sb,
      resendApiKey: c.env.RESEND_API_KEY,
      resendFrom: c.env.RESEND_FROM,
    }).catch((err) => console.error("[upgrade-requests] PATCH notify error:", err));
  }

  return c.json({ success: true, data });
});

async function getMemberEmail(
  sb: ReturnType<typeof createSupabase>,
  memberId: string
): Promise<string> {
  const member = await sb.selectOne<{ email: string }>("members", `id=eq.${memberId}`);
  return member?.email ?? "";
}

export default app;

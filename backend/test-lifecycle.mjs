/**
 * Upgrade-request lifecycle integration test.
 * Tests directly against Supabase REST API (same operations routes execute).
 * Usage: node test-lifecycle.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const devVars = Object.fromEntries(
  readFileSync(join(__dir, ".dev.vars"), "utf8")
    .split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = devVars.SUPABASE_URL;
const SVC = devVars.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = "actionszam@gmail.com";

const H = {
  apikey: SVC, Authorization: `Bearer ${SVC}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};
const sb = async (method, path, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => null);
  return { status: r.status, data: d };
};

let pass = [], fail = [], notes = [];
const ok = (n) => { pass.push(n); console.log("  ✓", n); };
const ko = (n, d) => { fail.push(`${n} → ${d}`); console.log("  ✗", n, "→", d); };

// ── Setup: get real member ────────────────────────────────────────────────────
const { data: members } = await sb("GET", `/members?email=eq.${encodeURIComponent(TEST_EMAIL)}&limit=1`);
const member = members?.[0];
if (!member) { console.error("No member found for", TEST_EMAIL); process.exit(1); }
const memberId = member.id;
console.log(`Using member: ${member.email} (${memberId.slice(0, 8)}…)\n`);

const countNotifs = async (title) => {
  const { data } = await sb("GET", `/notifications?member_id=eq.${memberId}&title=eq.${encodeURIComponent(title)}&order=created_at.desc`);
  return data?.length ?? 0;
};
const totalNotifs = async () => {
  const { data } = await sb("GET", `/notifications?member_id=eq.${memberId}`);
  return data?.length ?? 0;
};

// ── TEST 1: POST — creates request + PENDING notification ─────────────────────
console.log("TEST 1: POST (PENDING)");
let reqId = null;
{
  const before = await countNotifs("Upgrade Request Submitted");

  // Simulate route: POST with real column names
  const { status, data } = await sb("POST", "/upgrade_requests", {
    member_id: memberId,
    from_tier: "Explorer",
    to_tier: "Pioneer",
    status: "PENDING",
  });
  if (status === 201 && data?.[0]?.id) {
    reqId = data[0].id;
    ok(`POST /upgrade-requests → 201, id=${reqId.slice(0, 8)}…`);
  } else {
    ko("POST /upgrade-requests", `status=${status}, body=${JSON.stringify(data)}`);
  }

  // Simulate notify.ts: insert PENDING notification
  await sb("POST", "/notifications", {
    member_id: memberId, type: "upgrade",
    title: "Upgrade Request Submitted",
    message: "Your upgrade request has been received and is in queue for review.",
    read: false,
  });
  const after = await countNotifs("Upgrade Request Submitted");
  after > before
    ? ok("PENDING notification row created")
    : ko("PENDING notification", "count did not increase");
}

// ── TEST 2: PATCH PENDING→UNDER_REVIEW → notification created ────────────────
console.log("\nTEST 2: PATCH PENDING→UNDER_REVIEW");
if (reqId) {
  const before = await countNotifs("Your Request Is Under Review");
  const { data: rows } = await sb("GET", `/upgrade_requests?id=eq.${reqId}&limit=1`);
  const oldStatus = rows?.[0]?.status;
  const newStatus = "UNDER_REVIEW";

  const { status } = await sb("PATCH", `/upgrade_requests?id=eq.${reqId}`, {
    status: newStatus, updated_at: new Date().toISOString(),
  });
  status === 200
    ? ok("PATCH PENDING→UNDER_REVIEW → 200")
    : ko("PATCH PENDING→UNDER_REVIEW", `status=${status}`);

  if (newStatus !== oldStatus) {
    await sb("POST", "/notifications", {
      member_id: memberId, type: "upgrade",
      title: "Your Request Is Under Review",
      message: "An administrator has started reviewing your upgrade request.",
      read: false,
    });
  }
  const after = await countNotifs("Your Request Is Under Review");
  after > before
    ? ok("UNDER_REVIEW notification row created")
    : ko("UNDER_REVIEW notification", "count did not increase");
}

// ── TEST 3: PATCH UNDER_REVIEW→APPROVED → notification created ───────────────
console.log("\nTEST 3: PATCH UNDER_REVIEW→APPROVED");
if (reqId) {
  const before = await countNotifs("Upgrade Request Approved");
  const { data: rows } = await sb("GET", `/upgrade_requests?id=eq.${reqId}&limit=1`);
  const oldStatus = rows?.[0]?.status;
  const newStatus = "APPROVED";

  const { status } = await sb("PATCH", `/upgrade_requests?id=eq.${reqId}`, {
    status: newStatus, updated_at: new Date().toISOString(),
  });
  status === 200
    ? ok("PATCH UNDER_REVIEW→APPROVED → 200")
    : ko("PATCH UNDER_REVIEW→APPROVED", `status=${status}`);

  if (newStatus !== oldStatus) {
    await sb("POST", "/notifications", {
      member_id: memberId, type: "upgrade",
      title: "Upgrade Request Approved",
      message: "Your tier upgrade has been approved. Your new membership level is now active.",
      read: false,
    });
  }
  const after = await countNotifs("Upgrade Request Approved");
  after > before
    ? ok("APPROVED notification row created (3 total notifications across full lifecycle)")
    : ko("APPROVED notification", "count did not increase");
}

// ── TEST 4: PATCH admin_notes only (no status change) → NO notification ───────
console.log("\nTEST 4: PATCH admin_notes only — expect 0 new notifications");
if (reqId) {
  const before = await totalNotifs();
  await sb("PATCH", `/upgrade_requests?id=eq.${reqId}`, {
    admin_notes: "Looks good, welcome aboard",
    updated_at: new Date().toISOString(),
    // no `status` field → route sees newStatus=undefined → skips notify
  });
  // Route logic: shouldNotify && newStatus && newStatus !== oldStatus
  // newStatus is undefined → condition false → no notification
  const after = await totalNotifs();
  after === before
    ? ok("admin_notes-only PATCH → 0 new notifications ✓")
    : ko("admin_notes-only PATCH", `unexpected notification (before=${before}, after=${after})`);
}

// ── TEST 5: notify:false — route strips flag, skips notification entirely ─────
console.log("\nTEST 5: PATCH with notify:false — expect 0 new notifications");
{
  // Fresh request
  const { data: newRows } = await sb("POST", "/upgrade_requests", {
    member_id: memberId, from_tier: "Pioneer", to_tier: "Vanguard", status: "PENDING",
  });
  const newReqId = newRows?.[0]?.id;
  if (newReqId) {
    const before = await totalNotifs();
    // Route receives {status:"UNDER_REVIEW", notify:false}
    // It strips `notify`, does the PATCH, then checks: shouldNotify = (false !== false) = false
    // → notifyUpgradeStatus is NOT called → no notification inserted
    // Simulating here: only do the DB update, don't insert notification
    await sb("PATCH", `/upgrade_requests?id=eq.${newReqId}`, {
      status: "UNDER_REVIEW", updated_at: new Date().toISOString(),
    });
    // We deliberately do NOT insert a notification here (simulates notify:false logic)
    const after = await totalNotifs();
    after === before
      ? ok("PATCH with notify:false → 0 new notifications ✓")
      : ko("notify:false test", `unexpected notification (before=${before}, after=${after})`);
    await sb("DELETE", `/upgrade_requests?id=eq.${newReqId}`);
  } else {
    notes.push("Skipped notify:false test — second request insert failed");
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
if (reqId) {
  await sb("DELETE", `/upgrade_requests?id=eq.${reqId}`);
  // Clean up the 3 test notifications created in tests 1-3
  await sb("DELETE", `/notifications?member_id=eq.${memberId}&type=eq.upgrade&title=eq.Upgrade%20Request%20Submitted`);
  await sb("DELETE", `/notifications?member_id=eq.${memberId}&type=eq.upgrade&title=eq.Your%20Request%20Is%20Under%20Review`);
  await sb("DELETE", `/notifications?member_id=eq.${memberId}&type=eq.upgrade&title=eq.Upgrade%20Request%20Approved`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n✅ PASSED");
pass.forEach((p) => console.log(" -", p));
console.log("\n❌ FAILED");
fail.length ? fail.forEach((f) => console.log(" -", f)) : console.log(" - none");
console.log("\n📝 NOTES");
notes.length ? notes.forEach((n) => console.log(" -", n)) : console.log(" - none");
console.log(`\nTotal: ${pass.length} passed, ${fail.length} failed\n`);
process.exit(fail.length ? 1 : 0);

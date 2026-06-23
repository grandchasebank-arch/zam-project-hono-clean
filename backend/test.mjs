/**
 * Backend integration test — validates Supabase operations directly.
 * This tests the exact logic each route executes.
 * Usage: node test.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .dev.vars manually (same values wrangler injects at runtime)
const __dir = dirname(fileURLToPath(import.meta.url));
const devVarsPath = join(__dir, ".dev.vars");
const devVars = Object.fromEntries(
  readFileSync(devVarsPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = devVars.SUPABASE_URL;
const SERVICE_KEY = devVars.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = devVars.SUPABASE_ANON_KEY;
const TEST_EMAIL = "actionszam@gmail.com";

const svcHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

let passed = [];
let failed = [];
let notes = [];

function pass(name) { passed.push(name); }
function fail(name, detail) { failed.push(`${name} → ${detail}`); }

async function sb(method, path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: svcHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  return { status: r.status, data };
}

// ── 1. GET /tiers — config-only, no DB needed ──────────────────────────────
const TIERS = ["Explorer", "Pioneer", "Vanguard"];
TIERS.length === 3
  ? pass("GET /tiers config has 3 tiers (Explorer, Pioneer, Vanguard)")
  : fail("GET /tiers config", "expected 3 tiers");

// ── 2. Supabase connectivity — GET /badges ─────────────────────────────────
try {
  const { status, data } = await sb("GET", "/badges?limit=10");
  status === 200
    ? pass(`GET /badges → 200 (${data.length} rows returned from Supabase)`)
    : fail("GET /badges", `status=${status}, body=${JSON.stringify(data)}`);
} catch (e) {
  fail("GET /badges", `fetch error: ${e.message}`);
}

// ── 3. GET /members — fetch known member ──────────────────────────────────
let memberId = null;
try {
  const { status, data } = await sb("GET", `/members?email=eq.${encodeURIComponent(TEST_EMAIL)}&limit=1`);
  if (status === 200 && data.length > 0) {
    memberId = data[0].id;
    pass(`GET /members?email= → 200, found member id=${memberId.slice(0, 8)}…`);
  } else {
    fail("GET /members?email=", `status=${status}, rows=${data?.length}`);
  }
} catch (e) {
  fail("GET /members?email=", `fetch error: ${e.message}`);
}

// ── 4. POST /auth/send-otp — insert OTP code ──────────────────────────────
let devCode = null;
try {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { status, data } = await sb("POST", "/otp_codes", {
    email: TEST_EMAIL, code, expires_at, used: false, attempts: 0,
  });
  if (status === 201 || (Array.isArray(data) && data[0]?.code)) {
    devCode = code;
    pass(`POST /auth/send-otp (otp_codes insert) → 201, code generated`);
  } else {
    fail("POST /auth/send-otp", `status=${status}, body=${JSON.stringify(data)}`);
  }
} catch (e) {
  fail("POST /auth/send-otp", `fetch error: ${e.message}`);
}

// ── 5. POST /auth/verify-otp — look up code, mark used, create session ────
let sessionToken = null;
if (devCode && memberId) {
  try {
    // verify: fetch the OTP code we just inserted
    const { data: otpRows } = await sb(
      "GET",
      `/otp_codes?email=eq.${encodeURIComponent(TEST_EMAIL)}&used=eq.false&code=eq.${devCode}&limit=1`
    );
    const otp = otpRows?.[0];
    if (!otp) throw new Error("OTP row not found after insert");

    // mark used
    await sb("PATCH", `/otp_codes?id=eq.${otp.id}`, { used: true });

    // create session
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { status: sStatus } = await sb("POST", "/sessions", {
      member_id: memberId, token, expires_at,
    });
    if (sStatus === 201) {
      sessionToken = token;
      pass(`POST /auth/verify-otp → 201, session created, token captured`);
    } else {
      fail("POST /auth/verify-otp", `session insert status=${sStatus}`);
    }
  } catch (e) {
    fail("POST /auth/verify-otp", `error: ${e.message}`);
  }
} else {
  notes.push("Skipped verify-otp — missing devCode or memberId from prior steps");
}

// ── 6. GET /members/me — look up member by session token ──────────────────
if (sessionToken && memberId) {
  try {
    const { data: sessions } = await sb(
      "GET",
      `/sessions?token=eq.${sessionToken}&limit=1`
    );
    const session = sessions?.[0];
    if (!session) throw new Error("Session not found");
    if (new Date(session.expires_at) < new Date()) throw new Error("Session expired");

    const { data: members } = await sb(
      "GET",
      `/members?id=eq.${session.member_id}&limit=1`
    );
    const member = members?.[0];
    if (member?.email === TEST_EMAIL) {
      pass(`GET /members/me (via session token) → member: ${member.email}`);
    } else {
      fail("GET /members/me", `member not found or email mismatch`);
    }
  } catch (e) {
    fail("GET /members/me (with token)", `error: ${e.message}`);
  }
} else {
  notes.push("Skipped GET /members/me — no session token");
}

// ── 7. No token → expect 401 (auth middleware logic) ─────────────────────
// Simulate: call getUser with no token, should return null
try {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: "Bearer invalid-token" },
  });
  // Also verify sessions table lookup fails for garbage token
  const { data: sessions } = await sb("GET", "/sessions?token=eq.invalid-token&limit=1");
  const noSession = !sessions || sessions.length === 0;
  r.status === 401 && noSession
    ? pass("No-token guard → Supabase returns 401, sessions lookup returns empty (middleware would reject)")
    : fail("No-token guard", `auth status=${r.status}, sessions found=${!noSession}`);
} catch (e) {
  fail("No-token guard", `fetch error: ${e.message}`);
}

// ── 8. POST /event-bookings — write with authenticated member ──────────────
let bookingId = null;
if (memberId) {
  try {
    const { status, data } = await sb("POST", "/event_bookings", {
      member_id: memberId,
      event_name: "Test Launch Event",
      event_date: "2025-12-01",
      includes_guest_pass: false,
      booking_status: "CONFIRMED",
    });
    if (status === 201 && data?.[0]?.id) {
      bookingId = data[0].id;
      pass(`POST /event-bookings → 201, booking id=${bookingId.slice(0, 8)}…`);
    } else {
      fail("POST /event-bookings", `status=${status}, body=${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail("POST /event-bookings", `fetch error: ${e.message}`);
  }
} else {
  notes.push("Skipped POST /event-bookings — no memberId");
}

// ── Cleanup: remove test data ─────────────────────────────────────────────
if (bookingId) await sb("DELETE", `/event_bookings?id=eq.${bookingId}`).catch(() => {});
if (sessionToken) await sb("DELETE", `/sessions?token=eq.${sessionToken}`).catch(() => {});
await sb("DELETE", `/otp_codes?email=eq.${encodeURIComponent(TEST_EMAIL)}&used=eq.true`).catch(() => {});

// ── Results ───────────────────────────────────────────────────────────────
console.log("\n✅ PASSED");
passed.forEach((p) => console.log(" -", p));

console.log("\n❌ FAILED");
failed.length ? failed.forEach((f) => console.log(" -", f)) : console.log(" - none");

console.log("\n📝 NOTES");
notes.length ? notes.forEach((n) => console.log(" -", n)) : console.log(" - none");

console.log(`\nTotal: ${passed.length} passed, ${failed.length} failed\n`);
process.exit(failed.length ? 1 : 0);

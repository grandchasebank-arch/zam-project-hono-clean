/**
 * App mail integration tests — run with API up: pnpm dev:api
 *
 *   node test-mail-app.mjs
 *   node test-mail-app.mjs --only=otp,provider
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.API_URL ?? "http://127.0.0.1:8787";
const TEST_EMAIL = "operator@spacex.hq";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadDevVars() {
  const raw = readFileSync(resolve(__dirname, ".dev.vars"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function mailtrapHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Api-Token": apiKey,
    Accept: "application/json",
  };
}

// --- Test functions ---

/** API is up */
export async function testApiHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) pass("API health");
    else fail("API health", `HTTP ${res.status}`);
  } catch (e) {
    fail("API health", String(e));
  }
}

/** GET /dev/mail-test — provider flag resolves to mailtrap locally */
export async function testMailProviderStatus() {
  const res = await fetch(`${BASE}/dev/mail-test`, { signal: AbortSignal.timeout(5000) });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    fail("Mail provider status", json?.error?.message ?? `HTTP ${res.status}`);
    return null;
  }
  const d = json?.data;
  if (d?.provider === "mailtrap") {
    pass("Mail provider status", `provider=mailtrap inbox=${d.mailtrap_inbox_id ?? "auto"}`);
  } else if (d?.provider === "resend") {
    pass("Mail provider status", "provider=resend");
  } else {
    fail("Mail provider status", `unexpected provider=${d?.provider}`);
  }
  return d;
}

/** POST /dev/mail-test — dev route sends through active provider */
export async function testMailSendRoute() {
  const res = await fetch(`${BASE}/dev/mail-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: TEST_EMAIL }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.sent) {
    fail("Dev mail-test route", json?.error?.message ?? `HTTP ${res.status}`);
    return null;
  }
  pass("Dev mail-test route", `sent via ${json.data.provider} → ${json.data.to}`);
  return json.data;
}

/** POST /auth/send-otp — real app OTP flow uses mail layer */
export async function testOtpEmail() {
  await sleep(2500);
  const res = await fetch(`${BASE}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json().catch(() => null);
  const data = json?.data;
  if (!res.ok) {
    fail("OTP send-otp", json?.error?.message ?? `HTTP ${res.status}`);
    return null;
  }
  if (data?.email_sent) {
    pass("OTP send-otp", "email_sent=true (no _dev_code fallback)");
  } else if (data?._dev_code) {
    fail("OTP send-otp", "fell back to _dev_code — mail provider not active in worker");
  } else {
    fail("OTP send-otp", "unexpected response");
  }
  return data;
}

/** Upgrade notify — admin status change triggers notification email */
export async function testUpgradeNotifyEmail() {
  const headers = { Authorization: "Bearer dev-bypass-admin", "Content-Type": "application/json" };

  const pendingRes = await fetch(`${BASE}/upgrade-requests/pending`, {
    headers: { Authorization: "Bearer dev-bypass" },
    signal: AbortSignal.timeout(10000),
  });
  const pending = (await pendingRes.json())?.data ?? [];
  const request = pending[0];
  if (!request?.id) {
    fail("Upgrade notify email", "no in-flight upgrade request — create one in the app first");
    return null;
  }

  // Bump status so notify fires (UNDER_REVIEW → AWAITING_PAYMENT)
  if (request.status !== "UNDER_REVIEW") {
    await fetch(`${BASE}/upgrade-requests/${request.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "UNDER_REVIEW", notify: false }),
      signal: AbortSignal.timeout(10000),
    });
    await sleep(1500);
  }

  const patchRes = await fetch(`${BASE}/upgrade-requests/${request.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "AWAITING_PAYMENT", notify: true }),
    signal: AbortSignal.timeout(15000),
  });
  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => null);
    fail("Upgrade notify email", err?.error?.message ?? `HTTP ${patchRes.status}`);
    return null;
  }
  pass("Upgrade notify email", `PATCH notify → AWAITING_PAYMENT (${request.id.slice(0, 8)}…)`);
  await sleep(3000);
  return request.id;
}

/** Mailtrap inbox — confirm a recent message exists */
export async function testMailtrapInbox(search = "sign-in") {
  const dev = loadDevVars();
  const apiKey = dev.MAILTRAP_API_KEY;
  const inboxId = dev.MAILTRAP_INBOX_ID;
  if (!apiKey) {
    fail("Mailtrap inbox", "MAILTRAP_API_KEY missing in .dev.vars");
    return null;
  }
  if (!inboxId) {
    fail("Mailtrap inbox", "MAILTRAP_INBOX_ID missing — set it for faster inbox checks");
    return null;
  }

  const headers = await mailtrapHeaders(apiKey);
  const res = await fetch(
    `https://mailtrap.io/api/inboxes/${inboxId}/messages?search=${encodeURIComponent(search)}`,
    { headers, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    fail("Mailtrap inbox", `API HTTP ${res.status}`);
    return null;
  }
  const messages = await res.json();
  const list = Array.isArray(messages) ? messages : messages?.data ?? [];
  if (list.length === 0) {
    fail("Mailtrap inbox", `no messages matching "${search}"`);
    return null;
  }
  pass("Mailtrap inbox", `found "${list[0].subject}"`);
  return list[0];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Runner ---

const ALL_TESTS = {
  health: testApiHealth,
  provider: testMailProviderStatus,
  route: testMailSendRoute,
  otp: testOtpEmail,
  upgrade: testUpgradeNotifyEmail,
  inbox: () => testMailtrapInbox("mail test"),
};

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice(7)?.split(",").map((s) => s.trim()).filter(Boolean);

  console.log(`\nMail app tests → ${BASE}\n`);

  const entries = only?.length
    ? only.filter((k) => ALL_TESTS[k]).map((k) => [k, ALL_TESTS[k]])
    : Object.entries(ALL_TESTS);

  if (only?.length && entries.length === 0) {
    console.error(`Unknown test(s). Available: ${Object.keys(ALL_TESTS).join(", ")}`);
    process.exit(1);
  }

  for (const [name, fn] of entries) {
    console.log(`[${name}]`);
    try {
      await fn();
    } catch (e) {
      const label = { health: "API health", provider: "Mail provider", route: "Dev mail-test", otp: "OTP send-otp", upgrade: "Upgrade notify", inbox: "Mailtrap inbox" }[name] ?? name;
      fail(label, e instanceof Error ? e.message : String(e));
    }
    console.log("");
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Done: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

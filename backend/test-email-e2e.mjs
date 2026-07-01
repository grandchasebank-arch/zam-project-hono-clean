/**
 * E2E: payment flow + OTP email via Mailtrap sandbox.
 * Run: node test-email-e2e.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "http://127.0.0.1:8787";
const MEMBER_TOKEN = "dev-bypass";
const ADMIN_TOKEN = "dev-bypass-admin";
const TEST_EMAIL = "operator@spacex.hq";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadDevVars() {
  const raw = readFileSync(resolve(__dirname, ".dev.vars"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

async function api(pathname, opts = {}, token = MEMBER_TOKEN) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body && !(opts.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...opts.headers,
    },
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function resolveMailtrapInboxId(apiKey, configured) {
  if (configured?.trim()) return configured.trim();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Api-Token": apiKey,
    Accept: "application/json",
  };
  const accountsRes = await fetch("https://mailtrap.io/api/accounts", { headers });
  if (!accountsRes.ok) throw new Error(`accounts ${accountsRes.status}`);
  const accounts = await accountsRes.json();
  const accountId = accounts[0]?.id;
  const inboxesRes = await fetch(
    `https://mailtrap.io/api/accounts/${accountId}/inboxes`,
    { headers }
  );
  if (!inboxesRes.ok) throw new Error(`inboxes ${inboxesRes.status}`);
  const inboxes = await inboxesRes.json();
  return String(inboxes[0]?.id ?? "");
}

async function listSandboxMessages(apiKey, inboxId, search) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Api-Token": apiKey,
    Accept: "application/json",
  };
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`https://mailtrap.io/api/inboxes/${inboxId}/messages${qs}`, { headers });
  if (!res.ok) throw new Error(`messages ${res.status}`);
  return res.json();
}

async function getMessageText(apiKey, inboxId, messageId) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Api-Token": apiKey,
    Accept: "application/json",
  };
  const res = await fetch(
    `https://mailtrap.io/api/inboxes/${inboxId}/messages/${messageId}/body.txt`,
    { headers }
  );
  if (!res.ok) throw new Error(`body ${res.status}`);
  return res.text();
}

async function waitForMessage(apiKey, inboxId, predicate, timeoutMs = 20000, search) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const messages = await listSandboxMessages(apiKey, inboxId, search);
    const list = Array.isArray(messages) ? messages : messages?.data ?? [];
    const hit = list.find(predicate);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function main() {
  console.log("=== Email + Payment E2E ===\n");
  const devVars = loadDevVars();
  const apiKey = devVars.MAILTRAP_API_KEY?.trim();

  if (!apiKey) {
    fail("MAILTRAP_API_KEY", "missing in .dev.vars");
    return summary();
  }
  pass("MAILTRAP_API_KEY", "configured");

  let inboxId;
  try {
    inboxId = await resolveMailtrapInboxId(apiKey, devVars.MAILTRAP_INBOX_ID);
    pass("Mailtrap inbox", `id=${inboxId}`);
  } catch (e) {
    fail("Mailtrap inbox", String(e));
    return summary();
  }

  try {
    const h = await fetch(`${BASE}/health`);
    if (h.ok) pass("API health");
    else fail("API health", `HTTP ${h.status}`);
  } catch (e) {
    fail("API health", String(e));
    return summary();
  }

  // Ensure support_email for payment flow test
  const settingsPatch = await api(
    "/admin/settings",
    { method: "PATCH", body: JSON.stringify({ support_email: "support@spacex.hq" }) },
    ADMIN_TOKEN
  );
  if (settingsPatch.res.ok) pass("Admin settings", "support_email set");
  else fail("Admin settings", settingsPatch.json?.error?.message ?? `HTTP ${settingsPatch.res.status}`);

  // OTP email test
  const otpRes = await fetch(`${BASE}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const otpJson = await otpRes.json().catch(() => null);
  const otpData = otpJson?.data ?? otpJson;
  if (otpRes.ok && otpData?.email_sent) {
    pass("OTP send-otp", "email_sent=true");
  } else if (otpRes.ok && otpData?._dev_code) {
    fail("OTP send-otp", "fell back to _dev_code — MAILTRAP not active in worker");
  } else {
    fail("OTP send-otp", otpJson?.error?.message ?? `HTTP ${otpRes.status}`);
  }

  await new Promise((r) => setTimeout(r, 2500));

  const otpMsg = await waitForMessage(
    apiKey,
    inboxId,
    (m) =>
      (m.subject ?? "").toLowerCase().includes("sign-in") ||
      (m.subject ?? "").toLowerCase().includes("code")
  );
  if (otpMsg) {
    const body = await getMessageText(apiKey, inboxId, otpMsg.id);
    const hasCode = /\b\d{6}\b/.test(body);
    if (hasCode) pass("Mailtrap OTP message", `subject="${otpMsg.subject}"`);
    else fail("Mailtrap OTP message", "no 6-digit code in body");
  } else {
    fail("Mailtrap OTP message", "not found in inbox within 15s");
  }

  // Payment flow (abbreviated from test-payment-flow.mjs)
  const memberRes = await api("/members/me");
  const member = memberRes.json?.data ?? memberRes.json;
  if (!memberRes.res.ok) {
    fail("GET /members/me", `HTTP ${memberRes.res.status}`);
    return summary();
  }
  pass("GET /members/me", `tier=${member.tier}`);

  // Upgrade notification before another OTP burst (Mailtrap rate limits)
  const tiersRes = await api("/tiers");
  const tiers = tiersRes.json?.data ?? tiersRes.json ?? [];
  const currentRank = tiers.find((x) => x.name === member.tier)?.rank ?? 0;
  const target = tiers.filter((t) => t.rank > currentRank).at(-1);
  if (!target) {
    fail("Target tier", "none");
    return summary();
  }

  const createRes = await api("/upgrade-requests", {
    method: "POST",
    body: JSON.stringify({ from_tier: member.tier, to_tier: target.name }),
  });
  if (createRes.res.status === 201) {
    pass("Create upgrade request", `status=${createRes.json?.data?.status ?? createRes.json?.status}`);
    await new Promise((r) => setTimeout(r, 3000));
  } else if (createRes.res.status === 409) {
    pass("Create upgrade request", "already in-flight (409)");
    const notifyPendingRes = await api("/upgrade-requests/pending");
    const notifyPending = notifyPendingRes.json?.data ?? notifyPendingRes.json ?? [];
    const inflight = notifyPending.find((p) => p.to_tier === target.name);
    if (inflight) {
      if (inflight.status !== "UNDER_REVIEW") {
        await api(
          `/upgrade-requests/${inflight.id}`,
          { method: "PATCH", body: JSON.stringify({ status: "UNDER_REVIEW", notify: false }) },
          ADMIN_TOKEN
        );
      }
      const notifyRes = await api(
        `/upgrade-requests/${inflight.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "AWAITING_PAYMENT", amount_paid: 0, notify: true }),
        },
        ADMIN_TOKEN
      );
      if (notifyRes.res.ok) {
        pass("Trigger upgrade email", "admin notify → AWAITING_PAYMENT");
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        fail("Trigger upgrade email", notifyRes.json?.error?.message ?? `HTTP ${notifyRes.res.status}`);
      }
    }
  } else {
    fail("Create upgrade request", createRes.json?.error?.message ?? `HTTP ${createRes.res.status}`);
  }

  const upgradeMsg = await waitForMessage(
    apiKey,
    inboxId,
    (m) => {
      const subject = (m.subject ?? "").toLowerCase();
      return (
        subject.includes("awaiting payment") ||
        subject.includes("under review") ||
        (subject.includes("payment") && !subject.includes("sign-in"))
      );
    },
    20000,
    "Awaiting"
  );
  if (upgradeMsg) {
    pass("Mailtrap upgrade notification", `subject="${upgradeMsg.subject}"`);
  } else {
    const recent = await listSandboxMessages(apiKey, inboxId);
    const subjects = (Array.isArray(recent) ? recent : recent?.data ?? [])
      .slice(0, 5)
      .map((m) => m.subject)
      .join(" | ");
    fail("Mailtrap upgrade notification", subjects ? `recent: ${subjects}` : "inbox empty");
  }

  // Receipt upload on in-flight request
  const pendingRes = await api("/upgrade-requests/pending");
  const pending = pendingRes.json?.data ?? pendingRes.json ?? [];
  const request = pending.find((p) => p.to_tier === target.name);
  if (!request) {
    fail("In-flight request", "not found");
    return summary();
  }

  if (request.status === "PAYMENT_SUBMITTED") {
    const reset = await api(
      `/upgrade-requests/${request.id}`,
      { method: "PATCH", body: JSON.stringify({ status: "AWAITING_PAYMENT", amount_paid: 0, notify: false }) },
      ADMIN_TOKEN
    );
    if (reset.res.ok) pass("Reset for receipt test", "AWAITING_PAYMENT");
    else fail("Reset for receipt test", `HTTP ${reset.res.status}`);
  }

  const receiptPath = path.join(process.cwd(), "test-fixtures", "test-receipt.png");
  if (!fs.existsSync(receiptPath)) {
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(
      receiptPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );
  }

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(receiptPath)], { type: "image/png" }), "test-receipt.png");
  form.append("amount_claimed", String(Number(target.price) || 6000));

  const uploadRes = await api(`/upgrade-requests/${request.id}/receipts`, {
    method: "POST",
    body: form,
    headers: {},
  });
  if (uploadRes.res.status === 201) {
    pass("Receipt upload", "201");
  } else {
    fail("Receipt upload", uploadRes.json?.error?.message ?? `HTTP ${uploadRes.res.status}`);
  }

  const detailRes = await api(`/upgrade-requests/${request.id}`);
  const detail = detailRes.json?.data ?? detailRes.json;
  if (detail?.status === "PAYMENT_SUBMITTED") pass("Status after upload", "PAYMENT_SUBMITTED");
  else fail("Status after upload", detail?.status ?? "unknown");

  const settingsRes = await fetch(`${BASE}/settings/public`);
  const settings = (await settingsRes.json())?.data;
  if (settings?.support_email) pass("Public settings", settings.support_email);
  else fail("Public settings", "support_email missing");

  summary();
}

function summary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

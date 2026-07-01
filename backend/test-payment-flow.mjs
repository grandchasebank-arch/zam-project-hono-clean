import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:8787";
const MEMBER_TOKEN = "dev-bypass";
const ADMIN_TOKEN = "dev-bypass-admin";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
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

async function main() {
  console.log("=== Payment flow API E2E ===\n");

  try {
    const h = await fetch(`${BASE}/health`);
    if (h.ok) pass("API health");
    else fail("API health", `HTTP ${h.status}`);
  } catch (e) {
    fail("API health", String(e));
    process.exit(1);
  }

  const flagsRes = await api("/feature-flags/public");
  const f = flagsRes.json?.data ?? flagsRes.json;
  const keys = ["payment_instructions", "receipt_upload", "split_payment"];
  if (flagsRes.res.ok && keys.every((k) => k in f)) {
    pass("Feature flags (3 separate keys)", JSON.stringify({
      payment_instructions: f.payment_instructions,
      receipt_upload: f.receipt_upload,
      split_payment: f.split_payment,
    }));
    if (f.payment_instructions && f.receipt_upload && !f.split_payment) {
      pass("Rollout state", "instructions+upload ON, split OFF");
    } else {
      fail("Rollout state", JSON.stringify(f));
    }
  } else {
    fail("Feature flags", `HTTP ${flagsRes.res.status}`);
  }

  const memberRes = await api("/members/me");
  if (!memberRes.res.ok) {
    fail("GET /members/me", `HTTP ${memberRes.res.status}`);
    return summary();
  }
  const member = memberRes.json?.data ?? memberRes.json;
  pass("GET /members/me", `tier=${member.tier}`);

  const tiersRes = await api("/tiers");
  const tiers = tiersRes.json?.data ?? tiersRes.json ?? [];
  const currentRank = tiers.find((x) => x.name === member.tier)?.rank ?? 0;
  const target = tiers.filter((t) => t.rank > currentRank).at(-1);
  if (!target) {
    fail("Target tier", "none available");
    return summary();
  }
  pass("Target tier", `${target.name} ($${target.price})`);

  const pendingRes = await api("/upgrade-requests/pending");
  const pending = pendingRes.json?.data ?? pendingRes.json ?? [];
  let request = pending.find((p) => p.to_tier === target.name);

  if (request) {
    pass("Existing in-flight request", `${request.id.slice(0, 8)}… status=${request.status}`);
    if (!["AWAITING_PAYMENT", "REQUESTED", "PENDING"].includes(request.status)) {
      const reset = await api(
        `/upgrade-requests/${request.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "AWAITING_PAYMENT", amount_paid: 0, notify: false }) },
        ADMIN_TOKEN
      );
      if (reset.res.ok) {
        request = reset.json?.data ?? reset.json;
        pass("Admin reset to AWAITING_PAYMENT", request.id.slice(0, 8));
      } else {
        fail("Admin reset", reset.json?.error?.message ?? `HTTP ${reset.res.status}`);
        return summary();
      }
    }
  } else {
    const createRes = await api("/upgrade-requests", {
      method: "POST",
      body: JSON.stringify({ from_tier: member.tier, to_tier: target.name }),
    });
    if (!createRes.res.ok) {
      fail("POST /upgrade-requests", createRes.json?.error?.message ?? `HTTP ${createRes.res.status}`);
      return summary();
    }
    request = createRes.json?.data ?? createRes.json;
    pass("Create request", `status=${request.status} total=${request.total_amount}`);
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
  form.append("amount_claimed", String(Number(target.price) || target.price_cents / 100 || 6000));

  const uploadRes = await api(`/upgrade-requests/${request.id}/receipts`, {
    method: "POST",
    body: form,
    headers: {},
  });
  if (uploadRes.res.status === 201) {
    const receipt = uploadRes.json?.data ?? uploadRes.json;
    pass("POST receipt upload", `receipt=${receipt.status} amount=${receipt.amount_claimed}`);
  } else {
    fail("POST receipt upload", uploadRes.json?.error?.message ?? `HTTP ${uploadRes.res.status}`);
    return summary();
  }

  const detailRes = await api(`/upgrade-requests/${request.id}`);
  const detail = detailRes.json?.data ?? detailRes.json;
  if (detail.status === "PAYMENT_SUBMITTED") {
    pass("Request after upload", "PAYMENT_SUBMITTED");
  } else {
    fail("Request after upload", `status=${detail.status}`);
  }

  const receiptsRes = await api(`/upgrade-requests/${request.id}/receipts`);
  const receipts = receiptsRes.json?.data ?? receiptsRes.json ?? [];
  if (receipts.length >= 1) pass("GET receipts", `count=${receipts.length}`);
  else fail("GET receipts", "empty");

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

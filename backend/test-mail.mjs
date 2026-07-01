/**
 * Quick Mailtrap sandbox smoke test (run with backend dev server stopped or in parallel).
 * Usage: node test-mail.mjs [recipient@example.com]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const env = loadDevVars();
const apiKey = env.MAILTRAP_API_KEY?.trim();
const to = process.argv[2] || "test@example.com";

if (!apiKey) {
  console.error("MAILTRAP_API_KEY missing in backend/.dev.vars");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Api-Token": apiKey,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const accountsRes = await fetch("https://mailtrap.io/api/accounts", { headers });
if (!accountsRes.ok) {
  console.error("Accounts lookup failed:", accountsRes.status, await accountsRes.text());
  process.exit(1);
}
const accounts = await accountsRes.json();
const accountId = accounts[0]?.id;
if (!accountId) {
  console.error("No Mailtrap account found.");
  process.exit(1);
}

let inboxId = env.MAILTRAP_INBOX_ID?.trim();
if (!inboxId) {
  const inboxesRes = await fetch(
    `https://mailtrap.io/api/accounts/${accountId}/inboxes`,
    { headers }
  );
  if (!inboxesRes.ok) {
    console.error("Inbox lookup failed:", inboxesRes.status, await inboxesRes.text());
    process.exit(1);
  }
  const inboxes = await inboxesRes.json();
  inboxId = String(inboxes[0]?.id ?? "");
}
if (!inboxId) {
  console.error("No sandbox inbox. Create one at mailtrap.io or set MAILTRAP_INBOX_ID.");
  process.exit(1);
}

const from = env.RESEND_FROM || "noreply@example.com";
const body = {
  from: { email: from },
  to: [{ email: to }],
  subject: "Zam App — Mailtrap test",
  text: "If you see this in Mailtrap, email is configured correctly.",
  html: "<p>If you see this in Mailtrap, email is configured correctly.</p>",
};

const sendRes = await fetch(`https://sandbox.api.mailtrap.io/api/send/${inboxId}`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});

if (!sendRes.ok) {
  console.error("Send failed:", sendRes.status, await sendRes.text());
  process.exit(1);
}

console.log(`OK — test message sent to sandbox inbox ${inboxId} (recipient: ${to})`);
console.log("Open https://mailtrap.io/inboxes to view it.");

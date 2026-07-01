import type { Bindings } from "../types/env";

export interface SendMailInput {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export type EmailProviderName = "mailtrap" | "resend";

type MailBindings = Pick<
  Bindings,
  | "EMAIL_PROVIDER"
  | "MAILTRAP_API_KEY"
  | "MAILTRAP_INBOX_ID"
  | "RESEND_API_KEY"
  | "RESEND_FROM"
>;

/** Parse `"Name <email@x.com>"` or plain email. */
export function parseFromAddress(from: string): { email: string; name?: string } {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  }
  return { email: trimmed };
}

function hasResendKey(env: MailBindings): boolean {
  const key = env.RESEND_API_KEY?.trim();
  return Boolean(key && !key.includes("your_resend"));
}

/**
 * Resolve active email provider from EMAIL_PROVIDER flag:
 * - `auto` (default): Mailtrap when MAILTRAP_API_KEY is set, else Resend
 * - `mailtrap`: force Mailtrap Email Testing API (sandbox inbox)
 * - `resend`: force Resend (production)
 */
export function resolveEmailProvider(env: MailBindings): EmailProviderName | null {
  const flag = env.EMAIL_PROVIDER?.trim().toLowerCase() ?? "auto";

  if (flag === "mailtrap") {
    return env.MAILTRAP_API_KEY?.trim() ? "mailtrap" : null;
  }
  if (flag === "resend") {
    return hasResendKey(env) ? "resend" : null;
  }

  // auto
  if (env.MAILTRAP_API_KEY?.trim()) return "mailtrap";
  if (hasResendKey(env)) return "resend";
  return null;
}

export function getEmailProviderStatus(env: MailBindings) {
  const configuredFlag = env.EMAIL_PROVIDER?.trim() || "auto";
  const provider = resolveEmailProvider(env);
  const inboxId = env.MAILTRAP_INBOX_ID?.trim();

  return {
    configured_flag: configuredFlag,
    provider: provider ?? "none",
    mailtrap_configured: Boolean(env.MAILTRAP_API_KEY?.trim()),
    resend_configured: hasResendKey(env),
    mailtrap_inbox_id: inboxId || null,
    mailtrap_inbox_url: inboxId
      ? `https://mailtrap.io/inboxes/${inboxId}`
      : "https://mailtrap.io/inboxes",
  };
}

let cachedInboxId: string | null = null;

async function resolveMailtrapInboxId(
  apiKey: string,
  configured?: string
): Promise<string> {
  if (configured?.trim()) return configured.trim();
  if (cachedInboxId) return cachedInboxId;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Api-Token": apiKey,
    Accept: "application/json",
  };

  const accountsRes = await fetch("https://mailtrap.io/api/accounts", { headers });
  if (!accountsRes.ok) {
    throw new Error(
      `Mailtrap accounts lookup failed (${accountsRes.status}). Set MAILTRAP_INBOX_ID in backend/.dev.vars`
    );
  }

  const accounts = (await accountsRes.json()) as Array<{ id: number }>;
  const accountId = accounts[0]?.id;
  if (!accountId) {
    throw new Error("No Mailtrap account found for this API token.");
  }

  const inboxesRes = await fetch(
    `https://mailtrap.io/api/accounts/${accountId}/inboxes`,
    { headers }
  );
  if (!inboxesRes.ok) {
    throw new Error(
      `Mailtrap inbox lookup failed (${inboxesRes.status}). Set MAILTRAP_INBOX_ID manually.`
    );
  }

  const inboxes = (await inboxesRes.json()) as Array<{ id: number }>;
  const inboxId = inboxes[0]?.id;
  if (!inboxId) {
    throw new Error("No Mailtrap sandbox inbox found. Create one at mailtrap.io.");
  }

  cachedInboxId = String(inboxId);
  return cachedInboxId;
}

/** Mailtrap Email Testing API (REST) — captures mail in sandbox inbox, not real delivery. */
async function sendMailtrap(
  env: MailBindings,
  input: SendMailInput,
  attempt = 1
): Promise<void> {
  const apiKey = env.MAILTRAP_API_KEY!.trim();
  const inboxId = await resolveMailtrapInboxId(apiKey, env.MAILTRAP_INBOX_ID);
  const from = parseFromAddress(input.from);

  const body: Record<string, unknown> = {
    from: { email: from.email, ...(from.name ? { name: from.name } : {}) },
    to: [{ email: input.to }],
    subject: input.subject,
    text: input.text,
    html: input.html ?? `<p style="font-family:sans-serif;line-height:1.6">${input.text}</p>`,
  };
  if (input.replyTo) {
    body.headers = { "Reply-To": input.replyTo };
  }

  const res = await fetch(`https://sandbox.api.mailtrap.io/api/send/${inboxId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Api-Token": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return sendMailtrap(env, input, attempt + 1);
    }
    throw new Error(`Mailtrap API error ${res.status}: ${err}`);
  }
}

async function sendResend(env: MailBindings, input: SendMailInput): Promise<void> {
  const apiKey = env.RESEND_API_KEY!.trim();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<p style="font-family:sans-serif;line-height:1.6">${input.text}</p>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

/**
 * Send email via Mailtrap Testing API (local dev) or Resend (production).
 * Provider is chosen by EMAIL_PROVIDER flag. Returns true when sent successfully.
 */
export async function sendEmail(env: MailBindings, input: SendMailInput): Promise<boolean> {
  if (!input.to?.trim() || !input.from?.trim()) return false;

  const provider = resolveEmailProvider(env);
  if (!provider) return false;

  if (provider === "mailtrap") {
    await sendMailtrap(env, input);
    return true;
  }

  await sendResend(env, input);
  return true;
}

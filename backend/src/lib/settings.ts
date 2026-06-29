import type { SupabaseClient } from "./supabase";
import type { SettingsRow } from "../types/settings";

export async function getAppSettings(sb: SupabaseClient): Promise<SettingsRow | null> {
  return sb.selectOne<SettingsRow>("settings", "id=eq.1");
}

/** Resend "from" header: settings override env fallback. */
export function resolveMailFrom(settings: SettingsRow | null, envFrom: string): string {
  const email = settings?.mail_from_email?.trim() || envFrom;
  const name = settings?.mail_from_name?.trim();
  if (!email) return envFrom;
  return name ? `${name} <${email}>` : email;
}

export function resolveMailReplyTo(
  settings: SettingsRow | null,
  fallback?: string
): string | undefined {
  const reply = settings?.mail_reply_to?.trim() || settings?.support_email?.trim() || fallback;
  return reply || undefined;
}

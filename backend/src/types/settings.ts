/** Singleton app settings row (id = 1). Laravel AppSettings parallel. */
export interface SettingsRow {
  id: number;
  site_name: string;
  site_tagline: string | null;
  logo_url: string | null;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_website: string | null;
  support_email: string | null;
  mail_from_email: string | null;
  mail_from_name: string | null;
  mail_reply_to: string | null;
  maintenance_mode: boolean;
  upgrade_enabled: boolean;
  feature_flags: Record<string, unknown>;
  updated_at: string;
}

export const SETTINGS_PATCH_FIELDS = [
  "site_name",
  "site_tagline",
  "logo_url",
  "company_name",
  "company_address",
  "company_phone",
  "company_website",
  "support_email",
  "mail_from_email",
  "mail_from_name",
  "mail_reply_to",
  "maintenance_mode",
  "upgrade_enabled",
  "feature_flags",
] as const;

export type SettingsPatchField = (typeof SETTINGS_PATCH_FIELDS)[number];

export const SETTINGS_PUBLIC_SELECT =
  "site_name,site_tagline,logo_url,company_name,company_address,company_phone,company_website,support_email,maintenance_mode,upgrade_enabled";

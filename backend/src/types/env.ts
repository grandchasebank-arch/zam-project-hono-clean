export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGINS?: string;
  /** `auto` (default) | `mailtrap` | `resend` — see backend/.dev.vars.example */
  EMAIL_PROVIDER?: string;
  /** Mailtrap Email Testing API token (local dev — captures to sandbox inbox) */
  MAILTRAP_API_KEY?: string;
  /** Optional; auto-discovered from Mailtrap API when omitted */
  MAILTRAP_INBOX_ID?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM: string;
  /** Local dev only — member UUID to impersonate when Bearer token is `dev-bypass` */
  DEV_BYPASS_MEMBER_ID?: string;
  /** Local dev only — admin member UUID when Bearer token is `dev-bypass-admin` */
  DEV_BYPASS_ADMIN_MEMBER_ID?: string;
};

export type Variables = {
  validated?: unknown;
  authUserId?: string;
  memberId?: string;
};

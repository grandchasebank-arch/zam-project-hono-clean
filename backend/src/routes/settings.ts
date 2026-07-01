import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const PUBLIC_DEFAULTS = {
  site_name: "SpaceX Member Portal",
  site_tagline: "Member Portal",
  logo_url: "/logo.png",
  company_name: "SpaceX HQ",
  company_address: null as string | null,
  company_phone: null as string | null,
  company_website: null as string | null,
  support_email: null as string | null,
  maintenance_mode: false,
  upgrade_enabled: true,
};

// GET /settings/public — branding + gates for member portal (no secrets)
app.get("/public", async (c) => {
  const sb = createSupabase(c.env);
  const data = await sb.selectOne<typeof PUBLIC_DEFAULTS>("settings", "id=eq.1");
  if (!data) {
    return c.json({ success: true, data: PUBLIC_DEFAULTS });
  }
  return c.json({
    success: true,
    data: {
      site_name: data.site_name ?? PUBLIC_DEFAULTS.site_name,
      site_tagline: data.site_tagline ?? PUBLIC_DEFAULTS.site_tagline,
      logo_url: data.logo_url ?? PUBLIC_DEFAULTS.logo_url,
      company_name: data.company_name ?? PUBLIC_DEFAULTS.company_name,
      company_address: data.company_address ?? PUBLIC_DEFAULTS.company_address,
      company_phone: data.company_phone ?? PUBLIC_DEFAULTS.company_phone,
      company_website: data.company_website ?? PUBLIC_DEFAULTS.company_website,
      support_email: data.support_email ?? PUBLIC_DEFAULTS.support_email,
      maintenance_mode: data.maintenance_mode ?? PUBLIC_DEFAULTS.maintenance_mode,
      upgrade_enabled: data.upgrade_enabled ?? PUBLIC_DEFAULTS.upgrade_enabled,
    },
  });
});

export default app;

import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import type { Bindings, Variables } from "../types/env";
import { SETTINGS_PUBLIC_SELECT } from "../types/settings";

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
  const data = await sb.selectOne<typeof PUBLIC_DEFAULTS>(
    "settings",
    `id=eq.1&select=${SETTINGS_PUBLIC_SELECT}`
  );
  return c.json({
    success: true,
    data: data ?? PUBLIC_DEFAULTS,
  });
});

export default app;

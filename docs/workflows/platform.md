# Platform Workflow

**Domain:** Platform — *What global rules does HQ set?*  
**Tables:** `settings` (singleton row)  
**Laravel parallel:** `settings` table + `Admin/Settings/AppSettingsController`

---

## Plain summary

HQ configures app-wide rules in one place: site name, support contact, whether upgrades are enabled, maintenance mode, and feature flags. Members never edit these — they only feel the effects (e.g. upgrades disabled → upgrade button hidden).

---

## Admin flow (planned)

```
1. /admin/settings (UI future)
2. GET /admin/settings — read current config
3. PATCH /admin/settings — update flags
4. Changes apply on next API request / page load
```

---

## Settings keys

| Key | Type | Purpose |
|---|---|---|
| `site_name` | text | Branding |
| `support_email` | text | Admin alerts + member support |
| `maintenance_mode` | boolean | Block portal when true |
| `upgrade_enabled` | boolean | Disable upgrade flow without deploy |
| `feature_flags` | jsonb | Gradual rollout (`{ "events": false }`) |

---

## Laravel parallel

Grandbank reads `Settings::where('id', 1)->first()` on deposits, verification, emails, and feature toggles (`enable_kyc`, `enable_verification`). Same singleton pattern — one row, many columns (or key-value in zam-app).

---

## Public read (future)

For frontend gates without admin session:

```
GET /settings/public → { maintenance_mode, upgrade_enabled }
```

No secrets exposed.

---

## Related files

| Layer | Path |
|---|---|
| Migration | `supabase/migrations/20260629000002_create_settings_table.sql` |
| Admin API | `backend/src/routes/admin.ts` |
| Architecture | [database-domains.md](../architecture/database-domains.md) |

---

## Status

- **DB + admin API:** `supabase/migrations/20260629000002_create_settings_table.sql`
- **Public API:** `GET /settings/public` (maintenance_mode, upgrade_enabled, site_name)
- **Admin API:** `GET/PATCH /admin/settings`
- **Admin UI:** not built yet
- **Frontend maintenance gate:** not built yet

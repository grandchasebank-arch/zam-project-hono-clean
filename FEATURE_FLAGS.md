# Feature Flags — Feature / Module Analysis

**Last updated:** 2026-06-30  
**Notion:** [Architecture cheat sheet](https://app.notion.com/p/38fb4ab87a2f80efa000fe7a9da29837)

---

## Status

Planning phase complete. Migration `20260630000001_feature_flags_and_payment_receipts.sql` **applied** to Supabase. Backend lookup + admin toggle API implemented.

---

## Purpose

- Let HQ turn features on/off **without redeploying** the member portal or admin app.
- Support **per-member overrides** for comps, early access, or one-off grants.
- Gate new payment/receipt UI, dashboard placeholders, and admin tools as they ship.

---

## How It Works

1. **Global flags** live in `feature_flags` (one row per flag key).
2. **Member overrides** live in `member_feature_overrides` (optional row per member + flag).
3. **Lookup order** (first match wins):
   - Member override (`enabled` true/false)
   - Global flag row (`enabled`)
   - Default: `false` (safe off)
4. **Platform switches** (`maintenance_mode`, `upgrade_enabled`) stay on `settings` id=1 — checked before feature flags for upgrade flow.
5. **Public API** exposes only flags needed by the member portal (no admin-only flags).
6. **Admin API** lists all flags + CRUD overrides per member.

---

## Location

### Database (planned)

- `supabase/migrations/20260630000001_feature_flags_and_payment_receipts.sql`
- `feature_flags` — global toggles
- `member_feature_overrides` — per-member exceptions

### Backend (planned)

- `backend/src/lib/featureFlags.ts` — `isFeatureEnabled(sb, memberId, key)`
- `backend/src/routes/feature-flags.ts` — public read
- `backend/src/routes/admin.ts` — admin flag + override management

### Frontend (planned)

- `frontend/src/hooks/useFeatureFlags.ts`
- `frontend/src/lib/api.ts` — `getPublicFeatureFlags()`
- Gates in routes/components (payment upload, teasers, floating CTA)

### Admin (planned)

- `admin/src/pages/settings/` or dedicated flags section
- Member edit page: override toggles

### Related existing

- `settings.feature_flags` jsonb — **deprecated for new flags**; migrate to `feature_flags` table over time
- `settings.upgrade_enabled`, `settings.maintenance_mode` — keep as-is

---

## Schema (planned)

### `feature_flags`

| Column | Type | Purpose |
|--------|------|---------|
| `key` | text PK | Stable identifier (snake_case) |
| `label` | text | Admin UI label |
| `description` | text | What it gates |
| `category` | text | `PAYMENT` \| `DASHBOARD` \| `ADMIN` |
| `enabled` | boolean | Global default when no override |
| `updated_at` | timestamptz | Last change |

### `member_feature_overrides`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `member_id` | uuid FK → members | |
| `flag_key` | text FK → feature_flags.key | |
| `enabled` | boolean | Force on/off for this member |
| `set_by` | uuid FK → members | Admin who set it |
| `note` | text | Reason (comp, beta, etc.) |
| `created_at` | timestamptz | |

Unique: `(member_id, flag_key)`

---

## The 8 flags (trimmed list)

| Key | Category | Default | Reason |
|-----|----------|---------|--------|
| `receipt_upload` | PAYMENT | `false` | Gates receipt upload UI + `POST .../receipts` until payment flow is ready |
| `split_payment` | PAYMENT | `false` | Allows `PARTIALLY_PAID` status and multiple receipts per request |
| `payment_instructions` | PAYMENT | `false` | Shows Payment Instructions page (replaces fake checkout) |
| `achievements_tab` | DASHBOARD | `false` | Badges in-page tab for achievement badges (placeholder data OK) |
| `network_teaser` | DASHBOARD | `false` | Home “community” teaser card |
| `rewards_teaser` | DASHBOARD | `false` | Home rewards progress teaser |
| `floating_upgrade_cta` | DASHBOARD | `false` | Persistent floating upgrade button on tab screens |
| `receipt_review_inbox` | ADMIN | `false` | Admin flat receipt queue (A4 in ADMIN_CONTROLS.md) |

**Not in this table (settings columns):** `upgrade_enabled`, `maintenance_mode` — checked separately.

---

## Rule of thumb — flag vs no flag

| Use a flag when | Skip a flag when |
|-----------------|------------------|
| Shipping incrementally; UI can be half-built | Core auth, routing, or data integrity |
| Admin may need to disable without deploy | Always-on business rules (tier rank validation) |
| Per-member beta/comp access | Single global kill switch already on `settings` |

---

## Adding a new flag (process)

1. Add row to seed in migration (or admin UI later).
2. Document in this file (key, category, default, reason).
3. Gate backend route with `isFeatureEnabled` if member-facing.
4. Gate frontend with `useFeatureFlags`.
5. Add to `GET /settings/public` or `GET /feature-flags/public` response if member needs it.

---

## User Flow

Members do not manage flags. They only see UI that is enabled:

- If `payment_instructions` off → legacy `/payment` submit (until removed).
- If `receipt_upload` off → no upload button on instructions page.
- If `floating_upgrade_cta` off → upgrade only from Home/Badges links.

---

## Business Rules

- Default **off** for all new flags until HQ enables globally.
- Member override **wins** over global flag.
- Admin-only flags (`receipt_review_inbox`) are never exposed on public API.
- Removing a flag key: soft-deprecate (stop reading) before dropping DB row.

---

## API Endpoints (planned)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/feature-flags/public` | Public/member | Member-relevant flags only |
| GET | `/admin/feature-flags` | Admin | All global flags |
| PATCH | `/admin/feature-flags/:key` | Admin | Toggle global flag |
| GET | `/admin/members/:id/feature-overrides` | Admin | List overrides |
| PUT | `/admin/members/:id/feature-overrides/:key` | Admin | Set override |
| DELETE | `/admin/members/:id/feature-overrides/:key` | Admin | Remove override |

---

## Dependencies

- **PAYMENT_FLOW.md** — `receipt_upload`, `split_payment`, `payment_instructions`
- **DASHBOARD_STRUCTURE.md** — dashboard teasers, floating CTA, achievements tab
- **ADMIN_CONTROLS.md** — receipt inbox, member overrides UI
- **settings** table — `upgrade_enabled`, `maintenance_mode`, `site_name`, `support_email`

---

## Known Issues / Open Questions

- Legacy `settings.feature_flags` jsonb may contain stale keys — audit before migration.
- Achievement badges need data model (future); flag can ship with static placeholder list.
- No UI yet for admin flag management (Phase 2+).

---

## Related Features

- [PAYMENT_FLOW.md](./PAYMENT_FLOW.md)
- [ADMIN_CONTROLS.md](./ADMIN_CONTROLS.md)
- [DASHBOARD_STRUCTURE.md](./DASHBOARD_STRUCTURE.md)
- [docs/workflows/platform.md](./docs/workflows/platform.md)

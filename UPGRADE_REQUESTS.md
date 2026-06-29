# Upgrade Requests — Feature / Module Analysis

**Last updated:** 2026-06-29  
**Notion:** [Upgrade Requests — Feature / Module Analysis](https://app.notion.com/p/38db4ab87a2f81e0a69ccb831a93462b)

---

## Status

Reflects DB-driven tiers refactor, admin auth, cancel flow, admin upgrade review UI, sonner toasts, E2E verification (8/9 pass), and repo cleanup (2026-06-29).

---

## Purpose

- Lets authenticated members request a membership tier upgrade (Explorer, Pioneer, or Vanguard).
- Stores each request in the `upgrade_requests` database table with status `PENDING` until an admin reviews it.
- On approval, updates the member's tier and records the change in `tier_change_history`.
- Sends in-app notifications (and optional email via Resend) when status changes.
- The same `upgrade_requests` rows are reused by the frontend as **Payment History** records.

---

## How It Works

1. **Tier catalog (DB-driven)** — `GET /tiers` reads active rows from the `tiers` table via `backend/src/routes/tiers.ts`. `mapTierRow()` normalizes DB shape to frontend expectations (`benefits`, `features`, `variant`, formatted `price`).
2. **Tier selection** — `UpgradeForm` calls `useUpgradeTiers()` and `usePendingRequests()`. `TierCard` shows **"PENDING — request in review"** only when that tier's `name` matches a pending request's `to_tier` (not globally).
3. **Payment / submit step** — `Payment.tsx` reads the selected tier from `sessionStorage` (`spacex_selected_tier`). If missing, redirects to `/upgrade`. Loads current member via `useMember()`.
4. **Create request** — User clicks "Submit Upgrade Request". `useSubmitUpgrade()` sends `POST /upgrade-requests` with `{ from_tier, to_tier }`. Backend validates tiers exist in DB, checks rank (target must be higher), blocks duplicate PENDING for the same `to_tier`, and always inserts `status: "PENDING"`.
5. **Backend side effects on POST** — `notifyUpgradeStatus()` inserts a `notifications` row (`type: "upgrade"`) and optionally sends a Resend email. Errors are logged, not thrown.
6. **Success UI + toasts** — Sonner `<Toaster>` in `main.tsx`. Submit success shows toast and invalidates `history`, `member`, and `pendingRequests` query caches.
7. **Cancel pending** — Member can `DELETE /upgrade-requests/:id` (own PENDING rows only). `PaymentPreview` exposes "Cancel Request" with inline confirm. `useCancelUpgrade()` shows success/error toasts and refreshes caches.
8. **Admin review** — `PATCH /upgrade-requests/:id` requires `requireAdmin` (member `role = admin`). Sets `reviewed_at` and `reviewed_by` on every PATCH. Supports `notify: false` to skip notifications.
9. **Approval cascade** — When status changes to `APPROVED`: inserts `tier_change_history` row and updates `members.tier` to `to_tier`.
10. **Status notifications** — On status change, `notifyUpgradeStatus()` runs for `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`.
11. **History view** — `GET /upgrade-requests` returns the member's own requests, mapped by `api.mapPayment()` into `PaymentRecord` for `/history`.

---

## Location

### Backend

- `backend/src/routes/upgrade-requests.ts` — member CRUD + admin PATCH
- `backend/src/routes/tiers.ts` — public tier catalog from DB
- `backend/src/routes/admin.ts` — `GET /admin/upgrade-requests`, tier CRUD (`/admin/tiers`)
- `backend/src/lib/notify.ts` — `notifyUpgradeStatus()`
- `backend/src/middleware/auth.ts` — `requireAuth`, `requireAuthWithMember`, `requireAdmin`
- `backend/src/index.ts` — mounts `/upgrade-requests`, `/tiers`, `/admin`

### Frontend

- `frontend/src/routes/Upgrade.tsx` — route wrapper
- `frontend/src/components/upgrade/UpgradeForm.tsx` — tier selection + pending badges
- `frontend/src/components/upgrade/TierList.tsx`, `TierCard.tsx` — per-tier PENDING badge
- `frontend/src/routes/Payment.tsx` — submit step
- `frontend/src/components/payment/SuccessState.tsx` — post-submit confirmation
- `frontend/src/hooks/useUpgrade.ts` — `useUpgradeTiers`, `usePendingRequests`, `useSubmitUpgrade`, `useCancelUpgrade`
- `frontend/src/lib/api.ts` — `getUpgradeTiers`, `getHistory`, `getPaymentById`
- `frontend/src/lib/queryKeys.ts` — `upgradeTiers`, `pendingRequests`
- `frontend/src/types/upgrade.ts` — DB-shaped `TierOption`, `UpgradeRequest`
- `frontend/src/routes/History.tsx` — payment history list
- `frontend/src/components/history/PaymentPreview.tsx` — detail drawer + cancel flow
- `frontend/src/routes/Admin/UpgradeRequests.tsx` — admin review queue (approve / reject / under review)
- `frontend/src/hooks/useAdminUpgrade.ts` — admin list + review mutations

### Database schema

- `lib/db/src/schema/upgrade_requests.ts` — Drizzle schema reference
- `supabase/migrations/20260623000000_initial_schema.sql` — `upgrade_requests` table
- `supabase/migrations/20260623000001_rls_policies.sql` — RLS policies
- `supabase/migrations/20260628000000_create_tiers_table.sql` — `tiers` table + RLS
- `supabase/migrations/20260628000001_seed_tiers.sql` — Explorer / Pioneer / Vanguard seed
- `supabase/migrations/20260629000000_tier_fk_constraints.sql` — FK on `upgrade_requests`, `members`, `badges` → `tiers(name)`
- `supabase/migrations/20260629000001_drop_otp_tokens.sql` — dropped unused `otp_tokens` table

---

## User Flow

1. **Entry points** — Dashboard ("Upgrade Clearance"), Profile link, or direct `/upgrade`.
2. **Select tier** — User views tier cards; cards with a pending request for that tier show PENDING badge. User selects a tier, clicks "Confirm Upgrade".
3. **Review & submit** — Redirected to `/payment`. Sees benefits, price summary, clicks "Submit Upgrade Request".
4. **Confirmation** — `SuccessState` shown; success toast; user can return to dashboard.
5. **Track status** — `/history` shows past requests; `/notifications` for status updates; upgrade page shows per-tier pending badges.
6. **Cancel** — From history detail drawer, member can cancel a PENDING request. "Cancel" on upgrade page returns to `/dashboard`.

---

## Business Rules

- **Authentication required** — Member routes use `requireAuthWithMember`. Missing member → `404 NOT_FOUND`.
- **Admin authorization** — `PATCH /upgrade-requests/:id` and `/admin/*` routes use `requireAdmin` (checks `members.role = 'admin'`).
- **Status on create** — New requests always start as `PENDING`; client cannot set status on POST.
- **Field mapping** — Frontend `current_tier` / `requested_tier` map to DB `from_tier` / `to_tier`.
- **Tier validation** — Both tiers must exist in `tiers` with `is_active = true`. Requested tier `rank` must be greater than current tier `rank`.
- **Duplicate pending (per tier)** — Only one PENDING request per `to_tier` per member. Different target tiers allowed concurrently. Returns `409 CONFLICT` with message.
- **Member scoping** — `GET /upgrade-requests`, `GET /upgrade-requests/pending`, `GET /upgrade-requests/:id`, `DELETE /upgrade-requests/:id` filter/verify by authenticated `memberId`.
- **Cancel rules** — DELETE only allowed on own rows with `status = PENDING`.
- **Approval side effects** — `APPROVED` triggers `tier_change_history` insert and `members.tier` update.
- **Review metadata** — PATCH always sets `reviewed_at` and `reviewed_by` (admin auth user ID).
- **Notification opt-out** — PATCH accepts `notify: false` to skip notifications.
- **Tier source** — Tiers are database-driven; admin can CRUD via `/admin/tiers` (soft delete via `is_active: false`).
- **FK integrity** — `upgrade_requests.from_tier` / `to_tier`, `members.tier`, and `badges.tier_required` reference `tiers(name)`.
- **RLS (Supabase direct access)** — Members can SELECT and INSERT their own `upgrade_requests` rows only. Backend uses service role for PATCH/DELETE.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tiers` | Public | Active tiers from DB, mapped for frontend |
| GET | `/tiers/:id` | Public | Single active tier |
| GET | `/upgrade-requests` | Member | Own requests (history) |
| GET | `/upgrade-requests/pending` | Member | Own PENDING requests only (for badges) |
| GET | `/upgrade-requests/:id` | Member | Single own request |
| POST | `/upgrade-requests` | Member | Submit new PENDING request |
| DELETE | `/upgrade-requests/:id` | Member | Cancel own PENDING request |
| PATCH | `/upgrade-requests/:id` | Admin | Status transitions + review metadata |
| GET | `/admin/upgrade-requests` | Admin | All requests listing |
| GET/POST/PATCH/DELETE | `/admin/tiers` | Admin | Tier CRUD (DELETE = soft deactivate) |

---

## Dependencies

**Internal:** `createSupabase()`, `AppError`, auth middleware, `useMember()`, TanStack Query, Sonner

**Database tables:** `tiers`, `upgrade_requests`, `members`, `tier_change_history`, `notifications`

**External:** Supabase (project `aibptakbrksycxyyypjq`), Resend (optional; `RESEND_API_KEY`, `RESEND_FROM`)

---

## E2E Verification (8/9 pass)

Test member: `operator@spacex.hq` (dev-bypass). Admin: `admin@spacex.hq` (OTP).

| # | Test | Result |
|---|------|--------|
| 1 | Tiers load, no false PENDING badges | PASS |
| 2 | Submit upgrade request | PASS |
| 3 | Pioneer PENDING badge only on matching tier | PASS |
| 4 | Block same-tier duplicate (409) | PASS |
| 5 | Different tier while another pending | PASS |
| 6 | Cancel Vanguard request | PASS |
| 7 | Admin approve Pioneer → notification row | **FAIL** — tier/history updated; no `notifications` row |
| 8 | Member PATCH → 403 Forbidden | PASS |
| 9 | Profile shows approved tier (Pioneer) | PASS |

**Test 7 (suspected):** `notifyUpgradeStatus()` may fail silently when `RESEND_API_KEY` is a placeholder. Check worker logs and `backend/src/lib/notify.ts`.

---

## Known Issues

- **Notification on admin approve (E2E #7)** — Approval updates tier and history but in-app notification row may not be created.
- **`PaymentSummary.tsx` hardcoded PENDING** — `/payment` shows "Security Status: PENDING" before submit regardless of actual state.
- **409 error message in UI** — Some paths may surface generic "HTTP 409" instead of server message.
- **`payment_reference` / `payment_verified` unused** — DB columns exist; no real payment integration in submit flow.
- **`reviewed_by` FK** — Now stores admin `members.id` (not auth UUID).
- **No dedicated admin UI** — ~~Backend only~~ **Resolved:** `/admin/upgrade-requests` UI added.

---

## Resolved

- ~~No admin role check on PATCH~~ — `requireAdmin` middleware
- ~~No dedicated admin UI for upgrade review~~ — `/admin/upgrade-requests` (2026-06-29)
- ~~`reviewed_by` stored auth UUID~~ — now stores admin `members.id`
- ~~Hardcoded TIERS in config.ts~~ — Migrated to `tiers` table
- ~~No tier-order validation~~ — Server validates rank on POST
- ~~No duplicate pending check~~ — Per-tier PENDING block with 409
- ~~Orphaned `/processing` route~~ — Removed
- ~~Unused `queryKeys.upgradeStatus`~~ — Replaced by `pendingRequests`
- ~~No cache invalidation after submit~~ — Invalidates history, member, pendingRequests
- ~~No cancel flow~~ — DELETE endpoint + PaymentPreview UI + toasts
- ~~Global PENDING badge~~ — Badge only on matching `to_tier`
- ~~Lovable.dev / SSR artifacts~~ — Removed unused error-capture and client.server files
- ~~Stale Drizzle migrations~~ — Removed `backend/migrations/`; use `supabase/migrations/`

---

## Related Features

- **Notifications** — `notifyUpgradeStatus()` creates `type: "upgrade"` notifications
- **Payment History** — `/history` reads `upgrade_requests` via `api.getHistory()`
- **Member profile** — Tier updated on approval
- **Tier change history** — Written on approval; `GET /tier-change-history`
- **Badges** — `badges.tier_required` FK to `tiers(name)`
- **Admin tier management** — `/admin/tiers` CRUD

---

## Repo Cleanup (2026-06-29)

Removed unused/generated files: repomix output, debug logs, stale `package-lock.json`, `supabase/.temp/`, orphaned routes/components (`Processing.tsx`, `PaymentDetail.tsx`, `InvoiceExport.tsx`), Lovable.dev artifacts, empty `config.ts`, and legacy `backend/migrations/`.

See `.gitignore` for patterns that prevent these from being re-committed.

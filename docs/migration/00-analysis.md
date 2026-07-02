# AETHERIS Next.js Migration - Phase 0 Analysis

This document is the source-of-truth inventory for migrating the current `zam-project-hono-clean` / AETHERIS repo from Hono on Cloudflare Workers plus two Vite apps into a Next.js 15 App Router app.

Scope note: this phase is analysis only. No source files, package files, config files, or schema files were changed. The current repo is treated as the fact sheet even where older docs disagree with code.

## Key findings

- The backend exposes 55 Hono handlers: 2 root handlers, 2 dev mail handlers, 36 member/public handlers, and 15 admin handlers.
- No route currently uses a Zod schema. `backend/src/middleware/validate.ts` defines `validateJson(schema)`, but nothing imports it. The "zod schema used" column below therefore says "none active" for every route.
- Both frontends consume the Hono API through `fetch` helpers. The member frontend has an unused Supabase client stub; runtime data goes through the backend API.
- `packages/shared-types` is not consumed by backend, frontend, or admin. Real types are duplicated inside each app.
- Supabase migrations are more current than `supabase/types.ts`; generated types are missing `tiers`, `settings`, `feature_flags`, `member_feature_overrides`, `payment_receipts`, and new `upgrade_requests` amount fields.
- Several docs are stale: they still describe `PENDING` as the create status, reference old frontend admin paths, and mention files that do not exist.

## 1. Hono route inventory

Global backend behavior:

- Entry point: `backend/src/index.ts`
- Global middleware: `logger()`, dynamic CORS, `errorHandler`
- CORS env: `ALLOWED_ORIGINS`, default `http://localhost:5173`; local/private LAN origins are also allowed when `DEV_BYPASS_MEMBER_ID` is set.
- Success envelope: mostly `{ success: true, data }`
- Error envelope: `{ success: false, error, code? }` from `AppError`
- Exceptions:
  - `GET /` returns `{ status, time }` without `success`
  - `DELETE /upgrade-requests/:id` returns `{ success: true, message }` without `data`

Auth middleware:

| Middleware | File | Token behavior | Variables set |
|---|---|---|---|
| `requireAuth` | `backend/src/middleware/auth.ts` | Requires `Authorization: Bearer <token>`; accepts Supabase JWT, OTP session token, or dev bypass token | `authUserId` |
| `requireAuthWithMember` | `backend/src/middleware/auth.ts` | Same as above; also resolves a member row or session member | `authUserId`, `memberId` when available |
| `requireAdmin` | `backend/src/middleware/auth.ts` | Same as above plus `members.role === "admin"` check | `authUserId`, `memberId` when available |
| Local dev gate | `backend/src/routes/mail-test.ts` | Requires `DEV_BYPASS_MEMBER_ID`; otherwise returns 404 | none |

Token resolution order:

1. `Bearer dev-bypass` with `DEV_BYPASS_MEMBER_ID`
2. `Bearer dev-bypass-admin` with `DEV_BYPASS_ADMIN_MEMBER_ID`
3. Supabase JWT via `/auth/v1/user`, then `members.auth_user_id`
4. Custom OTP session via `sessions.token`

### API contract table

| Method | Path | File | Auth middleware | Zod schema used | What it does |
|---|---|---|---|---|---|
| GET | `/` | `backend/src/index.ts` | none | none active | Liveness response `{ status: "zamproject API OK", time }`; no success wrapper. |
| GET | `/health` | `backend/src/index.ts` | none | none active | Health response `{ success: true, data: { healthy: true } }`. |
| GET | `/dev/mail-test` | `backend/src/routes/mail-test.ts` | local dev gate | none active | Returns email provider status and Mailtrap inbox link when locally enabled. |
| POST | `/dev/mail-test` | `backend/src/routes/mail-test.ts` | local dev gate | none active | Sends a test email to optional `{ to }`, default `operator@spacex.hq`; returns provider/from/to. |
| POST | `/auth/send-otp` | `backend/src/routes/otp.ts` | none | none active | Requires JSON `{ email }`; inserts 6-digit OTP expiring in 10 minutes; sends email; returns `{ ok, email_sent, _email_error?, _dev_code? }`. |
| POST | `/auth/verify-otp` | `backend/src/routes/otp.ts` | none | none active | Requires JSON `{ email, code }`; verifies latest unused OTP, marks it used, inserts a 7-day `sessions` token; returns `{ token, member_id, email }`. |
| GET | `/members` | `backend/src/routes/members.ts` | `requireAuth` | none active | Lists all members using service role. This overlaps with `/admin/members` but is less restricted. |
| GET | `/members/me` | `backend/src/routes/members.ts` | `requireAuthWithMember` | none active | Returns current member by `members.id` from session or `auth_user_id` from Supabase JWT. |
| GET | `/members/:id` | `backend/src/routes/members.ts` | `requireAuth` | none active | Returns member by id or 404. |
| POST | `/members` | `backend/src/routes/members.ts` | none | none active | Inserts request JSON directly into `members`; returns 201. |
| PATCH | `/members/:id` | `backend/src/routes/members.ts` | `requireAuth` | none active | Updates any member id with request JSON plus `updated_at`; returns updated member. |
| GET | `/notifications` | `backend/src/routes/notifications.ts` | `requireAuthWithMember` | none active | Lists own notifications ordered newest first; maps DB `type` -> `kind`, `read` -> `unread`. |
| GET | `/notifications/:id` | `backend/src/routes/notifications.ts` | `requireAuthWithMember` | none active | Returns one own notification or 404; same shape mapping as list. |
| POST | `/notifications` | `backend/src/routes/notifications.ts` | `requireAuth` | none active | Inserts notification body; intended for admin/system use but not admin-only; returns 201. |
| PATCH | `/notifications/read-all` | `backend/src/routes/notifications.ts` | `requireAuthWithMember` | none active | Marks all current member notifications read; returns `{ ok: true }`. |
| PATCH | `/notifications/:id` | `backend/src/routes/notifications.ts` | `requireAuthWithMember` | none active | Updates one own notification, commonly `{ read: true }`; returns mapped row. |
| GET | `/upgrade-requests` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Lists current member's upgrade requests ordered newest first. |
| GET | `/upgrade-requests/pending` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Lists current member's in-flight requests using `IN_FLIGHT_UPGRADE_STATUSES`; returns compact rows for upgrade badges. |
| GET | `/upgrade-requests/:id/receipts` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Verifies request ownership, then lists receipts for the request ordered by `submitted_at.desc`. |
| POST | `/upgrade-requests/:id/receipts` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Feature-gated by `receipt_upload`; accepts multipart `file`, `amount_claimed`, optional `member_note`; allows PDF/JPEG/PNG/WebP <= 10 MB; uploads to storage bucket `payment-receipts`; inserts `payment_receipts`; sets request `PAYMENT_SUBMITTED`; returns 201. |
| GET | `/upgrade-requests/:id` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Returns one current-member upgrade request or 404. |
| POST | `/upgrade-requests` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Accepts `{ from_tier, to_tier }` or legacy `{ current_tier, requested_tier }`; checks `settings.upgrade_enabled`, active tiers, rank increase, and no duplicate in-flight request; inserts `AWAITING_PAYMENT` with `total_amount` and `amount_paid: 0`; notifies; returns 201. |
| DELETE | `/upgrade-requests/:id` | `backend/src/routes/upgrade-requests.ts` | `requireAuthWithMember` | none active | Cancels own request if status is `REQUESTED`, `AWAITING_PAYMENT`, or legacy `PENDING` and no accepted receipt exists; deletes row; returns `{ success: true, message }`. |
| PATCH | `/upgrade-requests/:id` | `backend/src/routes/upgrade-requests.ts` | `requireAdmin` | none active | Admin status/notes/payment update; sets `reviewed_at`, `reviewed_by`, `updated_at`; `APPROVED` triggers `applyApprovedUpgrade`; optional `notify: false`; returns updated request. |
| GET | `/badges` | `backend/src/routes/badges.ts` | none | none active | Lists all badges ordered by creation. |
| GET | `/badges/:id` | `backend/src/routes/badges.ts` | none | none active | Returns one badge or 404. |
| POST | `/badges` | `backend/src/routes/badges.ts` | `requireAuth` | none active | Inserts badge body; comment says admin, but code only requires any valid auth; returns 201. |
| GET | `/sessions` | `backend/src/routes/sessions.ts` | `requireAuthWithMember` | none active | Lists current member's sessions. |
| DELETE | `/sessions/:id` | `backend/src/routes/sessions.ts` | `requireAuthWithMember` | none active | Deletes one current-member session; returns `{ success: true, data: null }`. |
| GET | `/profit-distributions` | `backend/src/routes/profit-distributions.ts` | `requireAuthWithMember` | none active | Lists current member's profit distributions ordered by period month. |
| GET | `/profit-distributions/:id` | `backend/src/routes/profit-distributions.ts` | `requireAuthWithMember` | none active | Returns one own profit distribution or 404. |
| GET | `/tier-change-history` | `backend/src/routes/tier-change-history.ts` | `requireAuthWithMember` | none active | Lists current member's tier history ordered by `changed_at.desc`. |
| GET | `/event-bookings` | `backend/src/routes/event-bookings.ts` | `requireAuthWithMember` | none active | Lists current member's event bookings ordered by event date. |
| POST | `/event-bookings` | `backend/src/routes/event-bookings.ts` | `requireAuthWithMember` | none active | Inserts booking JSON with current `member_id` and `booking_status: "CONFIRMED"`; returns 201. |
| PATCH | `/event-bookings/:id` | `backend/src/routes/event-bookings.ts` | `requireAuthWithMember` | none active | Updates one own event booking or 404. |
| GET | `/tiers` | `backend/src/routes/tiers.ts` | none | none active | Lists active tiers ordered by rank; maps DB rows to frontend shape with formatted `price`, `price_cents`, `priceValue`, `features`, `variant`. |
| GET | `/tiers/:id` | `backend/src/routes/tiers.ts` | none | none active | Returns one active tier by id, mapped to frontend shape, or 404. |
| GET | `/settings/public` | `backend/src/routes/settings.ts` | none | none active | Returns public branding and gates with defaults: `site_name`, `site_tagline`, `logo_url`, company fields, `support_email`, `maintenance_mode`, `upgrade_enabled`. |
| GET | `/feature-flags/public` | `backend/src/routes/feature-flags.ts` | `requireAuthWithMember` | none active | Returns member-relevant feature flags with per-member overrides when present. |
| GET | `/feature-flags/public-anon` | `backend/src/routes/feature-flags.ts` | none | none active | Returns the same public flag keys without member overrides for pre-login gates. |
| POST | `/admin/notify` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Requires `{ member_id, title, message }`, optional `type`; inserts notification; maps to frontend shape; returns 201. |
| GET | `/admin/members` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Lists all members ordered newest first. |
| PATCH | `/admin/members/:id` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Updates any member with JSON body plus `updated_at`; returns updated row. |
| GET | `/admin/upgrade-requests` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Lists all upgrade requests ordered newest first. |
| GET | `/admin/tiers` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Lists all tiers ordered by rank. |
| POST | `/admin/tiers` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Inserts tier JSON; returns 201. |
| PATCH | `/admin/tiers/:id` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Updates tier JSON by id or 404. |
| DELETE | `/admin/tiers/:id` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Soft-deletes tier by setting `is_active: false`; returns updated row. |
| GET | `/admin/settings` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Reads singleton `settings` row `id=1` or 404. |
| PATCH | `/admin/settings` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Whitelists fields from `SETTINGS_PATCH_FIELDS`; rejects empty updates; updates singleton settings row. |
| GET | `/admin/receipts` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Feature-gated by `receipt_review_inbox`; query `status` defaults `PENDING_REVIEW`; lists matching receipts. |
| PATCH | `/admin/receipts/:id` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Requires `{ status: "ACCEPTED" | "REJECTED", admin_note? }`; updates receipt review fields; recomputes request payment; may auto-apply approved upgrade; returns `{ receipt, request }`. |
| GET | `/admin/upgrade-requests/:id/receipts` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Lists all receipts for an upgrade request. |
| GET | `/admin/feature-flags` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Lists all feature flags. |
| PATCH | `/admin/feature-flags/:key` | `backend/src/routes/admin.ts` | `requireAdmin` | none active | Requires `{ enabled }`; toggles global feature flag or 404. |

### Ambiguous or risky route behaviors to preserve explicitly

- `POST /members` is unauthenticated and inserts the request body directly. If this is not intentional registration behavior, Phase 1 should ask before changing it.
- `GET /members`, `GET /members/:id`, `PATCH /members/:id`, and `POST /badges` are not admin-only even though their behavior can expose or modify broad data.
- API errors use `{ success: false, error: string, code }`, while the member frontend sometimes reads `json?.error?.message`. Preserve the actual backend shape first; fix client parsing only in Phase 3 if approved.
- `PATCH /upgrade-requests/:id` is mounted outside `/admin` but is admin-only. The admin app depends on that legacy path through its Refine data provider.
- `GET /admin/receipts` exists but has no admin page.
- `GET/PATCH /admin/feature-flags` exists but has no admin page, and member override CRUD routes are documented but not implemented.

## 2. Frontend page inventory

### Member app routes (`frontend/src/routes/*`)

Current router: `frontend/src/App.tsx` uses React Router under a `RootLayout` that wraps routes with `PageLayout`.

| Route | Current file | Purpose | Data dependencies |
|---|---|---|---|
| `/` | `frontend/src/routes/Index.tsx` | Redirects to `/dashboard`. | none |
| layout | `frontend/src/routes/Root.tsx` | Wraps all routes in `PageLayout`; also exports unused `ErrorComponent`. | `frontend/src/components/shared/PageLayout.tsx` |
| `*` | `frontend/src/App.tsx` local `ErrorBoundary` | Static "This page didn't load" fallback, not a React error boundary. | none |
| `/dashboard` | `frontend/src/routes/Dashboard.tsx` | Member home with `ProfileCard`, locked asset grid, and upgrade CTA with 900 ms delay. | `useMember` -> `GET /members/me`; static `LockedAssetsGrid`; navigates to `/upgrade` |
| `/profile` | `frontend/src/routes/Profile.tsx` | Profile summary, links to payment history and upgrade, sign-out dialog. | `useMember` -> `GET /members/me`; `useSignOut` clears `localStorage.spacex_session`; shadcn `AlertDialog` |
| `/upgrade` | `frontend/src/routes/Upgrade.tsx` | Thin wrapper around `UpgradeForm`. | `UpgradeForm` dependencies below |
| `/history` | `frontend/src/routes/History.tsx` | Payment/upgrade history list with detail sheet. | `useHistory` -> `GET /upgrade-requests`; `PaymentPreview` -> `GET /upgrade-requests/:id`, `GET /upgrade-requests/:id/receipts`, `DELETE /upgrade-requests/:id`; shadcn `Sheet` |
| `/badges` | `frontend/src/routes/Badges.tsx` | Badge catalog with locked/unlocked display based on member tier. | `useMember` -> `GET /members/me`; `useBadges` -> `GET /badges`; local `isBadgeUnlocked` and hardcoded tier ranks |
| `/notifications` | `frontend/src/routes/Notifications.tsx` | Notification inbox with mark-all-read and detail sheet. | `useNotifications` -> `GET /notifications`; `useMarkAllRead` -> `PATCH /notifications/read-all`; `NotificationPreview` -> `GET/PATCH /notifications/:id` |
| `/payment` | `frontend/src/routes/Payment.tsx` | Legacy submit flow or flag-gated payment instructions and receipt upload. | `useMember`; `useFeatureFlags` -> `GET /feature-flags/public`; `usePublicSettings` -> `GET /settings/public`; `useUpgradeRequest` -> `GET /upgrade-requests/:id`; `useSubmitUpgrade` -> `POST /upgrade-requests`; `ReceiptUploadForm` -> `POST /upgrade-requests/:id/receipts`; `sessionStorage.spacex_selected_tier`; `sessionStorage.spacex_upgrade_request_id` |
| `/login` | `frontend/src/routes/Auth/Login.tsx` | Email then OTP login; includes theme toggle and 10-minute countdown. | `useSendOTP` -> `POST /auth/send-otp`; `useVerifyOTP` -> `POST /auth/verify-otp`; writes `localStorage.spacex_session`; `useTheme` writes `localStorage.spacex_theme` |

### Member route-adjacent components and hooks

| Module | Current path | Used by | Data/storage dependencies |
|---|---|---|---|
| `PageLayout` | `frontend/src/components/shared/PageLayout.tsx` | All member routes | Shows bottom tabs only on `/dashboard`, `/badges`, `/profile`; `/login` bypasses header/tabs; other routes get a back header. |
| `Header` | `frontend/src/components/shared/Header.tsx` | `PageLayout` | Uses `useNotifications` for unread count; `useTheme`; navigates to `/notifications`; back action uses `history.back()`. |
| `BottomTabs` | `frontend/src/components/shared/BottomTabs.tsx` | `PageLayout` | Static tabs: Home, Badges, Profile. |
| `UpgradeForm` | `frontend/src/components/upgrade/UpgradeForm.tsx` | `/upgrade` | `useUpgradeTiers` -> `GET /tiers`; `usePendingRequests` -> `GET /upgrade-requests/pending`; `useMember`; `useFeatureFlag("payment_instructions")`; writes tier and request id to sessionStorage. |
| `PaymentInstructions` | `frontend/src/components/payment/PaymentInstructions.tsx` | `/payment` | Props from selected tier, upgrade request, and public settings. |
| `ReceiptUploadForm` | `frontend/src/components/payment/ReceiptUploadForm.tsx` | `/payment` | Multipart upload to `POST /upgrade-requests/:id/receipts`; amount and optional note. |
| `PaymentPreview` | `frontend/src/components/history/PaymentPreview.tsx` | `/history` sheet | Fetches request detail and receipts; can cancel via `DELETE /upgrade-requests/:id`; includes PDF/share helpers. |
| `NotificationPreview` | `frontend/src/components/notifications/NotificationPreview.tsx` | `/notifications` sheet | Fetches one notification and marks it read on open. |
| `NotificationSheet` | `frontend/src/components/notifications/NotificationSheet.tsx` | unused | Navigates to `/notifications/:id`, but no such route exists. |
| `NotificationDetail` | `frontend/src/components/notifications/NotificationDetail.tsx` | unused | Detail page shape exists without a route. |
| `QueryClientContextProvider` | `frontend/src/context/QueryClientContext.tsx` | `App.tsx` | TanStack Query singleton; `useQueryClient` export appears unused. |
| `useAuth` | `frontend/src/hooks/useAuth.ts` | login/profile | `useSession` exists but route guard does not use it; login writes session; sign-out clears session. |
| `useUpgrade` | `frontend/src/hooks/useUpgrade.ts` | upgrade/payment/history | Duplicates `BASE`, `SESSION_KEY`, `authHeaders`, and `authFetch` instead of using only `lib/api.ts`. |
| `useReceipts` | `frontend/src/hooks/useReceipts.ts` | receipt upload flow partially | `useReceipts` query appears unused; `useUploadReceipt` is used by `ReceiptUploadForm`. |
| `useFeatureFlags` | `frontend/src/hooks/useFeatureFlags.ts` | upgrade/payment | Reads `GET /feature-flags/public`. |
| `usePublicSettings` | `frontend/src/hooks/usePublicSettings.ts` | payment | Reads `GET /settings/public`. |
| `useTheme` | `frontend/src/hooks/useTheme.ts` | login/header | Persists `spacex_theme`; toggles `html.light`. |

Current member UI conventions to preserve:

- Dark space theme by default, controlled by CSS variables in `frontend/src/styles.css`.
- Light mode is an `html.light` class, not a separate app shell.
- Mobile-first max-width portal container.
- Rounded cards (`rounded-[20px]` to `rounded-3xl`), border `var(--border)`, background `var(--surface)`.
- Primary CTA style: `bg-[var(--text)] text-[var(--bg)]`, large rounded button.
- Typography uses tight tracking, uppercase section labels, and `font-mono-data` for numeric/status data.
- `lucide-react` icons and shadcn components are used in the member app.

Important member behavior:

- There is no member route guard. Unauthenticated users can reach protected routes and then encounter loading/API failure behavior.
- Dev auto-login writes a `dev-bypass` session when `VITE_DEV_MEMBER_ID` is set.
- `/payment` has two branches:
  - `payment_instructions=false`: request is created on the payment page.
  - `payment_instructions=true`: request is created in `UpgradeForm`, then `/payment` shows instructions and optional receipt upload.
- `settings.maintenance_mode` is returned by API but not enforced in member routes.
- `settings.upgrade_enabled` is enforced by backend on `POST /upgrade-requests`, but upgrade entry points are not fully hidden in the member UI.

### Admin app pages (`admin/src/pages/*`)

Current router: `admin/src/App.tsx` uses Refine, React Router, Ant Design dark theme, and an `Authenticated` wrapper for all admin routes except login.

| Route | Current file | Purpose | Data dependencies |
|---|---|---|---|
| `/login` | `admin/src/pages/login/index.tsx` | Admin email -> OTP login; second step controlled by `?step=otp&email=...`. | Refine `authProvider`; `POST /auth/send-otp`; `POST /auth/verify-otp`; `GET /members/me` role check; writes `localStorage.spacex_admin_session` |
| `/` | `admin/src/pages/dashboard/index.tsx` | HQ stats dashboard. | Direct `apiFetch`: `GET /admin/members`, `GET /admin/upgrade-requests` |
| `/upgrade-requests` | `admin/src/pages/upgrade-requests/list.tsx` | Upgrade request queue with pending-review banner and member names. | Refine `useTable` -> `GET /admin/upgrade-requests`; `useList("members")` -> `GET /admin/members` |
| `/upgrade-requests/show/:id` | `admin/src/pages/upgrade-requests/show.tsx` | Whole-request approve/reject/under-review UI. | `useShow("upgrade-requests")` fetches full `/admin/upgrade-requests` list then finds by id; `useUpdate` -> `PATCH /upgrade-requests/:id`; `useList("members")` |
| `/members` | `admin/src/pages/members/list.tsx` | Member list. | Refine `useTable("members")` -> `GET /admin/members` |
| `/members/edit/:id` | `admin/src/pages/members/edit.tsx` | Edit name, tier, status, role. | Refine form -> `PATCH /admin/members/:id`; getOne fetches full list then finds by id |
| `/tiers` | `admin/src/pages/tiers/index.tsx` (`TierListPage`) | Tier list. | `GET /admin/tiers` |
| `/tiers/create` | `admin/src/pages/tiers/index.tsx` (`TierCreatePage`) | Create tier. | `POST /admin/tiers` |
| `/tiers/edit/:id` | `admin/src/pages/tiers/index.tsx` (`TierEditPage`) | Edit tier. | `PATCH /admin/tiers/:id`; getOne fetches full list then finds by id |
| `/settings/edit/1` | `admin/src/pages/settings/edit.tsx` | Singleton settings editor: branding, company, mail, maintenance, upgrade toggle. | `GET /admin/settings`; `PATCH /admin/settings` |
| `/notify` | `admin/src/pages/notify/index.tsx` | Send in-app notification to a member. | `GET /admin/members`; `POST /admin/notify` |
| `*` | `admin/src/App.tsx` | Fallback to dashboard resource. | none |

Admin providers:

| Module | Current path | Notes |
|---|---|---|
| `authProvider` | `admin/src/providers/authProvider.ts` | Requires a valid session and `members.role === "admin"`; clears session on failed role check. |
| `dataProvider` | `admin/src/providers/dataProvider.ts` | Maps Refine resources to legacy Hono paths. `upgrade-requests` update/read-one uses `/upgrade-requests/:id`, not `/admin/upgrade-requests/:id`. |
| `apiFetch` | `admin/src/lib/api.ts` | Uses `VITE_API_BASE_URL` or Vite `/api`; session key is `spacex_admin_session`; dev bypass token is `dev-bypass-admin`. |
| `AdminLayout` | `admin/src/components/AdminLayout.tsx` | Ant Design/Refine layout, dark sider/mobile drawer. |

Admin conventions to preserve or consciously replace:

- Ant Design + Refine dark UI is separate from the shadcn member portal.
- `admin/src/main.tsx` forces `localStorage.theme = "dark"` for Refine.
- Admin status colors currently cover only `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`; new payment statuses are not fully represented.
- Admin has no UI for receipt review inbox or feature flag management, even though backend APIs exist.

## 3. Shared types usage

### `packages/shared-types`

| Export | Current shape | Consumers | Notes |
|---|---|---|---|
| `User` | `{ id: number; email: string; name: string }` | none found | Conflicts with Supabase UUID member ids. |
| `ApiResponse<T>` | `{ data: T; success: boolean }` | none found | Matches only the success envelope; does not model `{ success: false, error, code }`. |

Package metadata:

- Package name: `@zamproject/shared-types`
- Included in workspace via `packages/*`
- Not listed as a dependency of `backend`, `frontend`, or `admin`
- No imports found in app code

### Actual type sources in use

| Layer | Current path | Types |
|---|---|---|
| Backend env | `backend/src/types/env.ts` | `Bindings`, `Variables` |
| Backend settings | `backend/src/types/settings.ts` | `SettingsRow`, `SETTINGS_PATCH_FIELDS`, unused `SETTINGS_PUBLIC_SELECT` |
| Backend receipts/upgrades | `backend/src/lib/receipts.ts` | `PaymentReceiptRow`, `UpgradeRequestRow`, `UpgradeRequestStatus`, `IN_FLIGHT_UPGRADE_STATUSES` |
| Backend feature flags | `backend/src/lib/featureFlags.ts` | `FeatureFlagRow`, `MemberOverrideRow` |
| Frontend member | `frontend/src/types/user.ts` | `Tier`, `Member` |
| Frontend upgrade | `frontend/src/types/upgrade.ts` | `TierOption`, `UpgradeRequest`, frontend status union |
| Frontend payment/history | `frontend/src/types/payment.ts`, `frontend/src/types/receipt.ts` | `PaymentRecord`, `PaymentReceipt`, `UpgradeRequestDetail` |
| Frontend notifications | `frontend/src/types/notification.ts` | `AppNotification`, `NotificationKind` |
| Frontend badges | `frontend/src/types/badge.ts` | `Badge`, `isBadgeUnlocked`, local hardcoded tier rank |
| Frontend API local | `frontend/src/lib/api.ts` | `PublicSettings`, `FeatureFlagsMap`, mappers |
| Admin API local | `admin/src/lib/api.ts` | `ApiMember`, `ApiUpgradeRequest`, `ApiTier`, `ApiSettings` |
| Supabase generated | `supabase/types.ts` | Stale `Database` helper types |
| Frontend Supabase stub | `frontend/src/integrations/supabase/types.ts` | Empty `Tables`; unused |
| Orphan Drizzle reference | `lib/db/src/schema/*.ts` | Zod/Drizzle-style schema references; not in workspace package and not imported by runtime |

Migration implication:

- `packages/shared-types` should not be treated as canonical in Phase 3 unless it is replaced with real contracts.
- The Next.js app should centralize API envelopes, member/tier/upgrade/receipt/notification/settings/feature-flag types under either `lib/types/` or a real internal package.
- Because the user requested one app, `lib/types/` inside the Next app is simpler unless the repo intentionally remains a multi-package monorepo for future shared tooling.

## 4. Dead weight and cleanup candidates

Do not remove these in this phase. They are candidates to strip or consolidate during the approved migration.

### Backend candidates

| Item | Path | Why it is a candidate |
|---|---|---|
| Unused Zod validation middleware | `backend/src/middleware/validate.ts` | Defines `validateJson`, but no route imports it. |
| Backend `zod` dependency | `backend/package.json` | Only referenced by the unused validation middleware. |
| Stale Wrangler generated types | `backend/worker-configuration.d.ts` | Defines `Env { DB: D1Database }`; app uses `Bindings` and no D1 binding. |
| `cf-typegen` script | `backend/package.json` | Generates types that do not match runtime bindings. |
| Unused settings export | `backend/src/types/settings.ts` | `SETTINGS_PUBLIC_SELECT` is exported but not referenced. |
| Hardcoded `SUPABASE_URL` in Worker config | `backend/wrangler.jsonc` | Duplicates env setup and hardcodes a project ref. |
| Open/weak write routes | `POST /members`, `PATCH /members/:id`, `POST /badges`, `POST /notifications` | Code allows broad writes with no admin-only check. Document before changing behavior. |
| Orphan test script | `backend/test.mjs` | Direct Supabase route simulation, not in package scripts, contains stale tier/status assumptions. |
| Orphan test script | `backend/test-mail.mjs` | Direct Mailtrap smoke test, overlaps `test-mail-app.mjs` and `lib/mail.ts`. |
| Orphan test script | `backend/test-lifecycle.mjs` | Direct lifecycle test with legacy `PENDING` semantics. |
| Orphan test script | `backend/test-payment-flow.mjs` | Useful E2E but not in package scripts; writes test fixture at runtime. |
| Orphan/overlapping test script | `backend/test-email-e2e.mjs` | Overlaps mail and payment E2E coverage; not in package scripts. |
| Kept test script | `backend/test-mail-app.mjs` | Only script wired as `pnpm --filter backend test:mail`; keep unless replaced by Next test flow. |

### Frontend/admin candidates

| Item | Path | Why it is a candidate |
|---|---|---|
| Unused Supabase client stack | `frontend/src/integrations/supabase/*`, `frontend/src/lib/supabase.ts`, `@supabase/supabase-js` in `frontend/package.json` | Runtime app data uses Hono API; no app imports the client. |
| Duplicate API helpers | `frontend/src/lib/api.ts` and `frontend/src/hooks/useUpgrade.ts` | Both define API base, session key, auth headers, fetch error parsing. |
| Unused API function | `frontend/src/lib/api.ts` `submitUpgradeRequest()` | `useSubmitUpgrade()` posts directly through duplicated `authFetch`. |
| Unused hook | `frontend/src/hooks/useAuth.ts` `useSession()` | Defined but no member route guard consumes it. |
| Unused hook | `frontend/src/hooks/useReceipts.ts` `useReceipts()` | Receipt list is fetched in other flows; query appears unused. |
| Unused notification components | `frontend/src/components/notifications/NotificationSheet.tsx`, `NotificationDetail.tsx` | No route consumes them; one targets `/notifications/:id`, which does not exist. |
| Unused shadcn scaffolding | many `frontend/src/components/ui/*` files | Current feature code uses only a small subset (`alert-dialog`, `sheet`, `button`, `card`, plus wrappers). |
| `jspdf` dependency | `frontend/package.json` | No imports found; PDF/share flow uses `@react-pdf/renderer` and `html2canvas`. |
| Duplicate error UIs | `frontend/src/App.tsx`, `frontend/src/routes/Root.tsx` | `Root.tsx` `ErrorComponent` is exported but not wired as React Router error element. |
| Missing admin env doc | `admin/.env.example` | Code uses `VITE_API_BASE_URL`, but example only documents admin dev bypass values. |
| Admin README drift | `admin/README.md` | Says admin bypass uses `dev-bypass`; code uses `dev-bypass-admin`. |
| Admin React version split | `admin/package.json` vs `frontend/package.json` | Admin uses React 18 and Query 4 through Refine, member app uses React 19 and Query 5. Migration should collapse or explicitly isolate. |

### Schema/docs candidates

| Item | Path | Why it is a candidate |
|---|---|---|
| Placeholder shared package | `packages/shared-types` | No consumers; wrong `User.id` type for current DB. |
| Orphan Drizzle reference | `lib/db/src/schema/*` | Not a workspace package, no runtime imports, lags migrations. |
| Stale generated Supabase types | `supabase/types.ts` | Missing current tables/columns and still includes dropped `otp_tokens`. |
| Stale seed status | `supabase/seed/seed.sql` | Still seeds legacy `PENDING` / payment reference flow. |
| Root `deploy` omits admin | `package.json` | `deploy` runs API and web only, not `deploy:admin`. |
| Turbo config minimal | `turbo.json` | Only `dev`; no build/lint/test pipeline definition. |
| Duplicate Vite configs | `frontend/vite.config.ts`, `admin/vite.config.ts` | Both proxy `/api` to backend; Next app would remove both. |
| Duplicate Pages configs | `frontend/wrangler.jsonc`, `admin/wrangler.jsonc` | Separate Cloudflare Pages configs not needed for one Next app. |
| Duplicate TS/PostCSS configs | `frontend/*`, `admin/*` | Separate Vite app configs would collapse into Next config/Tailwind/PostCSS setup. |

### Docs referenced but not in code

| Doc reference | Current doc | Reality in code |
|---|---|---|
| `backend/src/routes/payment-receipts.ts` | `PAYMENT_FLOW.md`, `ADMIN_CONTROLS.md` | Receipt routes live in `backend/src/routes/upgrade-requests.ts` and `backend/src/routes/admin.ts`. |
| `frontend/src/components/payment/ReceiptUpload.tsx` | `PAYMENT_FLOW.md` | Actual file is `frontend/src/components/payment/ReceiptUploadForm.tsx`. |
| `admin/src/pages/receipts/list.tsx` | `PAYMENT_FLOW.md`, `ADMIN_CONTROLS.md` | No page exists. API exists behind `receipt_review_inbox`. |
| `admin/src/pages/feature-flags/` | `ADMIN_CONTROLS.md` | No admin page exists. Global flag API exists. |
| `frontend/src/routes/Admin/*`, `useAdminUpgrade.ts` | `UPGRADE_REQUESTS.md` | Admin is separate app under `admin/src/pages/*`. |
| `frontend/src/routes/Admin/Notifications.tsx` | `docs/workflows/engagement.md` | Actual admin notify page is `admin/src/pages/notify/index.tsx`. |
| Dashboard `StatusCard`, `NextActionCard`, `FloatingUpgradeButton`, `StatusStepper` | `DASHBOARD_STRUCTURE.md` | Planned components do not exist. |
| `/admin/members/:id/feature-overrides` CRUD | `FEATURE_FLAGS.md` | Table and server-side read exist; admin override API routes do not. |

### Code behavior not fully documented

| Behavior | Current code |
|---|---|
| `GET /feature-flags/public-anon` pre-login flag endpoint | `backend/src/routes/feature-flags.ts` |
| Mailtrap/Resend provider selection and `/dev/mail-test` | `backend/src/lib/mail.ts`, `backend/src/routes/mail-test.ts` |
| Receipt recompute and auto-approve | `backend/src/lib/receipts.ts`, `backend/src/routes/admin.ts` |
| `UpgradeForm` creates the upgrade request before `/payment` when `payment_instructions` is enabled | `frontend/src/components/upgrade/UpgradeForm.tsx` |
| `sessionStorage` upgrade handoff keys | `frontend/src/lib/upgradeSession.ts`, `frontend/src/routes/Payment.tsx` |
| Admin data provider fetches whole list for getOne | `admin/src/providers/dataProvider.ts` |
| Local CORS private-network allowance when dev bypass is set | `backend/src/index.ts` |

## 5. Env/secrets and bindings inventory

### Backend env usage vs `backend/.dev.vars.example`

| Variable | Documented in example | Used in code | Use | Next.js replacement strategy |
|---|---:|---:|---|---|
| `SUPABASE_URL` | yes | yes | Backend REST API base URL. | Server-only env for route handlers and server utilities. If client Supabase is introduced, expose only publishable URL as `NEXT_PUBLIC_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | yes | Service-role Supabase REST calls. | Server-only env. Never expose to browser. Route handlers/server actions only. |
| `SUPABASE_ANON_KEY` | yes | yes | Validates Supabase JWT in `getUser(token)`. | Server-side env for JWT validation; client should use publishable/anon only if direct client Supabase is retained. |
| `ALLOWED_ORIGINS` | yes | yes | Dynamic CORS for the Worker. | Usually not needed for same-origin Next API routes. If external clients remain, implement CORS in specific route handlers or middleware. |
| `EMAIL_PROVIDER` | yes | yes | Chooses `auto`, `mailtrap`, or `resend`. | Server-only env. Keep provider resolution in `lib/mail`. |
| `MAILTRAP_API_KEY` | yes | yes | Local/test email provider. | Server-only env, likely only in development/preview. |
| `MAILTRAP_INBOX_ID` | yes | yes | Optional Mailtrap inbox selection. | Server-only env. |
| `RESEND_API_KEY` | yes | yes | Production email provider. | Server-only env. |
| `RESEND_FROM` | yes | yes | Default From/reply fallback for OTP and upgrade emails. | Server-only env; settings table may override display values. |
| `DEV_BYPASS_MEMBER_ID` | yes | yes | Enables member dev bypass token and local dev CORS. | Local-only server env. Keep out of production. In Next, route handlers/middleware can recognize it in development. |
| `DEV_BYPASS_ADMIN_MEMBER_ID` | yes | yes | Enables admin dev bypass token. | Local-only server env. Keep out of production. |

Backend binding/config notes:

- `backend/wrangler.jsonc` only defines `SUPABASE_URL` as a Worker var. Secrets are expected through Wrangler.
- `backend/worker-configuration.d.ts` declares `Env { DB: D1Database }`, but the code does not use D1. This has no Next.js equivalent and should be dropped unless a future D1 binding is real.
- The current `Bindings` type is the real backend env contract, not the Wrangler-generated `Env`.
- The custom REST wrapper in `backend/src/lib/supabase.ts` uses `fetch` directly. In Next.js, this can be replaced with `@supabase/supabase-js` server clients or kept as a server-only REST wrapper during migration. The migration prompt requests `lib/supabase/server.ts` and `lib/supabase/client.ts`, so the target should split server and browser clients.

### Member frontend env usage vs `frontend/.env.example`

| Variable | Documented in example | Used in code | Use | Next.js replacement strategy |
|---|---:|---:|---|---|
| `VITE_API_BASE_URL` | yes | yes | API base for Hono calls; defaults to `/api` in dev and `http://localhost:8787` in prod when missing. | Remove for same-origin Next route handlers. If calling external legacy API during migration, use server env such as `LEGACY_API_BASE_URL`. |
| `VITE_DEV_MEMBER_ID` | yes | yes | Dev auto-login into `localStorage.spacex_session`. | Replace with `NEXT_PUBLIC_DEV_MEMBER_ID` only if client-side dev bypass remains, or move to server-only dev login route. |
| `VITE_DEV_MEMBER_EMAIL` | yes | yes | Dev session email fallback. | Same as above. |
| `VITE_SUPABASE_URL` | yes | only unused Supabase stub | Used only by `frontend/src/integrations/supabase/client.ts`, which is not imported. | If client Supabase is used, rename to `NEXT_PUBLIC_SUPABASE_URL`; otherwise drop. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | only unused Supabase stub | Used only by unused client stub. | If client Supabase is used, rename to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; otherwise drop. |
| `process.env.SUPABASE_URL` | no | unused Supabase stub fallback | SSR fallback in Vite-era client stub. | Do not keep in browser client. Server env belongs in `lib/supabase/server.ts`. |
| `process.env.SUPABASE_PUBLISHABLE_KEY` | no | unused Supabase stub fallback | SSR fallback in Vite-era client stub. | Replace with explicit Next env naming if needed. |

### Admin env usage vs `admin/.env.example`

| Variable | Documented in example | Used in code | Use | Next.js replacement strategy |
|---|---:|---:|---|---|
| `VITE_API_BASE_URL` | no | yes | API base for admin `apiFetch`; defaults to `/api` in dev and `http://localhost:8787` in prod when missing. | Remove for same-origin Next route handlers or replace with server-only legacy API base during migration. |
| `VITE_DEV_ADMIN_MEMBER_ID` | yes | yes | Dev auto-login into `localStorage.spacex_admin_session`. | Replace with a local-only Next dev strategy; avoid production exposure. |
| `VITE_DEV_ADMIN_EMAIL` | yes | yes | Dev admin session email fallback. | Same as above. |

### Cloudflare-specific files with no direct Next.js equivalent

| Current file/binding | Role today | Next.js strategy |
|---|---|---|
| `backend/wrangler.jsonc` | Worker deployment and public `SUPABASE_URL` var. | Replace with Next hosting config and environment variables. Do not carry over Worker-only config unless keeping a separate Worker. |
| `frontend/wrangler.jsonc` | Cloudflare Pages deploy for member Vite app. | Drop when member app is merged into Next. |
| `admin/wrangler.jsonc` | Cloudflare Pages deploy for admin Vite app. | Drop when admin app is merged into Next. |
| `backend/worker-configuration.d.ts` | Generated Worker types, currently stale D1 binding. | Drop. No real runtime binding exists. |
| Vite `/api` proxies | `frontend/vite.config.ts`, `admin/vite.config.ts` proxy to `127.0.0.1:8787`. | Replace with same-origin `app/api/**/route.ts` route handlers; no proxy needed after cutover. |
| Worker runtime globals | Hono Worker app receives `c.env`; upload code uses Web `File` and `crypto.randomUUID`. | Next route handlers can use Web Request/FormData APIs, but server runtime should be chosen deliberately. Default Node runtime is safest unless a route needs edge behavior. |
| Service-role REST access | `backend/src/lib/supabase.ts` manually calls Supabase REST and Storage. | Move to server-only Supabase helper. Keep `service_role` only in server route handlers/server utilities. |

### Supabase schema inventory

Migrations in `supabase/migrations/*` define these active domains:

| Domain | Tables/storage | Current routes/pages |
|---|---|---|
| Identity | `members`, `sessions`, `otp_codes` | `/auth/*`, `/members/me`, `/sessions`, member/admin login |
| Membership/payment | `tiers`, `upgrade_requests`, `tier_change_history`, `payment_receipts`, storage bucket `payment-receipts` | `/tiers`, `/upgrade-requests/*`, `/tier-change-history`, `/upgrade`, `/payment`, `/history`, admin upgrades |
| Benefits | `badges`, `profit_distributions`, `event_bookings` | `/badges`, `/profit-distributions`, `/event-bookings`, member `/badges`; profit/event APIs have no UI |
| Engagement | `notifications` | `/notifications/*`, `/admin/notify`, member notification UI, admin notify page |
| Platform | `settings`, `feature_flags`, `member_feature_overrides` | `/settings/public`, `/feature-flags/*`, `/admin/settings`, `/admin/feature-flags`; no admin UI for flags/overrides |

Generated type drift:

- `supabase/types.ts` still includes `otp_tokens`, but migration `20260629000001_drop_otp_tokens.sql` drops it.
- `supabase/types.ts` does not include `tiers`, `settings`, `feature_flags`, `member_feature_overrides`, `payment_receipts`.
- `supabase/types.ts` does not include `upgrade_requests.total_amount` or `upgrade_requests.amount_paid`.
- For migration planning, migrations are more reliable than `supabase/types.ts` until types are regenerated.

## 6. Documentation alignment notes

Use `STATUS.md` as the most current high-level snapshot, but verify every claim against code.

| Document | Alignment status |
|---|---|
| `STATUS.md` | Best current snapshot; accurately mentions payment/mail work and APIs. It also says some work existed locally, which may be stale now. |
| `FEATURE_FLAGS.md` | Mixed: says backend lookup/admin toggle API implemented, but still labels database/backend/frontend sections as planned and lists override CRUD routes that do not exist. |
| `PAYMENT_FLOW.md` | Mostly aligned conceptually, but file paths are stale (`payment-receipts.ts`, `ReceiptUpload.tsx`) and "legacy until flag on" language is partially outdated. |
| `ADMIN_CONTROLS.md` | Accurate about missing receipt UI and overrides UI, but references a non-existent receipt route file and planned feature flag pages. |
| `DASHBOARD_STRUCTURE.md` | Target-state doc, not current code. Current bottom nav still has 3 tabs; planned components do not exist. |
| `UPGRADE_REQUESTS.md` | Most stale: create status is now `AWAITING_PAYMENT`, not `PENDING`; admin UI paths moved to `admin/`; pending/in-flight semantics expanded. |
| `docs/architecture/database-domains.md` | Useful domain model but missing payment receipts and feature-flag tables in the reference card; still says `settings.feature_flags` as a platform example. |
| `docs/workflows/*` | Good conceptual docs but contain stale statuses and paths, especially membership/platform/engagement admin references. |

## 7. Phase 0 stop point

Per the prompt, this document stops after Phase 0. The target structure proposal (`docs/migration/01-target-structure.md`) and migration guide (`docs/migration/02-migration-guide.md`) should be written only after this analysis is reviewed and approved.

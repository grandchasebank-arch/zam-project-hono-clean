# Project Status

**Last updated:** 2026-07-01  
**Repo:** `zam-app` monorepo — `backend` (Hono / Cloudflare Workers), `frontend` (member portal), `admin` (Refine HQ console)  
**Latest commit on `main`:** `da6b4bf` — Refine admin, platform settings, domain docs. Significant payment + mail work exists locally but is **not yet committed**.

---

## What's working now

### Platform & infra
- **Monorepo** — pnpm workspaces; `pnpm dev:api` / `dev:web` / `dev:admin` on ports 8787 / 5173 / 5174.
- **API worker** — Hono app on Cloudflare Workers (`backend/src/index.ts`); health check at `GET /health`.
- **Supabase** — Core schema + 9 migrations (members, tiers, upgrades, settings, OTP, feature flags, payment receipts, storage bucket `payment-receipts`).
- **Dev auth bypass** — `dev-bypass` / `dev-bypass-admin` tokens when `DEV_BYPASS_*` set in `backend/.dev.vars`.

### Auth & sessions
- **OTP login** — `POST /auth/send-otp`, `POST /auth/verify-otp`; creates session token (`backend/src/routes/otp.ts`).
- **Member sessions** — `GET/DELETE /sessions` (`backend/src/routes/sessions.ts`).
- **Frontend login** — Email → OTP UI at `/login`; dev auto-login via `VITE_DEV_MEMBER_ID` (`frontend/src/routes/Auth/Login.tsx`).

### Email
- **Dual provider** — `EMAIL_PROVIDER=auto|mailtrap|resend`; Mailtrap Testing API locally, Resend for production (`backend/src/lib/mail.ts`).
- **OTP + upgrade emails** — Sent through mail layer; tested via Mailtrap inbox (`pnpm test:mail` → 6/6 pass).
- **Dev test route** — `GET/POST /dev/mail-test` (local only) to confirm provider + send (`backend/src/routes/mail-test.ts`).
- **Upgrade notifications** — In-app row + email on status change (`backend/src/lib/notify.ts`).

### Member portal (`frontend`)
- **Routes** — `/dashboard`, `/badges`, `/profile`, `/upgrade`, `/payment`, `/history`, `/notifications`, `/login`.
- **Bottom nav** — 3 tabs: Home, Badges, Profile (`frontend/src/components/shared/BottomTabs.tsx`).
- **Member profile** — `GET /members/me`; profile card on dashboard.
- **Tier upgrade** — Tier list + confirm; creates `AWAITING_PAYMENT` request when `payment_instructions` flag on (`UpgradeForm.tsx`).
- **Payment flow (Phase 2)** — Flag-gated payment instructions + receipt upload on `/payment` (`Payment.tsx`, `PaymentInstructions.tsx`, `ReceiptUploadForm.tsx`).
- **History** — Payment / upgrade history page (`/history`).
- **Badges** — Badge list page (`/badges`).
- **Notifications** — List, read, sheet UI; backed by `GET/PATCH /notifications`.

### Upgrade & payment API
- **Tiers** — Public `GET /tiers`; seeded Pioneer / Explorer / Vanguard (`supabase/migrations/20260628000001_seed_tiers.sql`).
- **Upgrade requests** — CRUD + pending list; statuses include `AWAITING_PAYMENT`, `PAYMENT_SUBMITTED`, `PARTIALLY_PAID`, etc. (`backend/src/routes/upgrade-requests.ts`).
- **Receipt upload** — `POST /upgrade-requests/:id/receipts` (multipart → Supabase Storage); sets request to `PAYMENT_SUBMITTED`.
- **Receipt list** — `GET /upgrade-requests/:id/receipts` for members.
- **Admin review (API)** — `PATCH /upgrade-requests/:id`; `PATCH /admin/receipts/:id` accept/reject; recomputes `amount_paid` (`backend/src/lib/receipts.ts`).
- **Public settings** — `GET /settings/public` (branding, `support_email`, gates) — fixed to return DB values.
- **Feature flags** — DB table + `GET /feature-flags/public`; lookup includes per-member overrides in code (`backend/src/lib/featureFlags.ts`).
- **Flags enabled in DB (test rollout)** — `payment_instructions` ✅, `receipt_upload` ✅, `split_payment` ❌.

### Admin console (`admin`)
- **Refine app** — Dark theme, custom layout, React Router future flags (`admin/src/App.tsx`).
- **Dashboard** — Basic HQ dashboard page.
- **Upgrade queue** — List + show; approve / reject / under-review via PATCH (`upgrade-requests/list.tsx`, `show.tsx`).
- **Members** — List + edit (name, tier, status, role).
- **Tiers** — List, create, edit, delete.
- **Settings** — Singleton platform config (site name, support email, mail from, maintenance, upgrade toggle).
- **Notify** — Manual in-app notification to a member (`POST /admin/notify`).

### Tests & docs
- **API tests** — `backend/test-payment-flow.mjs` (11 checks), `backend/test-mail-app.mjs` (6 checks), `backend/test-email-e2e.mjs`.
- **Architecture docs** — `FEATURE_FLAGS.md`, `PAYMENT_FLOW.md`, `ADMIN_CONTROLS.md`, `DASHBOARD_STRUCTURE.md`, `UPGRADE_REQUESTS.md`.

### API-only (no member UI yet)
- **Event bookings** — `GET/POST/PATCH /event-bookings` (`backend/src/routes/event-bookings.ts`).
- **Profit distributions** — `GET /profit-distributions` (`backend/src/routes/profit-distributions.ts`).
- **Tier change history** — `GET /tier-change-history`.

---

## In progress

| Area | Done | Missing |
|------|------|---------|
| **Admin receipt review** | API: accept/reject receipt, flat inbox endpoint | Admin UI on upgrade show + receipts inbox page; `receipt_review_inbox` flag still off |
| **Admin upgrade show** | Status buttons, member info | Receipt panel, paid/total, per-receipt actions; status tags don’t cover new statuses (`AWAITING_PAYMENT`, etc.) |
| **Feature flags (admin)** | `GET/PATCH /admin/feature-flags` API | No admin settings UI to toggle flags or member overrides |
| **Member overrides** | `member_feature_overrides` table + server-side resolution | No admin API/UI to set overrides |
| **Dashboard (Phase 3)** | Profile card + locked assets grid | Status card, next-action card, 4th bottom tab (History), Home teasers per `DASHBOARD_STRUCTURE.md` |
| **Split payment** | Flag + backend `amount_paid` logic | Flag off; no partial-payment UI on `/payment` |
| **Local changes** | Payment + mail integrated in working tree | Not committed; restart API after `.dev.vars` edits (avoid duplicate wrangler on :8787) |

---

## What's next

Priority order — each item unblocks the next layer of the Notion / cheat-sheet plan.

1. **Commit & stabilize payment + mail work** — Land uncommitted backend/frontend changes; keeps team aligned on working payment flow and Mailtrap setup.
2. **Admin receipt review UI (A2)** — Receipt list + accept/reject on upgrade show; admins can verify uploads without raw API calls (`ADMIN_CONTROLS.md`).
3. **Admin receipt inbox (A4)** — Flat `PENDING_REVIEW` queue page; enable `receipt_review_inbox` flag when UI ships.
4. **Admin feature-flag UI** — Toggle global flags + per-member overrides; ops can roll out payment/dashboard features without SQL.
5. **Dashboard Phase 3** — 4-tab nav (add History), Home status + next-action cards; members see clear “what to do now” after upgrade.
6. **Split payment UI** — Turn on `split_payment` flag and expose partial upload / balance on `/payment` when product is ready.
7. **Production email** — Deploy worker with `EMAIL_PROVIDER=resend`, Wrangler secrets for `RESEND_API_KEY`; unset Mailtrap vars.
8. **Admin upgrade queue polish** — Filters, paid/total columns, new status badges on list/show.
9. **Frontend locked assets / rewards teasers** — Wire `network_teaser`, `rewards_teaser`, `achievements_tab` flags when content exists.
10. **Event bookings & profit distributions UI** — APIs exist; member-facing screens not started.

---

## Quick verification

```bash
pnpm dev:api          # backend :8787
cd backend && pnpm test:mail
cd backend && node test-payment-flow.mjs
curl http://127.0.0.1:8787/dev/mail-test          # provider status
curl -X POST http://127.0.0.1:8787/dev/mail-test   # send test email
```

Mailtrap inbox: set `MAILTRAP_INBOX_ID` in `backend/.dev.vars` → check https://mailtrap.io/inboxes

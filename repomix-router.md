# ZAM Project — Architecture Summary

## Stack Overview

**Monorepo** (pnpm workspaces + Turbo)
- `backend/` — Hono on Cloudflare Workers
- `frontend/` — React 19 + Vite + TanStack Query
- `packages/shared-types/` — shared TS types
- `lib/db/` — Drizzle ORM schemas (Postgres/Supabase)

---

## Backend Architecture

### Entry Point (`backend/src/index.ts`)
```
Hono app
├── CORS middleware (env-driven origin allowlist)
├── Error handler
├── Routes:
│   /members          → members.ts
│   /notifications    → notifications.ts
│   /upgrade-requests → upgrade-requests.ts
│   /badges           → badges.ts
│   /sessions         → sessions.ts
│   /auth             → otp.ts
│   /profit-distributions
│   /tier-change-history
│   /event-bookings
│   /tiers            → config (static, no DB)
│   /admin            → admin.ts
```

### Layering
No ORM in the Hono worker — uses a **raw HTTP Supabase client** (`lib/supabase.ts`) that wraps `fetch()` calls to Supabase's REST API. Methods: `select`, `selectOne`, `insert`, `update`, `remove`, `getUser`.

### Auth (`middleware/auth.ts`)
Two middleware functions:

```ts
requireAuth          // validates token, sets authUserId
requireAuthWithMember // also resolves memberId from members table
```

Token resolution flow:
1. Try `supabase.auth/v1/user` (Supabase JWT)
2. Fallback: look up `sessions` table by token (custom session)

### Config (`lib/config.ts`)
Tier definitions are **hardcoded constants** (not DB-driven):
- `tier-ex` Explorer — $1,500
- `tier-pi` Pioneer — $4,000
- `tier-va` Vanguard — $6,000

### Notification System (`lib/notify.ts`)
`notifyUpgradeStatus()` — called on upgrade request state changes:
1. Inserts row into `notifications` table
2. Optionally fires Resend email (fire-and-forget)

Status content map: `PENDING → UNDER_REVIEW → APPROVED → REJECTED`

### Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/send-otp | — | Generate + store OTP, return `_dev_code` |
| POST | /auth/verify-otp | — | Validate OTP, create session token |
| GET | /members/me | requireAuthWithMember | Get own profile |
| GET | /tiers | — | List tier config |
| POST | /upgrade-requests | requireAuthWithMember | Submit upgrade |
| PATCH | /upgrade-requests/:id | requireAuth | Admin: update status |
| PATCH | /notifications/read-all | requireAuthWithMember | Mark all read |
| POST | /admin/notify | requireAuth | Push notification to member |
| GET | /admin/members | requireAuth | List all members |

---

## Database Schema (`supabase/migrations/`)

```
badges
  id, name, tier_required, description, icon_url,
  allows_event_booking, allows_guest_pass

members
  id, auth_user_id (→ Supabase Auth), badge_id (→ badges),
  email, name, tier, status, role, clearance,
  title, location, member_since, avatar_url, display_level

sessions
  id, member_id (→ members), token (unique), expires_at

otp_codes
  id, email, code, expires_at, used, attempts

notifications
  id, member_id (→ members), type, title, message, read

upgrade_requests
  id, member_id, reviewed_by, from_tier, to_tier,
  status (PENDING|UNDER_REVIEW|APPROVED|REJECTED),
  payment_reference, payment_verified, admin_notes, reviewed_at

profit_distributions
  id, member_id, amount, period_month, tier_at_time, status, paid_at

tier_change_history
  id, member_id, changed_by, previous_tier, new_tier, changed_at

event_bookings
  id, member_id, event_name, event_date, includes_guest_pass, booking_status
```

### RLS Policies
All tables have RLS enabled. Members can only read/write their own rows via `get_my_member_id()` helper function (resolves `auth.uid()` → `members.id`). Badges are public-read.

---

## Frontend Architecture

### Routing (`frontend/src/App.tsx`)
React Router v6, all routes under `RootLayout` (PageLayout wrapper):

```
/              → redirect to /dashboard
/dashboard     → Dashboard (ProfileCard + LockedAssetsGrid)
/profile       → Profile
/upgrade       → UpgradeForm (tier selection)
/processing    → Processing (fake loading state)
/payment       → Payment (confirm + submit)
/history       → History (upgrade requests as payment records)
/notifications → Notifications list
/badges        → Badges (placeholder)
/login         → OTP login
/admin         → AdminIndex
/admin/notifications → AdminNotifications
```

### Data Flow
```
Component
  └── Hook (useXxx.ts)
        └── TanStack Query (queryKey from queryKeys.ts)
              └── api.ts (fetch → backend)
```

### API Layer (`frontend/src/lib/api.ts`)
Single file handling all API calls. Maps raw backend responses to typed frontend models. Key mappers:
- `mapMember()` — normalizes member row → `Member` type
- `mapNotification()` — `type/read` → `kind/unread`
- `mapPayment()` — upgrade_request rows → `PaymentRecord`
- `mapTier()` — backend tier → `TierOption`

Session stored in `localStorage` as `spacex_session` JSON.

### Auth Flow
```
Login page
  1. sendOTP(email)  → POST /auth/send-otp
  2. verifyOTP(email, code) → POST /auth/verify-otp
     → stores { member_id, email, token } in localStorage
  3. Subsequent requests: Authorization: Bearer {token}
```

### Key Hooks

| Hook | Query Key | Purpose |
|------|-----------|---------|
| `useMember` | `["member"]` | GET /members/me |
| `useNotifications` | `["notifications"]` | GET /notifications |
| `useHistory` | `["history"]` | GET /upgrade-requests |
| `useUpgradeTiers` | `["upgradeTiers"]` | GET /tiers |
| `useSession` | `["session"]` | checks localStorage |

### Theme System
Dark/light via `.light` class on `<html>`. Stored in `localStorage` as `spacex_theme`. CSS variables define all colors (`--bg`, `--text`, `--surface`, `--muted`, etc.).

---

## Environment Variables

**Backend** (`.dev.vars` / Cloudflare secrets):
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
ALLOWED_ORIGINS, RESEND_API_KEY, RESEND_FROM
```

**Frontend** (`.env.local`):
```
VITE_API_BASE_URL=http://localhost:8787
VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## Key Design Decisions

1. **No Drizzle in the worker** — The Hono backend uses raw `fetch()` to Supabase REST API, not Drizzle ORM (which lives in `lib/db/` for potential future use or migrations tooling only).

2. **Dual auth strategy** — Supports both Supabase JWT tokens and custom session tokens (allows OTP-based login without Supabase Auth on the client).

3. **Tiers are config, not DB** — Tier definitions live in `backend/src/lib/config.ts` as constants. This means pricing/feature changes require a deploy.

4. **Upgrade requests serve as payment history** — The frontend maps `upgrade_requests` rows to `PaymentRecord` types; there's no separate payments table.

5. **Notification side effects are async** — `notifyUpgradeStatus()` is always called with `.catch(err => console.error(...))` so notification failures never block the primary response.
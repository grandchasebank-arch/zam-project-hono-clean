# Admin App (Refine)

Separate HQ control panel — **not** part of the member portal layout.

## Run locally

```bash
# Terminal 1 — API
pnpm dev:api

# Terminal 2 — Admin (port 5174)
pnpm dev:admin
```

Open http://localhost:5174

## Auth

- Separate session key: `spacex_admin_session` (not shared with member portal)
- OTP login at `/login` — same backend `/auth/*` endpoints
- Requires `members.role = admin` (Laravel parallel: `isadmin` middleware)

### Dev bypass

Set in `admin/.env.local`:

```
VITE_DEV_ADMIN_MEMBER_ID=10000000-0000-0000-0000-000000000002
VITE_DEV_ADMIN_EMAIL=admin@spacex.hq
```

Uses `dev-bypass` token when `DEV_BYPASS_MEMBER_ID` matches on the backend.

## Resources (Refine CRUD)

| Section | API |
|---|---|
| Dashboard | Stats from `/admin/members`, `/admin/upgrade-requests` |
| Upgrades | List `/admin/upgrade-requests`, review `PATCH /upgrade-requests/:id` |
| Members | `/admin/members` |
| Tiers | `/admin/tiers` |
| Platform settings | `GET/PATCH /admin/settings` |
| Notify | `POST /admin/notify` |

All responses use Hono `{ success, data }` format via custom `dataProvider`.

## Member portal

Admin routes were **removed** from `frontend/` (port 5173). Use this app for all HQ tasks.

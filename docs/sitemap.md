# Project Sitemap

**Last updated:** 2026-06-29

Folder tree with one-line description per major file or folder.

```
zam-app/
├── Agent.md                          — AI architect rules; Laravel reference workflow
├── UPGRADE_REQUESTS.md               — Upgrade feature analysis, API, E2E results
├── README.md                         — Project overview and setup
├── package.json                      — Monorepo root scripts
├── pnpm-workspace.yaml               — Workspace packages (frontend, backend, lib)
│
├── docs/
│   ├── sitemap.md                    — This file
│   ├── architecture/
│   │   └── database-domains.md       — DB tables grouped by business domain
│   ├── workflows/
│   │   ├── identity.md               — OTP login flow
│   │   ├── membership.md             — Tier upgrade + admin review
│   │   ├── benefits.md               — Badges, profits, events
│   │   ├── engagement.md             — Notifications + email
│   │   └── platform.md               — Global settings
│   └── screenshots/
│       └── audit-2026-06-29/         — UI audit screenshots (login → admin)
│
├── backend/                          — Hono API on Cloudflare Workers
│   ├── src/
│   │   ├── index.ts                  — App entry; mounts all routes
│   │   ├── middleware/
│   │   │   ├── auth.ts               — requireAuth, requireAdmin, token resolution
│   │   │   ├── error.ts              — Global error handler
│   │   │   └── validate.ts           — Request validation helpers
│   │   ├── lib/
│   │   │   ├── supabase.ts           — Supabase REST client (service role)
│   │   │   ├── notify.ts             — Upgrade notification + Resend email
│   │   │   └── errors.ts             — AppError class
│   │   └── routes/
│   │       ├── otp.ts                — POST /auth/send-otp, verify-otp
│   │       ├── members.ts            — Member CRUD + /me
│   │       ├── sessions.ts           — Session management
│   │       ├── tiers.ts              — Public tier catalog
│   │       ├── upgrade-requests.ts   — Upgrade workflow (member + admin PATCH)
│   │       ├── tier-change-history.ts — Tier audit log (read)
│   │       ├── badges.ts             — Badge catalog
│   │       ├── profit-distributions.ts — Member yield records (read)
│   │       ├── event-bookings.ts     — Event booking CRUD
│   │       ├── notifications.ts      — Member notifications
│   │       ├── settings.ts           — Public platform flags
│   │       └── admin.ts              — Admin notify, members, tiers, settings CRUD
│   ├── wrangler.jsonc                — Cloudflare Worker config
│   └── test.mjs                      — API smoke tests
│
├── admin/                            — Refine HQ control panel (separate app, port 5174)
│   ├── README.md                     — Admin run/auth instructions
│   ├── src/
│   │   ├── App.tsx                   — Refine + Ant Design layout (not member portal)
│   │   ├── providers/                — Hono dataProvider + authProvider
│   │   └── pages/                    — dashboard, upgrades, members, tiers, settings, notify
│   └── vite.config.ts                — Dev server :5174, /api proxy
│
├── frontend/                         — React member portal (port 5173)
│   ├── src/
│   │   ├── App.tsx                   — React Router route definitions
│   │   ├── main.tsx                  — Entry; dev session + Sonner toasts
│   │   ├── lib/
│   │   │   └── api.ts                — All backend API calls + session storage
│   │   ├── hooks/                    — TanStack Query hooks (auth, member, upgrade, etc.)
│   │   ├── routes/
│   │   │   ├── Dashboard.tsx         — Home; profile card + locked assets
│   │   │   ├── Upgrade.tsx           — Tier selection
│   │   │   ├── Payment.tsx           — Submit upgrade request
│   │   │   ├── History.tsx           — Payment/upgrade history
│   │   │   ├── Badges.tsx            — Tier-gated badge display
│   │   │   ├── Notifications.tsx     — Notification list
│   │   │   ├── Profile.tsx           — Member profile + sign out
│   │   │   ├── Auth/Login.tsx        — OTP login flow
│   │   └── components/               — UI building blocks by feature area
│   └── vite.config.ts                — Dev server + /api proxy to backend
│
├── lib/db/                           — Drizzle ORM schema definitions
│   └── src/schema/                   — Table schemas (members, tiers ref in migrations only)
│
└── supabase/
    ├── migrations/                   — Source of truth for DB schema + RLS
    ├── seed/seed.sql                 — Dev demo data (members, tiers, badges, etc.)
    └── types.ts                      — Generated Supabase types (may lag migrations)
```

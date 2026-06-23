# Project Setup Guide

## Project Architecture Overview

This is a monorepo containing a **Hono backend** (Cloudflare Workers) and a **React frontend** (Vite + Tailwind CSS v4).

```
zamproject-hono/
├── backend/          ← Hono API — deployed to Cloudflare Workers
├── frontend/         ← React SPA — Router-postal-v1 application
├── packages/
│   └── shared-types/ ← Shared TypeScript types (backend ↔ frontend)
├── repomix-hono.md   ← Full repository map of the original Hono project
└── repomix-router.md ← Full repository map of the merged Router frontend
```

---

## Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx                      ← Root router (BrowserRouter + Routes)
│   ├── main.tsx                     ← React entry point
│   ├── styles.css                   ← Global CSS + Tailwind v4 + Portal theme tokens
│   ├── components/
│   │   ├── dashboard/               ← Dashboard cards (LockedAsset, ProfileCard)
│   │   ├── history/                 ← Payment history list + preview
│   │   ├── notifications/           ← Notification list, detail, sheet
│   │   ├── payment/                 ← Payment detail, summary, invoice export
│   │   ├── shared/                  ← PageLayout, Header, BottomTabs, Loader
│   │   ├── ui/                      ← shadcn/ui primitives (Radix UI wrappers)
│   │   └── upgrade/                 ← Tier cards + upgrade form
│   ├── context/
│   │   └── QueryClientContext.tsx   ← TanStack Query provider
│   ├── hooks/                       ← Feature hooks (useAuth, useMember, useNotifications…)
│   ├── integrations/
│   │   └── supabase/                ← Supabase client + generated DB types
│   ├── lib/
│   │   ├── api.ts                   ← Mock API layer (swap for real fetch calls)
│   │   ├── queryKeys.ts             ← TanStack Query key factories
│   │   └── utils.ts                 ← Tailwind merge helper (cn)
│   ├── routes/                      ← Page-level route components
│   │   ├── Auth/Login.tsx
│   │   ├── Admin/
│   │   ├── Dashboard.tsx
│   │   ├── History.tsx
│   │   ├── Notifications.tsx
│   │   ├── Payment.tsx
│   │   ├── Processing.tsx
│   │   ├── Profile.tsx
│   │   ├── Upgrade.tsx
│   │   └── Root.tsx                 ← Layout wrapper for all routes
│   └── types/                       ← Domain types (user, payment, notification, upgrade)
├── public/                          ← Static assets (icons, placeholders)
├── supabase/config.toml             ← Supabase local dev config
├── components.json                  ← shadcn/ui CLI config
├── .env.example                     ← Required environment variables
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── package.json
```

**Application Routes:**

| Path                   | Component            | Purpose                                  |
|------------------------|----------------------|------------------------------------------|
| `/`                    | Index                | Home / landing                           |
| `/dashboard`           | Dashboard            | Member dashboard with locked assets      |
| `/profile`             | Profile              | Member profile & clearance info          |
| `/upgrade`             | Upgrade              | Tier upgrade selection & payment form    |
| `/history`             | History              | Payment history list                     |
| `/notifications`       | Notifications        | Notification centre                      |
| `/payment`             | Payment              | Payment processing                       |
| `/processing`          | Processing           | Payment processing state                 |
| `/badges`              | Badges               | Member badge display                     |
| `/login`               | Auth/Login           | OTP-based login                          |
| `/admin`               | Admin/Index          | Admin dashboard                          |
| `/admin/notifications` | Admin/Notifications  | Admin notification management            |

---

## Backend Structure

```
backend/
├── src/
│   ├── index.ts           ← Hono app entry; registers routes
│   ├── routes/
│   │   ├── users.ts       ← /users CRUD
│   │   └── posts.ts       ← /posts CRUD
│   ├── db/
│   │   ├── index.ts       ← Drizzle DB connection (Cloudflare D1)
│   │   └── schema/        ← Drizzle table definitions (users, posts)
│   ├── middleware/
│   │   ├── error.ts       ← Global error handler
│   │   └── validate.ts    ← Zod validation middleware
│   ├── lib/
│   │   ├── errors.ts      ← Typed error classes
│   │   └── validators.ts  ← Shared Zod schemas
│   └── types/
│       └── env.ts         ← Cloudflare Worker env bindings type
├── migrations/            ← Drizzle Kit SQL migrations
├── wrangler.jsonc         ← Cloudflare Workers config
├── drizzle.config.ts
└── package.json
```

**API Endpoints:**

| Method | Path      | Description         |
|--------|-----------|---------------------|
| GET    | /         | Health check        |
| GET    | /health   | Health status       |
| *      | /users/*  | User CRUD routes    |
| *      | /posts/*  | Post CRUD routes    |

---

## Environment Variables

### Frontend (`.env.local` — never commit)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8787
```

See `frontend/.env.example` for the full template.

### Backend (Cloudflare Workers / wrangler secrets)

Set via `wrangler secret put`:

```
DATABASE_URL   ← Cloudflare D1 binding (configured in wrangler.jsonc)
```

---

## Local Development Instructions

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9 (workspace support)
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account (for backend deployment)
- Supabase project (for auth + database)

### 1. Install all dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your Supabase credentials
```

### 3. Start the backend (Cloudflare Worker local dev)

```bash
npm run dev:api
# Runs wrangler dev — API available at http://localhost:8787
```

### 4. Start the frontend

```bash
npm run dev:web
# Runs Vite dev server — UI available at http://localhost:5173
# Proxies /api/* → http://localhost:8787 automatically
```

---

## Build Instructions

```bash
# Build frontend only
npm -w frontend run build
# Output: frontend/dist/

# Deploy backend to Cloudflare Workers
npm run deploy:api

# Deploy frontend (static hosting, e.g. Cloudflare Pages)
npm run deploy:web
```

---

## Deployment Instructions

### Backend — Cloudflare Workers

1. Authenticate: `wrangler login`
2. Set secrets: `wrangler secret put DATABASE_URL` (if not using D1 binding)
3. Run migrations: `npm -w backend run db:migrate` (configure in drizzle.config.ts)
4. Deploy: `npm run deploy:api`

### Frontend — Cloudflare Pages (recommended)

1. Connect the repo to Cloudflare Pages in the dashboard
2. Set build command: `npm -w frontend run build`
3. Set output directory: `frontend/dist`
4. Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_BASE_URL)
5. Deploy

---

## Supabase Integration Notes

The frontend includes a pre-configured Supabase client at `frontend/src/integrations/supabase/client.ts`.

- It reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from environment variables.
- The `Database` type at `frontend/src/integrations/supabase/types.ts` is a placeholder — generate real types using the Supabase CLI: `supabase gen types typescript --project-id <id> > frontend/src/integrations/supabase/types.ts`
- Auth persistence uses `localStorage` on the client side.
- The `supabase` export is wrapped in a lazy proxy — it won't attempt to connect until first use, preventing build-time errors on missing credentials.
- The `supabase/config.toml` in the frontend directory supports local Supabase development via `supabase start`.

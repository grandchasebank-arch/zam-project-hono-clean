# ZAM App

Full-stack monorepo: **Hono** API on Cloudflare Workers + **React** SPA (Vite), managed with **pnpm** workspaces.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for backend dev)
- Supabase project (database + auth)

## Quick start

```bash
pnpm install

# Backend secrets (edit with your Supabase keys — not committed)
# backend/.dev.vars

# Frontend env
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_BASE_URL=/api
```

Run both services in separate terminals:

```bash
pnpm run dev:api   # Hono backend → http://localhost:8787
pnpm run dev:web   # Vite frontend → http://localhost:5173
```

Apply database migrations:

```bash
supabase db push
```

## Project structure

```
zam-app/
├── backend/              Hono API (Cloudflare Workers)
├── frontend/             React + Vite SPA
├── packages/shared-types/  Shared TypeScript types
├── lib/db/               Drizzle schema reference (not runtime)
├── supabase/migrations/  Source of truth for DB schema
└── UPGRADE_REQUESTS.md   Feature documentation (upgrade module)
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run dev:api` | Start backend (wrangler dev) |
| `pnpm run dev:web` | Start frontend (Vite) |
| `pnpm run build` | Build all packages |
| `pnpm run deploy` | Build + deploy API and web |

## Documentation

- **[UPGRADE_REQUESTS.md](./UPGRADE_REQUESTS.md)** — Upgrade requests module: API, business rules, E2E results, known issues
- **[Notion — Upgrade Requests](https://app.notion.com/p/38db4ab87a2f81e0a69ccb831a93462b)** — Same doc in Notion (under ZAM Project — Architecture Summary)

## Local dev notes

- Backend reads secrets from `backend/.dev.vars` (not committed).
- Frontend proxies `/api` → `http://localhost:8787` in dev (`vite.config.ts`).
- Dev bypass login: set `VITE_DEV_MEMBER_ID` in `.env.local` and `DEV_BYPASS_MEMBER_ID` in `.dev.vars` to the same member UUID.
- Manual API tests: `node backend/test.mjs`, `node backend/test-lifecycle.mjs`

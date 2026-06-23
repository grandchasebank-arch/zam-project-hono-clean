# Zam Project - Hono & React Workspace

This is a clean, normalized version of the Zam Project, converted from a Replit-dependent workspace into a standard pnpm workspace.

## Structure
- `backend/`: Hono backend (Cloudflare Workers ready)
- `frontend/`: React + Vite frontend
- `packages/shared-types/`: Shared TypeScript types
- `supabase/`: Supabase configurations and migrations
- `lib/`: Shared library code

## Getting Started

### Prerequisites
- Node.js
- pnpm

### Installation
```bash
pnpm install
```

### Development

#### Backend
```bash
pnpm --filter backend run dev
```

#### Frontend
```bash
pnpm --filter frontend run dev
```

### Build
```bash
pnpm run build
```

## Environment Variables
Ensure you have the necessary environment variables set in `backend/.env` and `frontend/.env`.
Refer to `.env.example` in respective directories.

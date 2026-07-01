# Deploy (Cloudflare)

Manual deploy via **GitHub Actions → Deploy → Run workflow**. CI runs automatically on PRs to `main`.

## GitHub repository secrets

Set at: `https://github.com/grandchasebank-arch/zam-project-hono-clean/settings/secrets/actions`

**Quick setup (local):**

```powershell
.\scripts\set-github-secrets.ps1
```

Or set manually:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Workers + Pages edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker → Supabase admin |
| `SUPABASE_ANON_KEY` | Worker → Supabase anon |
| `RESEND_API_KEY` | Production email |
| `RESEND_FROM` | e.g. `noreply@spacexhqvip.com` |
| `EMAIL_PROVIDER` | `resend` in production |
| `ALLOWED_ORIGINS` | Comma-separated Pages URLs for CORS |
| `VITE_SUPABASE_URL` | Frontend build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend build (anon key) |
| `VITE_API_BASE_URL` | Worker URL, e.g. `https://zamproject-api.<subdomain>.workers.dev` |

**Never commit** tokens or `.dev.vars` / `.env` files.

## Cloudflare projects

| App | Wrangler name | Type |
|-----|---------------|------|
| API | `zamproject-api` | Worker (`backend/`) |
| Member portal | `zamproject-frontend` | Pages (`frontend/`) |
| Admin | `zamproject-admin` | Pages (`admin/`) |

Pages projects are created automatically on first `wrangler pages deploy` if they don't exist.

## First deploy checklist

1. Push this repo (with `.github/workflows/`) to GitHub.
2. Confirm all GitHub secrets above are set.
3. Apply Supabase migrations: `supabase db push` (not part of CF deploy yet).
4. Run **Deploy** workflow (admin checkbox optional).
5. Copy Worker URL from Cloudflare dashboard → update `VITE_API_BASE_URL` secret if placeholder was used.
6. Update `ALLOWED_ORIGINS` with real Pages URLs → re-run Deploy.
7. Smoke test: login OTP, upgrade flow, receipt upload.

## Local manual deploy

```bash
pnpm install
cd backend && pnpm exec wrangler deploy
cd ../frontend && VITE_API_BASE_URL=https://... pnpm build && pnpm deploy
```

## Security

Rotate any API token that was shared in chat or logs. Use scoped Cloudflare tokens only.

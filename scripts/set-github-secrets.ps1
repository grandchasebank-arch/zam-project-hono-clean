# Set GitHub Actions secrets for Cloudflare deploy.
# Run from repo root AFTER pushing workflows to GitHub:
#   .\scripts\set-github-secrets.ps1
#
# Requires: gh CLI logged in (gh auth login)
# Reads: backend/.env (never committed)

$ErrorActionPreference = "Stop"
$envPath = Join-Path $PSScriptRoot "..\backend\.env"

if (-not (Test-Path $envPath)) {
  Write-Error "Missing backend/.env — copy from .dev.vars.example and fill in values."
}

$vars = @{}
Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { return }
  $vars[$line.Substring(0, $eq).Trim()] = $line.Substring($eq + 1).Trim()
}

# Cloudflare — paste when prompted if not in .env
$cfToken = Read-Host "Cloudflare API token (CLOUDFLARE_API_TOKEN)"
$cfAccount = Read-Host "Cloudflare Account ID (CLOUDFLARE_ACCOUNT_ID)"

$apiUrl = Read-Host "Worker URL for VITE_API_BASE_URL (Enter to use placeholder; update after first deploy)"
if (-not $apiUrl) { $apiUrl = "https://zamproject-api.workers.dev" }

$origins = Read-Host "ALLOWED_ORIGINS (comma-separated Pages URLs; Enter for defaults)"
if (-not $origins) {
  $origins = "https://zamproject-frontend.pages.dev,https://zamproject-admin.pages.dev"
}

function Set-GhSecret($name, $value) {
  if (-not $value) { Write-Warning "Skipping $name (empty)"; return }
  $value | gh secret set $name
  Write-Host "Set $name"
}

Set-GhSecret "CLOUDFLARE_API_TOKEN" $cfToken
Set-GhSecret "CLOUDFLARE_ACCOUNT_ID" $cfAccount
Set-GhSecret "SUPABASE_SERVICE_ROLE_KEY" $vars["SUPABASE_SERVICE_ROLE_KEY"]
Set-GhSecret "SUPABASE_ANON_KEY" $vars["SUPABASE_ANON_KEY"]
Set-GhSecret "RESEND_API_KEY" $vars["RESEND_API_KEY"]
Set-GhSecret "RESEND_FROM" $vars["RESEND_FROM"]
Set-GhSecret "EMAIL_PROVIDER" "resend"
Set-GhSecret "ALLOWED_ORIGINS" $origins
Set-GhSecret "VITE_SUPABASE_URL" $vars["SUPABASE_URL"]
Set-GhSecret "VITE_SUPABASE_PUBLISHABLE_KEY" $vars["SUPABASE_ANON_KEY"]
Set-GhSecret "VITE_API_BASE_URL" $apiUrl

Write-Host "`nDone. Verify: gh secret list"
Write-Host "Next: push to GitHub, then Actions -> Deploy -> Run workflow"

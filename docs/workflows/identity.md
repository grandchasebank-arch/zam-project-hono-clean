# Identity Workflow

**Domain:** Identity — *Who are you? Can you log in?*  
**Tables:** `members`, `sessions`, `otp_codes`  
**Laravel parallel:** `users`, `sessions`, email verification / OTP flows

---

## Plain summary

A member enters their email, receives a one-time code, verifies it, and gets a session token. The portal remembers them until the token expires or they sign out.

Members must already exist in the database — there is no self-registration yet.

---

## User flow

```
1. Visit /login
2. Enter registered email
3. Backend stores code in otp_codes (10 min expiry)
4. Enter 6-digit code
5. Backend verifies → finds members row → creates sessions row
6. Frontend saves token in localStorage
7. Redirect to /dashboard
```

**Sign out:** Profile → Sign Out → clears localStorage → /login

**Dev shortcut:** `VITE_DEV_MEMBER_ID` auto-logs in with `dev-bypass` token (local only).

---

## Request / response flow

| Step | Request | Success response |
|---|---|---|
| Send OTP | `POST /auth/send-otp` `{ email }` | `{ success: true, data: { ok: true } }` |
| Verify OTP | `POST /auth/verify-otp` `{ email, code }` | `{ success: true, data: { token, member_id, email } }` |
| Current member | `GET /members/me` + Bearer token | `{ success: true, data: { ...member } }` |

Errors return `{ success: false, error: { message, code } }` (e.g. `INVALID_OTP`, `NOT_FOUND`).

---

## Auth middleware (backend)

Two token paths resolve to a member:

1. **Supabase JWT** → lookup `members.auth_user_id`
2. **Custom session token** → lookup `sessions.token` → `member_id`

Middleware: `requireAuth`, `requireAuthWithMember`, `requireAdmin`

---

## Laravel philosophy applied

- Laravel gates dashboard routes with `auth:sanctum` + `verified`
- zam-app gates API routes with Bearer token middleware
- OTP codes are backend-only (like Laravel's password reset tokens — not exposed to clients)

---

## Related files

| Layer | Path |
|---|---|
| Login UI | `frontend/src/routes/Auth/Login.tsx` |
| Session storage | `frontend/src/lib/api.ts` |
| OTP routes | `backend/src/routes/otp.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| RLS | `supabase/migrations/20260623000001_rls_policies.sql` |

---

## Known gaps

- No frontend route guard (unauthenticated users can hit `/dashboard` and see loading/errors)
- No member self-registration flow
- OTP returned in dev response (`_dev_code`) — remove before production

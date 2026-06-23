# Next Steps

Priority-ordered action list for completing the zamproject-hono integration.

---

## Priority 1 — Critical (blocking the app from running)

### 1.1 Configure Environment Variables

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:
- `VITE_SUPABASE_URL` — from your Supabase project settings
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the `anon` key from Supabase
- `VITE_API_BASE_URL` — `http://localhost:8787` for local dev

Without these, `supabase/client.ts` will throw on first auth operation.

### 1.2 Install Dependencies

```bash
npm install          # from repo root — installs all workspaces
```

### 1.3 Verify Dev Server Starts

```bash
npm run dev:api      # terminal 1 — Hono backend on :8787
npm run dev:web      # terminal 2 — Vite frontend on :5173
```

---

## Priority 2 — Missing Supabase Implementation

The Supabase client is wired but the schema is empty and auth is not implemented end-to-end.

### 2.1 Provision Supabase Project
- Create a project at [supabase.com](https://supabase.com)
- Enable email/OTP auth in the Auth settings

### 2.2 Generate Real Database Types

```bash
supabase gen types typescript \
  --project-id <your-project-id> \
  > frontend/src/integrations/supabase/types.ts
```

### 2.3 Design the Database Schema

The current mock API suggests these entities are needed in Supabase:

| Table | Key Fields | Notes |
|-------|------------|-------|
| `members` | id, email, name, tier, clearance, status, joined_at | Core member record |
| `notifications` | id, member_id, kind, title, message, unread, created_at | Push notifications |
| `payment_records` | id, member_id, tier, amount_cents, status, reference, created_at | Payment history |
| `upgrade_requests` | id, member_id, tier_id, status, submitted_at | Tier upgrade queue |
| `tiers` | id, name, price_cents, clearance, features | Available membership tiers |

### 2.4 Apply Migrations

```bash
supabase db push   # or use the Supabase dashboard SQL editor
```

---

## Priority 3 — Missing Authentication Work

Authentication currently uses OTP simulation via `localStorage`. Real auth must be wired to Supabase Auth.

### 3.1 Replace Mock OTP with Supabase Auth

In `frontend/src/lib/api.ts`, replace `sendOTP` and `verifyOTP`:

```ts
import { supabase } from "@/integrations/supabase/client";

export async function sendOTP(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return { ok: true, email };
}

export async function verifyOTP(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email, token: code, type: "email"
  });
  if (error) throw error;
  return data.session;
}
```

### 3.2 Add Route Protection

In `frontend/src/App.tsx`, add an auth guard component:

```tsx
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: isLoggedIn, isLoading } = useSession();
  if (isLoading) return <Loader />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

Wrap protected routes:
```tsx
<Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
```

### 3.3 Sync Session State with Supabase

Replace the `isLoggedIn` mock with a Supabase session check:

```ts
export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}
```

---

## Priority 4 — Missing Storage Work

No file storage is currently implemented. If the app needs to store documents, avatars, or PDF invoices:

### 4.1 Configure Supabase Storage Buckets
- `avatars` bucket — member profile photos (public read, auth write)
- `invoices` bucket — generated PDF receipts (private, auth read/write)

### 4.2 Wire Invoice Export
`frontend/src/components/payment/InvoiceExport.tsx` generates PDFs locally using `jspdf` + `html2canvas`. Once storage is live, upload to Supabase:

```ts
const { data, error } = await supabase.storage
  .from("invoices")
  .upload(`${memberId}/${paymentId}.pdf`, pdfBlob);
```

---

## Priority 5 — Missing API Work (Backend Integration)

All data in the frontend currently comes from the mock layer in `frontend/src/lib/api.ts`. Each function needs to be replaced with a real fetch to the Hono backend.

### 5.1 Add CORS to Hono Backend

```bash
npm -w backend install hono  # already installed — just add middleware
```

In `backend/src/index.ts`:

```ts
import { cors } from "hono/cors";
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173" }));
```

### 5.2 Add Required Backend Routes

| Current Mock | Required Hono Route | Method |
|--------------|---------------------|--------|
| `getMember()` | `/members/:id` | GET |
| `getUpgradeTiers()` | `/tiers` | GET |
| `submitUpgradeRequest()` | `/upgrade-requests` | POST |
| `getNotifications()` | `/notifications` | GET |
| `markNotificationAsRead()` | `/notifications/:id/read` | PATCH |
| `getHistory()` | `/payments` | GET |
| `getPaymentById()` | `/payments/:id` | GET |
| `adminNotifyMember()` | `/admin/notify` | POST |

### 5.3 Wire Frontend to Backend

In `frontend/src/lib/api.ts`, replace each mock function body:

```ts
const BASE = import.meta.env.VITE_API_BASE_URL;

export async function getMember(): Promise<Member> {
  const res = await fetch(`${BASE}/members/me`, {
    headers: { Authorization: `Bearer ${await getToken()}` }
  });
  if (!res.ok) throw new Error("Failed to fetch member");
  return res.json();
}
```

---

## Priority 6 — Missing Business Logic

### 6.1 Payment Processing
- The `/payment` and `/processing` routes currently simulate payment states with mock data
- Integration with a payment processor (Stripe or similar) is needed
- The Hono backend will need a `/payments/create-intent` endpoint

### 6.2 Admin Notification Dispatch
- `adminNotifyMember()` is a mock — real implementation should insert a row into the `notifications` Supabase table
- Admin role enforcement (Supabase RLS or JWT claims) is needed

### 6.3 Tier Upgrade Approval Flow
- Upgrade requests currently auto-succeed — an admin review workflow is needed
- Consider a Supabase Edge Function or Hono route to handle status transitions

### 6.4 Member Badge System
- The `/badges` route exists but the component is not yet implemented
- Needs a `badges` table + logic for badge assignment rules

---

## Priority 7 — Technical Debt

| Item | Description |
|------|-------------|
| Lovable.dev error reporting | `frontend/src/lib/lovable-error-reporting.ts` and `error-capture.ts` contain Lovable.dev-specific error hooks. These should be replaced with a generic error boundary or removed. |
| `error-page.ts` | References Lovable.dev error page rendering — remove or replace with a standard React error boundary. |
| Unused Supabase `client.server.ts` | `frontend/src/integrations/supabase/client.server.ts` exists for SSR but this is a pure client-side SPA. Remove if SSR is not planned. |
| `useTheme` hook incomplete | `frontend/src/hooks/useTheme.ts` — the light/dark mode toggle applies a class to `html` but has no persistence. Add `localStorage` or Supabase user preference storage. |
| `shared-types` package | `packages/shared-types/src/index.ts` is empty. Once backend API types stabilize, extract shared request/response types here and import from both frontend and backend. |
| React 19 compatibility | A small number of Radix UI packages may have peer dep warnings against React 19. Monitor upstream releases and upgrade as they stabilize. |

---

## Priority-Ordered Action List

1. **`npm install` + `npm run dev:api` + `npm run dev:web`** — verify the merged project starts locally
2. **Configure `.env.local`** — Supabase URL + anon key
3. **Provision Supabase project** — enable OTP auth, design schema, run migrations
4. **Generate Supabase types** — `supabase gen types typescript ...`
5. **Replace mock auth** — wire `sendOTP` / `verifyOTP` to Supabase Auth
6. **Add route guards** — protect all non-auth routes behind `RequireAuth`
7. **Add CORS to Hono backend** — enable frontend → backend requests
8. **Build required backend routes** — see table in §5.2
9. **Wire frontend mock API → real fetch calls** — replace `src/lib/api.ts` function bodies
10. **Wire payment processor** — Stripe or equivalent
11. **Implement admin approval flow** — upgrade request state machine
12. **Clean Lovable.dev artifacts** — remove `error-capture.ts`, `lovable-error-reporting.ts`, `client.server.ts`
13. **Populate `shared-types`** — extract common request/response types for backend/frontend sharing
14. **Implement badge system** — design badge rules, create UI
15. **Production deployment** — configure Cloudflare Pages (frontend) + Cloudflare Workers (backend) with production env vars

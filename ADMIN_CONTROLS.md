# Admin Controls — Feature / Module Analysis

**Last updated:** 2026-06-30  
**Notion:** [Architecture cheat sheet](https://app.notion.com/p/38fb4ab87a2f80efa000fe7a9da29837)  
**Depends on:** [PAYMENT_FLOW.md](./PAYMENT_FLOW.md), [FEATURE_FLAGS.md](./FEATURE_FLAGS.md)

---

## Status

Planning + partial implementation. Admin app (`:5174`) has upgrade queue, member edit, tiers, settings, notify. Receipt review, member access overrides, and receipt inbox are **planned** (Phase 2–4).

---

## Purpose

HQ manually controls:

- Payment verification (per-receipt, not just whole-request approve/reject)
- Member tier and access (comps, overrides, feature flags per member)
- Platform configuration (settings, global flags)

Human-in-the-loop aligns with proof-of-payment model — admin is Mission Control.

---

## How It Works

1. **Requests queue (A1)** — List upgrade requests with filters, paid/total, receipt count.
2. **Request detail (A2)** — View receipts inline, accept/reject each, notes, manual `amount_paid`, final approve.
3. **Member access (A3)** — Search member, tier bump without payment, feature overrides, full payment history.
4. **Receipt inbox (A4)** — Flat `PENDING_REVIEW` queue for high-volume review (flag: `receipt_review_inbox`).

---

## Location

### Admin app (existing)

- `admin/src/App.tsx` — resources: dashboard, upgrade-requests, members, tiers, settings, notify
- `admin/src/pages/upgrade-requests/list.tsx` — A1 queue (basic)
- `admin/src/pages/upgrade-requests/show.tsx` — A2 partial (status buttons only today)
- `admin/src/pages/members/edit.tsx` — name, tier, status, role
- `admin/src/pages/settings/edit.tsx` — branding, mail, platform switches

### Admin app (planned)

- `admin/src/pages/upgrade-requests/show.tsx` — extend with receipts panel
- `admin/src/pages/receipts/list.tsx` — A4 inbox
- `admin/src/pages/members/edit.tsx` — feature overrides + payment history tab
- `admin/src/pages/feature-flags/` — global flag toggles

### Backend

- `backend/src/routes/admin.ts` — settings, members, tiers, upgrade list
- `backend/src/routes/payment-receipts.ts` — receipt review endpoints
- `backend/src/routes/admin.ts` — feature flag + override CRUD (planned)

---

## Screens

### [A1] Requests Queue

| Column | Source |
|--------|--------|
| Member | `members` join |
| From → To tier | `upgrade_requests` |
| Status | color chip (7 states) |
| Paid / Total | `amount_paid` / `total_amount` |
| Receipts | count from `payment_receipts` |
| Created | `created_at` |

Filters: All, Awaiting payment, Under review, Partially paid, Approved, Rejected

### [A2] Request Detail + Review

- Request summary (tiers, amounts, status stepper)
- **Receipts table:** thumbnail/link, amount claimed, status, submitted date
- Per receipt: **Accept** / **Reject** + `admin_note`
- **Manual `amount_paid`** field (cash/offline confirmation)
- **Status override** dropdown (emergency)
- **Approve & Upgrade Tier** — sets APPROVED + tier change (if not auto)

### [A3] Member Access Control

- Profile summary
- **Tier override** — change tier without payment (logs `tier_change_history` with `changed_by`)
- **Feature overrides** — toggles from [FEATURE_FLAGS.md](./FEATURE_FLAGS.md) per member
- **Payment history** — all `upgrade_requests` + receipts for member
- Future: page-level access (deferred; use flags first)

### [A4] Receipt Review Inbox

- Flat list: all `payment_receipts` where `status = PENDING_REVIEW`
- Quick accept/reject without opening full request (links to A2 for context)

---

## User Flow (admin)

1. Login OTP → dashboard.
2. **Upgrades** sidebar → filter `UNDER_REVIEW` or `PARTIALLY_PAID`.
3. Open row → review receipts → accept/reject.
4. System updates `amount_paid`; auto-approves when fully paid.
5. Optional: **Members** → edit → comp tier or set feature override.
6. Optional: **Receipt inbox** (when flag on) for batch review.

---

## Business Rules

| Action | Allowed | Notes |
|--------|---------|-------|
| Accept receipt | Admin only | Recomputes `amount_paid` |
| Reject receipt | Admin only | Does not add to `amount_paid`; member can resubmit |
| Manual `amount_paid` | Admin only | Audit via `admin_notes` on request |
| Tier bump without payment | Admin only | Writes `tier_change_history`; no receipt required |
| Member override flag | Admin only | Stored in `member_feature_overrides` |
| Delete upgrade request | No | Cancel is member-only in early states |
| Approve with unpaid balance | No* | *Unless admin forces status override (logged) |

---

## API Endpoints

### Existing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/upgrade-requests` | All requests |
| PATCH | `/upgrade-requests/:id` | Status + notes |
| GET/PATCH | `/admin/members/:id` | Member CRUD |
| GET/PATCH | `/admin/settings` | Platform config |

### Planned (with PAYMENT_FLOW Phase 1–2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/upgrade-requests/:id/receipts` | Receipts for request |
| PATCH | `/admin/receipts/:id` | Accept/reject receipt |
| GET | `/admin/receipts` | Inbox (`PENDING_REVIEW`) |
| PATCH | `/admin/upgrade-requests/:id` | `amount_paid` override |
| GET/PATCH | `/admin/feature-flags` | Global flags |
| GET/PUT/DELETE | `/admin/members/:id/feature-overrides/:key` | Per-member overrides |

---

## Dependencies

- [PAYMENT_FLOW.md](./PAYMENT_FLOW.md) — receipts schema + status machine
- [FEATURE_FLAGS.md](./FEATURE_FLAGS.md) — `receipt_review_inbox`, override storage
- `requireAdmin` middleware
- Supabase Storage signed URLs for receipt preview

---

## Known Issues

- Current show page only has Approve / Reject / Under Review on **whole request** — no per-receipt.
- No `amount_paid` / `total_amount` columns in UI yet.
- Member edit has no payment history or overrides.

---

## Related Features

- [UPGRADE_REQUESTS.md](./UPGRADE_REQUESTS.md)
- Admin settings — `support_email` used as Teams/contact stand-in (mailto)
- Notifications — admin actions should trigger member notifications

# Payment Flow — Feature / Module Analysis

**Last updated:** 2026-06-30  
**Notion:** [Architecture cheat sheet](https://app.notion.com/p/38fb4ab87a2f80efa000fe7a9da29837)  
**Replaces:** Fake checkout on `/payment` (see [UPGRADE_REQUESTS.md](./UPGRADE_REQUESTS.md) for current behavior)

---

## Status

**Phase 2 complete (member UI)** — Payment Instructions page + receipt upload wired behind flags. `split_payment` remains OFF (single full-amount receipt). Phase 3: 4-tab nav + Home cards.

---

## Purpose

Manual **proof-of-payment** system with human review:

```
PAYMENT REQUEST → RECEIPT SUBMISSION → ADMIN VERIFICATION → ACCESS GRANTED
```

Not a payment gateway. Members contact HQ (via `support_email`), upload receipts, admins verify, tier unlocks when paid in full.

---

## How It Works

1. **Tier select** — `/upgrade` unchanged; user picks target tier.
2. **Create request** — `POST /upgrade-requests` creates row with `status: REQUESTED` (or `AWAITING_PAYMENT`), `total_amount` from `tiers.price`.
3. **Payment instructions** — `/payment` becomes instructions page: tier summary, concierge copy, mailto `support_email`, upload CTA.
4. **Receipt upload** — `POST /upgrade-requests/:id/receipts` stores file in Supabase Storage + `payment_receipts` row; request → `PAYMENT_SUBMITTED`.
5. **Admin review** — Accept/reject per receipt; `amount_paid` = sum of **ACCEPTED** receipts only.
6. **Split payment** — If `amount_paid < total_amount` → `PARTIALLY_PAID`; member uploads more.
7. **Auto-approve** — When `amount_paid >= total_amount` → `APPROVED` → `members.tier` updated + `tier_change_history`.
8. **History** — `/history` shows status chips, `$paid / $total`, drawer with stepper + receipts.

---

## Status Lifecycle

| Status | Meaning | Member copy (Rule 1) |
|--------|---------|----------------------|
| `REQUESTED` | Tier picked, no payment step yet | "We've received your request. Next: payment instructions." |
| `AWAITING_PAYMENT` | Awaiting contact / first receipt | "Contact our team for payment details." (mailto `support_email`) |
| `PAYMENT_SUBMITTED` | Receipt uploaded, not yet reviewed | "Your receipt is in. We'll review it within 24 hours." |
| `UNDER_REVIEW` | Admin actively checking | "Our team is checking your payment now." |
| `PARTIALLY_PAID` | Split pay; more owed | "You've paid $X of $Y. Upload another receipt." |
| `APPROVED` | Paid + verified | "You're all set! Welcome to [Tier]." |
| `REJECTED` | Receipt rejected | "We couldn't verify this receipt. [admin_note]. Please resubmit." |

**Migration map from legacy:** `PENDING` → `AWAITING_PAYMENT`

### Flow diagram

```
REQUESTED → AWAITING_PAYMENT → PAYMENT_SUBMITTED → UNDER_REVIEW
                                                      ├→ PARTIALLY_PAID → (more receipts) → UNDER_REVIEW
                                                      ├→ REJECTED → (resubmit)
                                                      └→ APPROVED
```

---

## Schema (planned)

### `upgrade_requests` (extend)

| Column | Type | Notes |
|--------|------|-------|
| `total_amount` | numeric(12,2) | From target tier price at create |
| `amount_paid` | numeric(12,2) | Sum of ACCEPTED receipts; default 0 |
| `status` | text | New enum values above |

Existing: `from_tier`, `to_tier`, `member_id`, `admin_notes`, `reviewed_at`, `reviewed_by`

### `payment_receipts` (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `upgrade_request_id` | uuid FK | |
| `member_id` | uuid FK | |
| `file_url` | text | Supabase Storage path |
| `file_type` | text | `pdf` \| `image` |
| `amount_claimed` | numeric(12,2) | User-declared amount |
| `member_note` | text | Optional |
| `status` | text | `PENDING_REVIEW` \| `ACCEPTED` \| `REJECTED` |
| `admin_note` | text | Rejection reason / confirmation |
| `submitted_at` | timestamptz | |
| `reviewed_at` | timestamptz | |
| `reviewed_by` | uuid FK → members | |

### Storage

- Bucket: `payment-receipts` (private; signed URLs for member/admin view)
- Max size: 10 MB; types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

---

## Location

### Backend

- `backend/src/routes/upgrade-requests.ts` — extend create + status logic
- `backend/src/routes/payment-receipts.ts` — **new** member upload + list
- `backend/src/routes/admin.ts` — receipt review, amount_paid override
- `backend/src/lib/receipts.ts` — recompute `amount_paid`, auto-status transitions

### Frontend (planned)

- `frontend/src/routes/Payment.tsx` → Payment Instructions
- `frontend/src/components/payment/ReceiptUpload.tsx` — **new**
- `frontend/src/components/history/PaymentPreview.tsx` — stepper + receipts
- `frontend/src/lib/upgradeStatus.ts` — copy + stepper index per status

### Admin (planned)

- `admin/src/pages/upgrade-requests/show.tsx` — receipts list + per-receipt actions
- `admin/src/pages/receipts/list.tsx` — receipt inbox (flag-gated)

---

## User Flow

1. `/upgrade` — select tier → confirm.
2. `POST /upgrade-requests` — creates request with `total_amount`, status `AWAITING_PAYMENT`.
3. `/payment` — instructions + mailto support + "Upload receipt".
4. Upload modal — file + amount claimed + optional note → `POST .../receipts`.
5. Toast + redirect to `/history`.
6. Track in History drawer — stepper, receipts, upload more if `PARTIALLY_PAID` or `REJECTED`.
7. On `APPROVED` — notification + tier visible on profile/home.

**Next action (Rule 2):** every screen has one CTA — Contact support | Upload receipt | View status | Done.

---

## Business Rules

| Rule | Detail |
|------|--------|
| `amount_paid` | Sum of receipts with `status = ACCEPTED` only |
| Rejected receipts | Do not count toward `amount_paid` |
| Auto `PARTIALLY_PAID` | When accepted total > 0 and < `total_amount` (requires `split_payment` flag) |
| Auto `APPROVED` | When `amount_paid >= total_amount` |
| One active request per target tier | Same as today; block duplicate in-flight requests |
| Cancel | Only in `REQUESTED` or `AWAITING_PAYMENT` (no accepted receipts) |
| `total_amount` | Set at create from `tiers.price`; admin can override |
| File limits | 10 MB; PDF or image only |
| Notifications | On receipt submitted, receipt accepted/rejected, status changes |

---

## Split Payment Logic

Example: Vanguard $300

1. Receipt #1: $150 claimed → admin accepts → `amount_paid = 150`, status `PARTIALLY_PAID`
2. Receipt #2: $150 claimed → admin accepts → `amount_paid = 300` → auto `APPROVED` → tier upgrade

If `split_payment` flag off: single receipt must cover full `total_amount` (or admin manual approve).

---

## API Endpoints

### Implemented / existing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upgrade-requests` | Member | Create request (being extended) |
| GET | `/upgrade-requests` | Member | History list |
| GET | `/upgrade-requests/:id` | Member | Detail |
| PATCH | `/upgrade-requests/:id` | Admin | Status override |

### Phase 1 (this sprint)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upgrade-requests/:id/receipts` | Member | Upload receipt (multipart) |
| GET | `/upgrade-requests/:id/receipts` | Member | List own receipts |
| GET | `/admin/upgrade-requests/:id/receipts` | Admin | List receipts for request |
| PATCH | `/admin/receipts/:id` | Admin | Accept/reject + admin_note |

### Phase 2+

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/receipts` | Admin | Flat inbox (`PENDING_REVIEW`) |
| PATCH | `/upgrade-requests/:id` | Admin | Manual `amount_paid` override |

---

## Dependencies

- [FEATURE_FLAGS.md](./FEATURE_FLAGS.md) — `payment_instructions`, `receipt_upload`, `split_payment`
- [ADMIN_CONTROLS.md](./ADMIN_CONTROLS.md) — review UI
- [DASHBOARD_STRUCTURE.md](./DASHBOARD_STRUCTURE.md) — Home status/progress bar
- `tiers.price`, `settings.support_email`, Supabase Storage

---

## Known Issues

- Current `/payment` still submits fake request (legacy until flag on).
- `payment_reference` / `payment_verified` columns unused — deprecate after migration.
- E2E tests assume `PENDING` status — update after migration.

---

## Open Questions

- Signed URL TTL for receipt viewing (default 1 hour).
- Whether admin must manually click "Approve & Upgrade" when fully paid or always auto.

**Decision:** Auto-approve when `amount_paid >= total_amount`; admin can still override status manually.

---

## Related Features

- [UPGRADE_REQUESTS.md](./UPGRADE_REQUESTS.md) — legacy flow (being superseded)
- Notifications — extend `notifyUpgradeStatus` for receipt events
- Tier change history — unchanged on approve

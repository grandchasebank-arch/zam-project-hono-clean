# Membership Workflow

**Domain:** Membership — *What tier are you? How did you get there?*  
**Tables:** `tiers`, `upgrade_requests`, `tier_change_history`  
**Laravel parallel:** `plans`, `user_plans`, `deposits`, `upgrades`  
**Feature doc:** [UPGRADE_REQUESTS.md](../../UPGRADE_REQUESTS.md)

---

## Plain summary

Members browse tier options, submit an upgrade request, and wait for HQ to approve. When approved, their tier updates and the change is logged for audit.

---

## Member flow

```
1. /upgrade — pick a tier (from tiers table)
2. /payment — review benefits + price
3. Submit → POST /upgrade-requests (status: PENDING)
4. Success screen + toast
5. Track in /history and /notifications
6. Pending badge shown on matching tier card
7. Optional: cancel PENDING request from history drawer
```

---

## Admin flow

```
1. Open admin app → http://localhost:5174 (separate from member portal)
2. /login — OTP as admin@spacex.hq
3. Refine sidebar: Dashboard, Upgrades, Members, Tiers, Platform, Notify
4. Approve upgrade → PATCH /upgrade-requests/:id
5. On APPROVE: members.tier updated, tier_change_history logged, member notified
6. Ant Design message confirms (Laravel parallel: flash success)
```

---

## Business rules

| Rule | Detail |
|---|---|
| Tier order | Target tier `rank` must be higher than current |
| Duplicate pending | One PENDING request per target tier per member → 409 |
| Status on create | Always `PENDING`; client cannot set status |
| Cancel | Member DELETE own PENDING requests only |
| Review metadata | `reviewed_at` + `reviewed_by` (members.id) on every admin PATCH |

---

## Laravel parallel

| Laravel step | zam-app step |
|---|---|
| View plans (`buy-plan`) | `/upgrade` tier cards |
| Deposit / payment proof | `/payment` submit (payment fields not fully wired) |
| Admin approves deposit (`ManageDepositController`) | Admin approves upgrade request |
| User plan activated | `members.tier` updated |
| NotificationHelper::create | `notifyUpgradeStatus()` |

---

## API endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/tiers` | Public |
| POST | `/upgrade-requests` | Member |
| DELETE | `/upgrade-requests/:id` | Member |
| PATCH | `/upgrade-requests/:id` | Admin |
| GET | `/admin/upgrade-requests` | Admin |
| GET | `/tier-change-history` | Member |

---

## Related files

| Layer | Path |
|---|---|
| Upgrade UI | `frontend/src/routes/Upgrade.tsx`, `Payment.tsx` |
| Admin review UI | `admin/src/pages/upgrade-requests/` (Refine app, port 5174) |
| Backend | `backend/src/routes/upgrade-requests.ts`, `tiers.ts` |
| Notifications | `backend/src/lib/notify.ts` |

---

## Known gaps

- `payment_reference` / `payment_verified` not set from Payment page
- Tier approval does not auto-update `badge_id` or `display_level`

# Benefits Workflow

**Domain:** Benefits — *What perks does your tier unlock?*  
**Tables:** `badges`, `profit_distributions`, `event_bookings`  
**Laravel parallel:** ROI on `users`, `user_plans` perks, subscriptions (no direct badge table)

---

## Plain summary

Higher tiers unlock digital badges, monthly profit distributions, and VIP event bookings. Badge definitions live in a catalog; whether a member has earned one depends on their current tier (and optionally `members.badge_id`).

---

## Badge flow (live UI)

```
1. /badges — load all badges + current member tier
2. Compare tier rank vs badge.tier_required
3. Show locked or earned state per badge
```

**Catalog vs earned:**

| Concept | Where |
|---|---|
| What badges exist | `badges` table |
| What member holds | `members.badge_id` (manual/seed today) |
| Unlock rule (UI) | Tier rank >= required tier |

---

## Profit distributions (API only)

```
Admin/system posts row → profit_distributions
Member reads → GET /profit-distributions
```

**Laravel parallel:** `account_bal`, `roi` updated on `users` + `tp__transactions` history

**UI today:** Dashboard shows locked asset cards → redirects to `/upgrade` (not wired to real data)

---

## Event bookings (API only)

```
Member POST event → event_bookings
Member GET own bookings
```

**Laravel parallel:** No direct equivalent — closest is subscription / VIP feature unlock

**UI today:** Not built; `badges.allows_event_booking` flag unused in backend validation

---

## API endpoints

| Method | Path | UI wired? |
|---|---|---|
| GET | `/badges` | Yes |
| GET | `/profit-distributions` | No |
| GET/POST/PATCH | `/event-bookings` | No |

---

## Future flow (when UI is built)

```
Tier approved → auto-assign matching badge → member sees on /badges
Monthly job → insert profit_distributions → notification (Engagement)
Member with allows_event_booking → book event → event_bookings row
```

---

## Related files

| Layer | Path |
|---|---|
| Badges UI | `frontend/src/routes/Badges.tsx` |
| Locked assets | `frontend/src/components/dashboard/LockedAssetsGrid.tsx` |
| Backend | `backend/src/routes/badges.ts`, `profit-distributions.ts`, `event-bookings.ts` |

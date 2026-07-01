# Dashboard Structure — Feature / Module Analysis

**Last updated:** 2026-06-30  
**Notion:** [Architecture cheat sheet](https://app.notion.com/p/38fb4ab87a2f80efa000fe7a9da29837)  
**Depends on:** [FEATURE_FLAGS.md](./FEATURE_FLAGS.md), [PAYMENT_FLOW.md](./PAYMENT_FLOW.md)

---

## Status

Planning phase. Current app has **3 bottom tabs** (Home, Badges, Profile). Target: **4 tabs** + global upgrade CTA. Implementation phased after payment flow foundation.

---

## Purpose

Organize the member portal into clear zones so users always know **where they are** and **what to do next**. Mobile-first: bottom nav + in-page tabs on complex screens.

Branding: display name from `settings.site_name` (configurable; not hardcoded).

---

## Locked-In Decisions (from Notion)

| Decision | Detail |
|----------|--------|
| Bottom tabs | Home · Badges · History · Profile/More |
| Notifications | Bell in header (all screens) + full list inside Profile/More |
| Badges | Tier badges + achievement badges (achievements flag-gated) |
| Upgrade | Global/floating CTA — not owned by one tab |
| Rewards/community | Placeholders on Home; not built yet |
| Layout | Mobile-first, bottom nav + in-page tabs where needed |

---

## Tab Map

```
┌─────────────────────────────────────┐
│  🔔(n)        [site_name]      👤  │  ← Header (existing)
├─────────────────────────────────────┤
│         [ACTIVE TAB CONTENT]        │
│         ⬆ UPGRADE (floating)*       │  ← *flag: floating_upgrade_cta
├─────────────────────────────────────┤
│  🏠 Home  🎖️ Badges  📜 History  👤 More │
└─────────────────────────────────────┘
```

### Current vs target

| Tab | Route today | Route target | Status |
|-----|-------------|--------------|--------|
| Home | `/dashboard` | `/dashboard` | Exists — needs status cards |
| Badges | `/badges` | `/badges` | Exists — add achievements sub-tab |
| History | `/history` (via Profile link) | `/history` | Exists — add to bottom nav + filters |
| More | `/profile` | `/profile` or `/more` | Exists — rename + embed notifications |

---

## TAB 1 — Home (`/dashboard`)

**Job:** Status + next action + future teasers in one glance.

| Section | Content | Data source |
|---------|---------|-------------|
| A. Status card | Current tier; `$paid / $total` if mid-upgrade | `useMember`, active `upgrade_requests` |
| B. Next action card | One CTA from [PAYMENT_FLOW.md](./PAYMENT_FLOW.md) status copy | Active request status |
| C. Network teaser* | "Coming soon" community card | Static / flag `network_teaser` |
| D. Rewards teaser* | "X badges from next tier" → link Badges | `useBadges`, `useMember` |

\* Placeholder until flags enabled.

**Remove/replace:** Generic "Restricted Ecosystem Assets" grid can stay or shrink — not in Notion skeleton but not conflicting.

---

## TAB 2 — Badges (`/badges`)

**In-page tabs:** `[Tier Badges]` `[Achievements]` (achievements behind `achievements_tab` flag)

### Tier Badges (existing)

- List from `GET /badges`; locked/unlocked by member tier
- Tap locked tier → upgrade flow

### Achievements (planned)

- Static seed list OK for v1: "First Upgrade", "Receipt Uploaded", "3-Month Member"
- Future: computed from events

---

## TAB 3 — History (`/history`)

**In-page tabs:** `[All]` `[Pending]` `[Approved]` `[Rejected]`

| Row | Fields |
|-----|--------|
| Tier + date | `to_tier`, `created_at` |
| Status chip | 7-state colors |
| Progress | `$amount_paid / $total_amount` when split |
| Tap | Detail drawer |

### Detail drawer (extend existing `PaymentPreview`)

- Visual status stepper (Rule 3)
- Receipts list + statuses
- Upload another receipt (if `PARTIALLY_PAID` / `REJECTED`)
- Cancel (only `REQUESTED` / `AWAITING_PAYMENT`)
- Admin notes on reject

---

## TAB 4 — Profile / More (`/profile`)

| Section | Content |
|---------|---------|
| A. Profile info | Avatar, name, email, tier |
| B. Notifications | Full list (move from standalone route or duplicate) |
| C. Settings | Theme toggle, account |
| D. Support | mailto `support_email` ("Contact our team") |
| Logout | Existing |

**Notifications:** Keep `/notifications` route for bell deep-link; also show list section here per Notion.

---

## Upgrade Entry Points

All paths → `[Upgrade]` → `[Payment Instructions]` → `[Receipt Upload]` → `[History]`

| Source | Trigger |
|--------|---------|
| Home | Next action card |
| Badges | Locked tier tap |
| History | "Request new upgrade" (if no in-flight request) |
| Floating button | Optional persistent CTA (`floating_upgrade_cta`) |
| Dashboard (legacy) | "Upgrade Clearance" button — consolidate into above |

---

## Notification Placement

| Location | Behavior |
|----------|----------|
| Header bell | Unread count; tap → `/notifications` |
| Profile/More | Full chronological list |
| Push/email | Via existing `notifications` table |

---

## Feature Flag Gates

| Flag | UI element |
|------|------------|
| `floating_upgrade_cta` | Floating upgrade button |
| `network_teaser` | Home section C |
| `rewards_teaser` | Home section D |
| `achievements_tab` | Badges second tab |
| `payment_instructions` | New payment page vs legacy |
| `receipt_upload` | Upload button on payment + drawer |
| `settings.upgrade_enabled` | Hide all upgrade entry points |
| `settings.maintenance_mode` | Full-page block |

---

## Location (files)

### Existing

- `frontend/src/components/shared/BottomTabs.tsx` — add History, rename Profile
- `frontend/src/components/shared/PageLayout.tsx` — `TAB_ROUTES` update
- `frontend/src/components/shared/Header.tsx` — bell ✅
- `frontend/src/routes/Dashboard.tsx`, `Badges.tsx`, `History.tsx`, `Profile.tsx`

### Planned

- `frontend/src/components/dashboard/StatusCard.tsx`
- `frontend/src/components/dashboard/NextActionCard.tsx`
- `frontend/src/components/shared/FloatingUpgradeButton.tsx`
- `frontend/src/components/history/StatusStepper.tsx`
- `frontend/src/lib/upgradeStatus.ts` — copy + colors

---

## User Flow (navigation)

1. Land on Home after login.
2. Bottom nav switches tabs; History always one tap away.
3. Bell for alerts; Profile/More for full notification archive + support.
4. Upgrade never more than one tap (floating or next action).

---

## Business Rules

- Bottom tabs visible on: `/dashboard`, `/badges`, `/history`, `/profile` only.
- Sub-routes (`/upgrade`, `/payment`, `/notifications`) use back header, no bottom tabs.
- `site_name` from `GET /settings/public` in header when wired.

---

## Implementation Order

1. **Bottom nav** — 4 tabs (quick win, no payment dependency)
2. **Home cards** — needs `amount_paid` / status from API
3. **History filters + stepper** — needs new statuses
4. **Badges achievements tab** — static + flag
5. **Floating CTA** — flag-gated
6. **Teasers** — placeholders + flags

---

## Known Issues

- History buried under Profile — users miss payment status.
- No "next action" on Home — users feel lost (Notion Rule 2).
- Product name in header is hardcoded SpaceX logo — should respect `logo_url` / `site_name` from settings.

---

## Related Features

- [PAYMENT_FLOW.md](./PAYMENT_FLOW.md)
- [FEATURE_FLAGS.md](./FEATURE_FLAGS.md)
- [UPGRADE_REQUESTS.md](./UPGRADE_REQUESTS.md) — legacy routes

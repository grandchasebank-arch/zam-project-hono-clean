-- ============================================================
-- Seed Data — Development / Staging Only
-- Generated: 2026-06-23
-- ============================================================

-- ── Badges ───────────────────────────────────────────────────
INSERT INTO badges (id, name, tier_required, description, icon_url, allows_event_booking, allows_guest_pass)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Explorer Badge',  'Explorer',  'Entry-level digital credentials for mission observers.',     'https://cdn.example.com/badges/explorer.svg',  false, false),
  ('00000000-0000-0000-0000-000000000002', 'Pioneer Badge',   'Pioneer',   'Advanced operational badge with VIP event access.',          'https://cdn.example.com/badges/pioneer.svg',   true,  false),
  ('00000000-0000-0000-0000-000000000003', 'Vanguard Badge',  'Vanguard',  'Inner-circle credential with full Starbase access.',         'https://cdn.example.com/badges/vanguard.svg',  true,  true)
ON CONFLICT (id) DO NOTHING;

-- ── Demo Member ───────────────────────────────────────────────
-- NOTE: auth_user_id is NULL here — link it after creating the auth user.
INSERT INTO members (id, email, name, tier, status, role, clearance, title, location, member_since, avatar_url, display_level, badge_id)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'operator@spacex.hq',
  'Commander A. Reyes',
  'Explorer',
  'ACTIVE',
  'member',
  'INTERNAL',
  'Mission Specialist',
  'Hawthorne, CA',
  '2024-03-01',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'Level 1 Explorer',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- ── Demo Admin Member ─────────────────────────────────────────
INSERT INTO members (id, email, name, tier, status, role, clearance, title, location, member_since, display_level, badge_id)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'admin@spacex.hq',
  'Mission Control Admin',
  'Vanguard',
  'ACTIVE',
  'admin',
  'FULL',
  'Operations Director',
  'Hawthorne, CA',
  '2023-01-01',
  'Full Operational Clearance',
  '00000000-0000-0000-0000-000000000003'
) ON CONFLICT (id) DO NOTHING;

-- ── Demo Notifications ────────────────────────────────────────
INSERT INTO notifications (id, member_id, type, title, message, read, created_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'upgrade', 'Upgrade Request Approved',
   'Your Pioneer tier upgrade has been reviewed and approved. Welcome aboard.',
   false, now() - interval '2 hours'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'profit', 'Monthly Dividend Posted',
   'Your March yield distribution has been credited to your wallet.',
   false, now() - interval '1 day'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'event', 'Starbase Launch Window',
   'Next Starship orbital test scheduled — confirm your VIP attendance.',
   true, now() - interval '3 days'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'badge', 'Member Badge Issued',
   'Your digital VIP credentials are now active in your wallet.',
   true, now() - interval '7 days'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'system', 'Security Notice',
   'New sign-in detected from a recognized device.',
   true, now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Upgrade Request ──────────────────────────────────────
INSERT INTO upgrade_requests (id, member_id, reviewed_by, from_tier, to_tier, status, payment_reference, payment_verified, reviewed_at)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   'Explorer', 'Pioneer', 'APPROVED', 'PMT-9X2K1A', true, now() - interval '5 days'),
  ('30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   NULL,
   'Explorer', 'Explorer', 'PENDING', 'PMT-44H8MQ', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Demo Profit Distributions ─────────────────────────────────
INSERT INTO profit_distributions (id, member_id, amount, period_month, tier_at_time, status, paid_at)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 750.00, '2025-03-01', 'Pioneer', 'PAID', now() - interval '30 days'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 750.00, '2025-04-01', 'Pioneer', 'PAID', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Event Booking ────────────────────────────────────────
INSERT INTO event_bookings (id, member_id, event_name, event_date, includes_guest_pass, booking_status)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Starship IFT-7 Launch', '2025-07-15', false, 'CONFIRMED')
ON CONFLICT (id) DO NOTHING;

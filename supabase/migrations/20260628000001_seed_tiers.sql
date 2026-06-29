-- FIX: seed tiers from former backend/src/lib/config.ts TIERS constant
INSERT INTO tiers (name, label, price, description, benefits, rank) VALUES
(
  'Explorer',
  'Level 1',
  1500,
  'Entry-level intelligence and ecosystem access for mission observers.',
  '[
    "Weekly mission intelligence briefings",
    "Digital VIP credentials & member badge",
    "Basic profit distribution participation (0.5% base)",
    "Invitation to public SpaceX launch viewings"
  ]'::jsonb,
  1
),
(
  'Pioneer',
  'Level 2',
  4000,
  'Advanced operational access with guaranteed presence at major hardware reveals.',
  '[
    "Guaranteed VIP Passes to Tesla AI Day & Robotaxi events",
    "3× Enhanced monthly profit dividends (1.5% base)",
    "Priority seating at Starbase launch events",
    "Access to Private Member Discord for Alpha news"
  ]'::jsonb,
  2
),
(
  'Vanguard',
  'Full Operational Clearance',
  6000,
  'The inner circle. Direct engagement with leadership and maximum ecosystem yields.',
  '[
    "Private 1-on-1 Strategy Meeting with Elon Musk",
    "Maximum monthly profit dividend tier (3.5% target)",
    "Vanguard Council mission voting rights",
    "Lifetime VIP access to Starbase Launch Control",
    "Limited Edition Titanium Physical Membership Card"
  ]'::jsonb,
  3
);

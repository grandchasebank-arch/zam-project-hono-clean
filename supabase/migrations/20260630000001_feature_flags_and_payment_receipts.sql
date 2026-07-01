-- Payment flow Phase 1: feature flags, payment receipts, upgrade request amounts
-- See FEATURE_FLAGS.md and PAYMENT_FLOW.md

-- ── upgrade_requests: amounts + legacy status migration ─────
ALTER TABLE upgrade_requests
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) NOT NULL DEFAULT 0;

-- Backfill total_amount from target tier price where missing
UPDATE upgrade_requests ur
SET total_amount = t.price
FROM tiers t
WHERE ur.to_tier = t.name
  AND (ur.total_amount IS NULL OR ur.total_amount = 0);

-- Map legacy PENDING → AWAITING_PAYMENT
UPDATE upgrade_requests
SET status = 'AWAITING_PAYMENT'
WHERE status = 'PENDING';

-- ── feature_flags ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  description text,
  category    text NOT NULL CHECK (category IN ('PAYMENT', 'DASHBOARD', 'ADMIN')),
  enabled     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO feature_flags (key, label, description, category, enabled) VALUES
  ('receipt_upload', 'Receipt upload', 'Member can upload payment receipts', 'PAYMENT', false),
  ('split_payment', 'Split payment', 'Allow partial payments across multiple receipts', 'PAYMENT', false),
  ('payment_instructions', 'Payment instructions', 'Show payment instructions page instead of legacy submit', 'PAYMENT', false),
  ('achievements_tab', 'Achievements tab', 'Show achievements sub-tab on Badges', 'DASHBOARD', false),
  ('network_teaser', 'Network teaser', 'Home community teaser card', 'DASHBOARD', false),
  ('rewards_teaser', 'Rewards teaser', 'Home rewards progress teaser', 'DASHBOARD', false),
  ('floating_upgrade_cta', 'Floating upgrade CTA', 'Persistent floating upgrade button', 'DASHBOARD', false),
  ('receipt_review_inbox', 'Receipt review inbox', 'Admin flat receipt review queue', 'ADMIN', false)
ON CONFLICT (key) DO NOTHING;

-- ── member_feature_overrides ─────────────────────────────────
CREATE TABLE IF NOT EXISTS member_feature_overrides (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  flag_key   text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  enabled    boolean NOT NULL,
  set_by     uuid REFERENCES members(id),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, flag_key)
);

CREATE INDEX IF NOT EXISTS member_feature_overrides_member_id_idx
  ON member_feature_overrides (member_id);

-- ── payment_receipts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_receipts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upgrade_request_id  uuid NOT NULL REFERENCES upgrade_requests(id) ON DELETE CASCADE,
  member_id           uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  file_url            text NOT NULL,
  file_type           text NOT NULL CHECK (file_type IN ('pdf', 'image')),
  amount_claimed      numeric(12,2) NOT NULL CHECK (amount_claimed > 0),
  member_note         text,
  status              text NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED')),
  admin_note          text,
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS payment_receipts_request_id_idx
  ON payment_receipts (upgrade_request_id);

CREATE INDEX IF NOT EXISTS payment_receipts_status_idx
  ON payment_receipts (status);

-- ── RLS: payment_receipts (member read own; writes via service role) ──
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_receipts_select_own"
  ON payment_receipts FOR SELECT
  USING (member_id = get_my_member_id());

-- feature_flags: public read for enabled flags (member portal gates)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_all"
  ON feature_flags FOR SELECT
  USING (true);

ALTER TABLE member_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_feature_overrides_select_own"
  ON member_feature_overrides FOR SELECT
  USING (member_id = get_my_member_id());

-- ── Storage bucket for receipts (private) ────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

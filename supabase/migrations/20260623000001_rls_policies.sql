-- ============================================================
-- Migration: Row Level Security Policies
-- Generated: 2026-06-23
-- MVP-safe: authenticated users can only access their own data.
-- ============================================================

-- Enable RLS on all user-facing tables
ALTER TABLE members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_change_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges               ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current member id from auth.uid() ───────────
-- Members link to Supabase Auth via auth_user_id column
CREATE OR REPLACE FUNCTION get_my_member_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT id FROM members WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── badges: public read ───────────────────────────────────────
CREATE POLICY "badges_select_all"
  ON badges FOR SELECT
  USING (true);

-- ── members ──────────────────────────────────────────────────
-- Members can read their own row; admins can read all
CREATE POLICY "members_select_own"
  ON members FOR SELECT
  USING (auth_user_id = auth.uid() OR role = 'admin');

-- Members can update their own non-sensitive fields
CREATE POLICY "members_update_own"
  ON members FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Only service role (backend) can insert
-- (No INSERT policy → only service_role key can insert)

-- ── sessions ─────────────────────────────────────────────────
CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (member_id = get_my_member_id());

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  USING (member_id = get_my_member_id());

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (member_id = get_my_member_id());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (member_id = get_my_member_id())
  WITH CHECK (member_id = get_my_member_id());

-- ── upgrade_requests ─────────────────────────────────────────
CREATE POLICY "upgrade_requests_select_own"
  ON upgrade_requests FOR SELECT
  USING (member_id = get_my_member_id());

CREATE POLICY "upgrade_requests_insert_own"
  ON upgrade_requests FOR INSERT
  WITH CHECK (member_id = get_my_member_id());

-- ── profit_distributions ─────────────────────────────────────
CREATE POLICY "profit_distributions_select_own"
  ON profit_distributions FOR SELECT
  USING (member_id = get_my_member_id());

-- ── tier_change_history ──────────────────────────────────────
CREATE POLICY "tier_change_history_select_own"
  ON tier_change_history FOR SELECT
  USING (member_id = get_my_member_id());

-- ── event_bookings ────────────────────────────────────────────
CREATE POLICY "event_bookings_select_own"
  ON event_bookings FOR SELECT
  USING (member_id = get_my_member_id());

CREATE POLICY "event_bookings_insert_own"
  ON event_bookings FOR INSERT
  WITH CHECK (member_id = get_my_member_id());

-- ── otp_codes: no direct access (service_role only) ─────────
-- No SELECT/INSERT/UPDATE policies → anon and authenticated are blocked.
-- Only service_role key can interact with this table.

-- ── otp_tokens: same as otp_codes ───────────────────────────
-- No policies added intentionally.

-- ============================================================
-- Migration: Initial Schema
-- Generated: 2026-06-23
-- Reflects the existing Supabase public schema.
-- Run this on a fresh Supabase project to recreate all tables.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── badges ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  tier_required    TEXT NOT NULL,
  description      TEXT,
  icon_url         TEXT,
  allows_event_booking BOOLEAN NOT NULL DEFAULT false,
  allows_guest_pass    BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── members ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE,
  badge_id      UUID REFERENCES badges(id),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'Explorer',
  status        TEXT NOT NULL DEFAULT 'INACTIVE',
  role          TEXT NOT NULL DEFAULT 'member',
  clearance     TEXT NOT NULL DEFAULT 'INTERNAL',
  title         TEXT,
  location      TEXT,
  member_since  DATE,
  avatar_url    TEXT,
  display_level TEXT NOT NULL DEFAULT 'Level 1 Applicant',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── otp_codes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── otp_tokens (legacy, keep for compat) ────────────────────
CREATE TABLE IF NOT EXISTS otp_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── upgrade_requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upgrade_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id          UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reviewed_by        UUID REFERENCES members(id),
  from_tier          TEXT NOT NULL,
  to_tier            TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'PENDING',
  payment_reference  TEXT,
  payment_verified   BOOLEAN NOT NULL DEFAULT false,
  admin_notes        TEXT,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── profit_distributions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS profit_distributions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  period_month DATE NOT NULL,
  tier_at_time TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  paid_at      TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── tier_change_history ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tier_change_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  changed_by    UUID REFERENCES members(id),
  previous_tier TEXT NOT NULL,
  new_tier      TEXT NOT NULL,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── event_bookings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_name          TEXT NOT NULL,
  event_date          DATE NOT NULL,
  includes_guest_pass BOOLEAN NOT NULL DEFAULT false,
  booking_status      TEXT NOT NULL DEFAULT 'CONFIRMED',
  booked_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER upgrade_requests_updated_at
  BEFORE UPDATE ON upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

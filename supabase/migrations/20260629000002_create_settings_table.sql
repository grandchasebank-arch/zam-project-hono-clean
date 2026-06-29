-- Platform domain: singleton app settings (Laravel settings id=1 pattern)
CREATE TABLE settings (
  id              int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name       text NOT NULL DEFAULT 'SpaceX Member Portal',
  support_email   text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  upgrade_enabled  boolean NOT NULL DEFAULT true,
  feature_flags   jsonb NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (id, site_name, support_email)
VALUES (1, 'SpaceX Member Portal', 'admin@spacex.hq')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read of non-sensitive flags only (via backend service role for admin write)
CREATE POLICY settings_select_public ON settings
  FOR SELECT USING (true);

CREATE POLICY settings_admin_update ON settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
      AND members.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION set_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_settings_updated_at();

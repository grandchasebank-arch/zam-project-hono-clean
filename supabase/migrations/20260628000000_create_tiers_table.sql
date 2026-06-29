-- FIX: tiers table replaces hardcoded backend/src/lib/config.ts TIERS
CREATE TABLE tiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  label       text NOT NULL,
  price       numeric NOT NULL,
  description text,
  benefits    jsonb NOT NULL DEFAULT '[]',
  rank        int UNIQUE NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- FIX: RLS for public read, admin write
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiers_select_public ON tiers
  FOR SELECT USING (true);

CREATE POLICY tiers_admin_all ON tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_user_id = auth.uid()
      AND members.role = 'admin'
    )
  );

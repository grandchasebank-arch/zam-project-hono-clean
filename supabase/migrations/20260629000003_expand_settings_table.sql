-- Expand singleton settings row for full HQ app configuration
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS site_tagline text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS mail_from_email text,
  ADD COLUMN IF NOT EXISTS mail_from_name text,
  ADD COLUMN IF NOT EXISTS mail_reply_to text;

UPDATE settings
SET
  logo_url = COALESCE(logo_url, '/logo.png'),
  site_tagline = COALESCE(site_tagline, 'Member Portal'),
  company_name = COALESCE(company_name, 'SpaceX HQ'),
  company_address = COALESCE(company_address, '1 Rocket Road, Hawthorne, CA 90250'),
  company_phone = COALESCE(company_phone, '+1 (310) 363-6000'),
  company_website = COALESCE(company_website, 'https://www.spacex.com'),
  mail_from_email = COALESCE(mail_from_email, support_email, 'admin@spacex.hq'),
  mail_from_name = COALESCE(mail_from_name, site_name, 'SpaceX Member Portal'),
  mail_reply_to = COALESCE(mail_reply_to, support_email, 'admin@spacex.hq')
WHERE id = 1;

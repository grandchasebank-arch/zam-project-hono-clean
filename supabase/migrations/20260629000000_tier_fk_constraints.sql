-- FIX: link tier text columns to tiers.name with ON UPDATE CASCADE
ALTER TABLE upgrade_requests
  ADD CONSTRAINT fk_upgrade_from_tier
    FOREIGN KEY (from_tier) REFERENCES tiers(name) ON UPDATE CASCADE,
  ADD CONSTRAINT fk_upgrade_to_tier
    FOREIGN KEY (to_tier) REFERENCES tiers(name) ON UPDATE CASCADE;

ALTER TABLE members
  ADD CONSTRAINT fk_member_tier
    FOREIGN KEY (tier) REFERENCES tiers(name) ON UPDATE CASCADE;

ALTER TABLE badges
  ADD CONSTRAINT fk_badge_tier_required
    FOREIGN KEY (tier_required) REFERENCES tiers(name) ON UPDATE CASCADE;

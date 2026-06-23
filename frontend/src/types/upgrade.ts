import type { Tier } from "./user";

export interface TierOption {
  id: "tier-ex" | "tier-pi" | "tier-va";
  name: Tier;
  price: string;
  priceValue: number;
  clearance: string;
  description: string;
  features: string[];
  benefits: string[];
  variant: "explorer" | "pioneer" | "vanguard";
}

export interface UpgradeRequest {
  member_id: string;
  member_email: string;
  member_name: string;
  current_tier: string;
  requested_tier: Tier;
}

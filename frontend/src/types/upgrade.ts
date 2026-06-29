import type { Tier } from "./user";

export interface TierOption {
  id: string;
  name: Tier;
  label: string;
  price: string;
  description: string;
  benefits: string[];
  rank: number;
  // FIX: legacy fields populated by api mapTier for existing UI components
  clearance?: string;
  features?: string[];
  variant?: "explorer" | "pioneer" | "vanguard";
  priceValue?: number;
}

export interface UpgradeRequest {
  current_tier: string;
  requested_tier: Tier;
}

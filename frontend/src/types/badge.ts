import type { Tier } from "./user";

export interface Badge {
  id: string;
  name: string;
  tierRequired: Tier;
  description: string;
  iconUrl: string | null;
}

const TIER_RANK: Record<Tier, number> = {
  Explorer: 1,
  Pioneer: 2,
  Vanguard: 3,
};

export function isBadgeUnlocked(memberTier: Tier, tierRequired: Tier): boolean {
  return TIER_RANK[memberTier] >= TIER_RANK[tierRequired];
}

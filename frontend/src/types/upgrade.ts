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

export type UpgradeRequestStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface AdminUpgradeRequest {
  id: string;
  member_id: string;
  from_tier: string;
  to_tier: string;
  status: UpgradeRequestStatus;
  payment_reference?: string | null;
  payment_verified?: boolean;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  member_name?: string;
  member_email?: string;
}

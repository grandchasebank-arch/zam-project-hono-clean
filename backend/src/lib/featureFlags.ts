import type { SupabaseClient } from "./supabase";

const MEMBER_PUBLIC_FLAGS = new Set([
  "receipt_upload",
  "split_payment",
  "payment_instructions",
  "achievements_tab",
  "network_teaser",
  "rewards_teaser",
  "floating_upgrade_cta",
]);

export interface FeatureFlagRow {
  key: string;
  label: string;
  description: string | null;
  category: string;
  enabled: boolean;
}

export interface MemberOverrideRow {
  member_id: string;
  flag_key: string;
  enabled: boolean;
}

export async function isFeatureEnabled(
  sb: SupabaseClient,
  key: string,
  memberId?: string | null
): Promise<boolean> {
  if (memberId) {
    const override = await sb.selectOne<MemberOverrideRow>(
      "member_feature_overrides",
      `member_id=eq.${memberId}&flag_key=eq.${key}`
    );
    if (override) return override.enabled;
  }

  const flag = await sb.selectOne<FeatureFlagRow>("feature_flags", `key=eq.${key}`);
  return flag?.enabled ?? false;
}

export async function getPublicFeatureFlags(
  sb: SupabaseClient,
  memberId?: string | null
): Promise<Record<string, boolean>> {
  const flags = await sb.select<FeatureFlagRow>("feature_flags");
  const result: Record<string, boolean> = {};

  for (const flag of flags) {
    if (!MEMBER_PUBLIC_FLAGS.has(flag.key)) continue;
    result[flag.key] = await isFeatureEnabled(sb, flag.key, memberId);
  }

  return result;
}

export async function getAllFeatureFlags(sb: SupabaseClient): Promise<FeatureFlagRow[]> {
  return sb.select<FeatureFlagRow>("feature_flags", "order=category.asc,key.asc");
}

import { useQuery } from "@tanstack/react-query";
import { getFeatureFlags } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags(),
    queryFn: getFeatureFlags,
    staleTime: 60_000,
  });
}

export function useFeatureFlag(key: string): boolean {
  const { data } = useFeatureFlags();
  return data?.[key] ?? false;
}

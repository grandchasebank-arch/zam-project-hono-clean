import { useMutation, useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { UpgradeRequest } from "@/types/upgrade";

export function useUpgradeTiers() {
  return useQuery({
    queryKey: queryKeys.upgradeTiers(),
    queryFn: api.getUpgradeTiers,
  });
}

export function useSubmitUpgrade() {
  return useMutation({
    mutationFn: (req: UpgradeRequest) => api.submitUpgradeRequest(req),
  });
}

import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useBadges() {
  return useQuery({ queryKey: queryKeys.badges(), queryFn: api.getBadges });
}

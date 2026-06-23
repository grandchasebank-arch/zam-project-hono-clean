import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useMember() {
  return useQuery({ queryKey: queryKeys.member(), queryFn: api.getMember });
}

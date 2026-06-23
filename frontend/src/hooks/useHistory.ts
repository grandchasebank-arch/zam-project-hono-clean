import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useHistory() {
  return useQuery({ queryKey: queryKeys.history(), queryFn: api.getHistory });
}

export function usePaymentById(id: string) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: () => api.getPaymentById(id),
  });
}

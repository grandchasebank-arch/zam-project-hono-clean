import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session(),
    queryFn: api.isLoggedIn,
    staleTime: 0,
  });
}

export function useSendOTP() {
  return useMutation({ mutationFn: (email: string) => api.sendOTP(email) });
}

export function useVerifyOTP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      api.verifyOTP(email, code),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.session() }),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.signOut,
    onSuccess: () => qc.clear(),
  });
}

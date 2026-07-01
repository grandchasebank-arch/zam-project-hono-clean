import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getReceipts, uploadReceipt } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useReceipts(requestId: string | null) {
  return useQuery({
    queryKey: queryKeys.receipts(requestId ?? ""),
    queryFn: () => getReceipts(requestId!),
    enabled: !!requestId,
  });
}

export function useUploadReceipt(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadReceipt(requestId, formData),
    onSuccess: () => {
      toast.success("Receipt submitted", {
        description: "Our team will review it within 24 hours.",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.receipts(requestId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingRequests() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.upgradeRequest(requestId),
      });
    },
    onError: (error: Error) => {
      toast.error("Upload failed", { description: error.message });
    },
  });
}

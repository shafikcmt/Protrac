import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type FinishingQCScanRequest = z.infer<typeof schemas.FinishingQCScanRequest>;
type FinishingQCScanResponse = z.infer<typeof schemas.FinishingQCScanResponse>;

export const useFinishingQCScanner = () => {
  const queryClient = useQueryClient();

  // Get finishing QC info/history
  const finishingQCInfoQuery = apiHooks.useGet(
    "/api/tracking/info/finishing-qc/",
    {
      queries: {
        limit: 100, // Get last 20 scans
      },
    },
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Get defects for defect selection
  const defectsQuery = apiHooks.useGet("/api/tracking/defects/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Finishing QC scan mutation
  const finishingQCMutation = useMutation({
    mutationFn: async (data: FinishingQCScanRequest) => {
      return api.tracking_scan_finishing_qc_create(data);
    },
    onSuccess: (response: FinishingQCScanResponse) => {
      toast.success(response.message || "QC check completed successfully");

      // Refresh the finishing QC info
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/info/finishing-qc/"
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const submitScan = (data: FinishingQCScanRequest) => {
    finishingQCMutation.mutate(data);
  };

  return {
    // Queries
    finishingQCInfo: finishingQCInfoQuery.data,
    defects: defectsQuery.data?.results || [],
    isLoadingInfo: finishingQCInfoQuery.isLoading,
    isLoadingDefects: defectsQuery.isLoading,

    // Mutation
    submitScan,
    isScanning: finishingQCMutation.isPending,
    lastScanResult: finishingQCMutation.data,
    scanError: finishingQCMutation.error,

    // Actions
    resetScanResult: finishingQCMutation.reset,
  };
};

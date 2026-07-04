import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type SewingQCScanResponse = z.infer<typeof schemas.SewingQCScanResponse>;

// The form no longer collects a re-evaluation flag — the backend detects
// re-evaluation automatically from the garment's QC history.
type SewingQCScanInput = {
  tracking_code: string;
  qc_status: "pass" | "fail" | "rework";
  defect_ids?: number[];
};

export const useSewingQCScanner = () => {
  const queryClient = useQueryClient();

  // Get sewing QC info/history
  const sewingQCInfoQuery = apiHooks.useGet(
    "/api/tracking/info/sewing-qc/",
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

  // Sewing QC scan mutation
  const sewingQCMutation = useMutation({
    mutationFn: async (data: SewingQCScanInput) => {
      return api.tracking_scan_sewing_qc_create({
        ...data,
        is_reevaluation: false,
      });
    },
    onSuccess: (response: SewingQCScanResponse) => {
      toast.success(response.message || "QC check completed successfully");

      // Refresh the sewing QC info
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/info/sewing-qc/"
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const submitScan = (data: SewingQCScanInput) => {
    sewingQCMutation.mutate(data);
  };

  return {
    // Queries
    sewingQCInfo: sewingQCInfoQuery.data,
    defects: defectsQuery.data?.results || [],
    isLoadingInfo: sewingQCInfoQuery.isLoading,
    isLoadingDefects: defectsQuery.isLoading,

    // Mutation
    submitScan,
    isScanning: sewingQCMutation.isPending,
    lastScanResult: sewingQCMutation.data,
    scanError: sewingQCMutation.error,

    // Actions
    resetScanResult: sewingQCMutation.reset,
  };
};

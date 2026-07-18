import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type FinishingQCScanResponse = z.infer<typeof schemas.FinishingQCScanResponse>;

// The form no longer collects a re-evaluation flag — the backend detects
// re-evaluation automatically from the garment's finishing-QC history (mirrors
// the sewing-QC scanner).
type FinishingQCScanInput = {
  tracking_code: string;
  qc_status: "pass" | "fail" | "rework";
  defect_ids?: number[];
};

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
    mutationFn: async (data: FinishingQCScanInput) => {
      return api.tracking_scan_finishing_qc_create({
        ...data,
        is_reevaluation: false,
      });
    },
    onSuccess: (response: FinishingQCScanResponse) => {
      toast.success(response.message || "QC check completed successfully");

      // Refresh the finishing QC info (recent QC checks list)
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/info/finishing-qc/"
      );
      queryClient.invalidateQueries({ queryKey });

      // Also refresh "Today's QC summary" — its output/rework/pass-rate/DHU
      // tiles and dual serial grid are a separate query the summary card owns,
      // so without this they only update on the card's own interval, leaving
      // stale numbers right after a scan. Predicate match is agnostic to its
      // { date } query param. Mirrors the sewing-QC scanner hook.
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes(
            "/api/tracking/finishing-qc/daily-summary/"
          ),
      });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const submitScan = (data: FinishingQCScanInput) => {
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

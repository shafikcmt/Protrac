import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type BundleIssueScanRequest = z.infer<typeof schemas.BundleIssueScanRequest>;
type BundleIssueScanResponse = z.infer<typeof schemas.BundleIssueScanResponse>;

export const useBundleIssueScanner = () => {
  const queryClient = useQueryClient();
  // Get bundle issue info/history
  const bundleIssueInfoQuery = apiHooks.useGet(
    "/api/tracking/info/bundle-issue/",
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
  // Get production lines for sewing line selection
  const productionLinesQuery = apiHooks.useGet(
    "/api/tracking/productionlines/",
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );
  // Bundle issue scan mutation
  const bundleIssueMutation = useMutation({
    mutationFn: async (data: BundleIssueScanRequest) => {
      return api.tracking_scan_bundle_issue_create(data);
    },
    onSuccess: (response: BundleIssueScanResponse) => {
      toast.success(response.message || "Bundle issued successfully");

      // Refresh the bundle issue info
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/info/bundle-issue/"
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
  // Filter sewing lines from production lines
  const sewingLines =
    productionLinesQuery.data?.results?.filter(
      (line: any) => line.line_type === "sewing"
    ) || [];

  const submitScan = (data: BundleIssueScanRequest) => {
    bundleIssueMutation.mutate(data);
  };

  return {
    // Queries
    bundleIssueInfo: bundleIssueInfoQuery.data,
    sewingLines,
    isLoadingInfo: bundleIssueInfoQuery.isLoading,
    isLoadingLines: productionLinesQuery.isLoading,

    // Mutation
    submitScan,
    isScanning: bundleIssueMutation.isPending,
    lastScanResult: bundleIssueMutation.data,
    scanError: bundleIssueMutation.error,

    // Actions
    resetScanResult: bundleIssueMutation.reset,
  };
};

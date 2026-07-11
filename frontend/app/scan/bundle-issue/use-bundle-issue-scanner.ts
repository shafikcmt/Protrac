import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type BundleIssueScanRequest = z.infer<typeof schemas.BundleIssueScanRequest>;
type BundleIssueScanResponse = z.infer<typeof schemas.BundleIssueScanResponse>;
type BundleTransferResponse = z.infer<typeof schemas.BundleTransferResponse>;

export type BundleTransferInput = {
  bundle_ids: number[];
  sewing_line: number;
  reason?: string;
};

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
  // Get bundles still in "created" status — the worklist of bundles available
  // to issue. Not scoped to a sewing line: a created bundle has no assigned line
  // yet (the line is chosen at issue time), so this is a global list.
  const createdBundlesQuery = apiHooks.useGet(
    "/api/tracking/bundles/",
    {
      queries: {
        status: "created",
      },
    },
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );
  // Bundle issue scan mutation
  const bundleIssueMutation = useMutation({
    mutationFn: async (data: BundleIssueScanRequest) => {
      return api.tracking_scan_bundle_issue_create(data);
    },
    onSuccess: (response: BundleIssueScanResponse) => {
      toast.success(response.message || "Bundle issued successfully");

      // Refresh the bundle issue info (recent issues list)
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/info/bundle-issue/"
      );
      queryClient.invalidateQueries({ queryKey });

      // Also refresh the "Bundles Ready to Issue" list so the just-issued bundle
      // drops off immediately. Predicate match is agnostic to the { status }
      // query param carried by that query's key.
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes("/api/tracking/bundles/"),
      });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
  // Transfer already-issued bundles to a different sewing line (fix a wrong-line
  // issue). Refreshes the recent-issues list so the corrected line shows at once.
  const bundleTransferMutation = useMutation({
    mutationFn: async (data: BundleTransferInput) => {
      return api.tracking_bundles_transfer_create(data);
    },
    onSuccess: (response: BundleTransferResponse) => {
      toast.success(response.message || "Bundles transferred");
      queryClient.invalidateQueries({
        queryKey: apiHooks.getKeyByPath("get", "/api/tracking/info/bundle-issue/"),
      });
      // The bundles list (any status filter) may also reflect the new line.
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes("/api/tracking/bundles/"),
      });
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

  // Async so the caller (confirm dialog) can await success before clearing
  // selection / closing.
  const transferBundles = (data: BundleTransferInput) =>
    bundleTransferMutation.mutateAsync(data);

  return {
    // Queries
    bundleIssueInfo: bundleIssueInfoQuery.data,
    sewingLines,
    isLoadingInfo: bundleIssueInfoQuery.isLoading,
    isLoadingLines: productionLinesQuery.isLoading,

    // Created bundles worklist (available to issue)
    createdBundles: createdBundlesQuery.data,
    isLoadingCreated: createdBundlesQuery.isLoading,
    isErrorCreated: createdBundlesQuery.isError,

    // Mutation
    submitScan,
    isScanning: bundleIssueMutation.isPending,
    lastScanResult: bundleIssueMutation.data,
    scanError: bundleIssueMutation.error,

    // Transfer (fix wrong-line issues)
    transferBundles,
    isTransferring: bundleTransferMutation.isPending,

    // Actions
    resetScanResult: bundleIssueMutation.reset,
  };
};

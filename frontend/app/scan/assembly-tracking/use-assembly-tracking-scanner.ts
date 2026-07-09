import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type AssemblyPartReceiveScanResponse = z.infer<
  typeof schemas.AssemblyPartReceiveScanResponse
>;
type AssemblyTrackingIssueScanResponse = z.infer<
  typeof schemas.AssemblyTrackingIssueScanResponse
>;

// Use a more flexible type that matches the API expectation
type ScanRequest = {
  tracking_code: string;
  [key: string]: unknown;
};

export const useAssemblyTrackingScanner = () => {
  const queryClient = useQueryClient();

  // Get assembly part receive info/history
  const assemblyPartReceiveInfoQuery = apiHooks.useGet(
    "/api/tracking/info/part-receive/",
    {
      queries: {
        limit: 100,
      },
    },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 30000,
    }
  );

  // Get garment issue for assembly info/history
  const garmentIssueInfoQuery = apiHooks.useGet(
    "/api/tracking/info/garment-issue-for-assembly/",
    {
      queries: {
        limit: 100,
      },
    },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 30000,
    }
  );

  // Assembly part receive scan mutation
  const assemblyPartReceiveMutation = useMutation({
    mutationFn: async (data: ScanRequest) => {
      return api.tracking_scan_part_receive_create(data);
    },
    onSuccess: (response: AssemblyPartReceiveScanResponse) => {
      toast.success(response.message || "Assembly part received successfully");

      // Refresh the assembly part receive info. Match on the endpoint path
      // regardless of the exact key shape — a params-less key from getKeyByPath
      // may not match the mounted query's key (which embeds { limit: 100 }), so
      // predicate-based invalidation is the reliable way to trigger a refetch.
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes(
            "/api/tracking/info/part-receive/"
          ),
      });

      // Also refresh "Today's summary" (totals, pending, serial grid, hourly
      // bundles-vs-assembly). It's a separate query the summary card owns, so
      // without this it only updates on its own interval — leaving stale counts
      // right after a scan. Predicate match is agnostic to its { date } param.
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes(
            "/api/tracking/assembly/daily-summary/"
          ),
      });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Garment issue for assembly scan mutation
  const garmentIssueMutation = useMutation({
    mutationFn: async (data: ScanRequest) => {
      return api.tracking_scan_garment_issue_for_assembly_create(data);
    },
    onSuccess: (response: AssemblyTrackingIssueScanResponse) => {
      toast.success(
        response.message || "Garment issued for assembly successfully"
      );

      // Refresh the garment issue info (predicate match — see the part-receive
      // mutation above for why key-shape-agnostic invalidation is used here).
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes(
            "/api/tracking/info/garment-issue-for-assembly/"
          ),
      });

      // Also refresh "Today's summary" so its totals, pending count and serial
      // grid reflect this issue immediately (see part-receive mutation above).
      queryClient.invalidateQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes(
            "/api/tracking/assembly/daily-summary/"
          ),
      });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Smart routing function based on tracking code prefix
  const submitScan = (data: ScanRequest) => {
    const trackingCode = data.tracking_code.trim();

    // Send the trimmed code — barcode scanners often append trailing
    // whitespace/newline, which would otherwise fail backend lookup (400).
    const payload = { ...data, tracking_code: trackingCode };

    // If tracking code starts with "3", route to garment-issue-for-assembly
    if (trackingCode.startsWith("3")) {
      garmentIssueMutation.mutate(payload);
    } else {
      // Otherwise, route to assembly-part-receive
      assemblyPartReceiveMutation.mutate(payload);
    }
  };

  // Determine which endpoint will be used based on tracking code
  const getEndpointInfo = (trackingCode: string) => {
    if (!trackingCode) return null;

    const trimmedCode = trackingCode.trim();
    if (trimmedCode.startsWith("3")) {
      return {
        type: "garment-issue",
        endpoint: "Garment Issue for Assembly",
        description: "Issue garment to assembly line",
      };
    } else {
      return {
        type: "assembly-part-receive",
        endpoint: "Assembly Part Receive",
        description: "Receive assembly parts from cutting",
      };
    }
  };

  // Get the active mutation based on the last scan
  const getActiveMutation = () => {
    if (
      garmentIssueMutation.isPending ||
      garmentIssueMutation.data ||
      garmentIssueMutation.error
    ) {
      return garmentIssueMutation;
    }
    if (
      assemblyPartReceiveMutation.isPending ||
      assemblyPartReceiveMutation.data ||
      assemblyPartReceiveMutation.error
    ) {
      return assemblyPartReceiveMutation;
    }
    return null;
  };

  const activeMutation = getActiveMutation();

  return {
    // Queries
    assemblyPartReceiveInfo: assemblyPartReceiveInfoQuery.data,
    garmentIssueInfo: garmentIssueInfoQuery.data,
    isLoadingAssemblyInfo: assemblyPartReceiveInfoQuery.isLoading,
    isLoadingGarmentInfo: garmentIssueInfoQuery.isLoading,

    // Manual refetch of both history queries (operator "Refresh" safety net).
    refetchHistory: () => {
      assemblyPartReceiveInfoQuery.refetch();
      garmentIssueInfoQuery.refetch();
    },
    isRefreshingHistory:
      assemblyPartReceiveInfoQuery.isFetching ||
      garmentIssueInfoQuery.isFetching,

    // Mutation
    submitScan,
    isScanning:
      assemblyPartReceiveMutation.isPending || garmentIssueMutation.isPending,
    lastScanResult: activeMutation?.data,
    scanError: activeMutation?.error,

    // Helper functions
    getEndpointInfo,

    // Actions
    resetScanResult: () => {
      assemblyPartReceiveMutation.reset();
      garmentIssueMutation.reset();
    },
  };
};

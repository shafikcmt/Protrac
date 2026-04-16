import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type BulkBundleCreateRequest = z.infer<typeof schemas.BulkBundleCreateRequest>;
type BulkBundlePreviewRequest = z.infer<
  typeof schemas.BundleCreationPreviewRequestRequest
>;

interface UseBundlesOptions {
  onSuccess?: () => void;
  orderId?: number | null;
  spreadId?: number | null;
}

export const useBundles = (options: UseBundlesOptions = {}) => {
  const { onSuccess, orderId, spreadId } = options;
  const queryClient = useQueryClient();

  // Build query parameters
  const queryParams: Record<string, number | boolean> = {};
  if (orderId) queryParams.order = orderId;
  if (spreadId) queryParams.spread = spreadId;

  // List bundles with pagination and search
  const bundlesQuery = apiHooks.useGet(
    "/api/tracking/bundles/",
    Object.keys(queryParams).length > 0 ? { queries: queryParams } : undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Bulk create bundles mutation
  const bulkCreateBundlesMutation = useMutation({
    mutationFn: async (data: BulkBundleCreateRequest) => {
      return api.tracking_bundles_bulk_create_create(data);
    },
    onSuccess: (response) => {
      toast.success(`${response.created_count} bundles created successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/bundles/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Bulk preview bundles mutation
  const bulkPreviewBundlesMutation = useMutation({
    mutationFn: async (data: BulkBundlePreviewRequest) => {
      return api.tracking_bundles_bulk_preview_create(data);
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/bundles/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Bundle deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/bundles/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const bulkCreateBundles = async (data: BulkBundleCreateRequest) => {
    return bulkCreateBundlesMutation.mutateAsync(data);
  };

  const bulkPreviewBundles = (data: BulkBundlePreviewRequest) => {
    return bulkPreviewBundlesMutation.mutateAsync(data);
  };

  const deleteBundle = (id: number) => {
    deleteBundleMutation.mutate({ id });
  };

  const deleteBundles = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteBundleMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} bundles deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/bundles/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    bundles: bundlesQuery.data?.results || [],
    pagination: {
      count: bundlesQuery.data?.count || 0,
      next: bundlesQuery.data?.next,
      previous: bundlesQuery.data?.previous,
    },

    // Loading states
    isLoading: bundlesQuery.isLoading,
    isBulkCreating: bulkCreateBundlesMutation.isPending,
    isBulkPreviewing: bulkPreviewBundlesMutation.isPending,
    isDeleting: deleteBundleMutation.isPending,

    // Actions
    bulkCreateBundles,
    bulkPreviewBundles,
    deleteBundle,
    deleteBundles,
    refetch: bundlesQuery.refetch,

    // Preview data
    previewData: bulkPreviewBundlesMutation.data,
    previewError: bulkPreviewBundlesMutation.error,
  };
};

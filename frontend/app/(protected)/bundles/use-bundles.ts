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

  const queryParams: Record<string, number | boolean> = {};
  if (orderId) queryParams.order = orderId;
  if (spreadId) queryParams.spread = spreadId;

  const bundlesQuery = apiHooks.useGet(
    "/api/tracking/bundles/",
    Object.keys(queryParams).length > 0 ? { queries: queryParams } : undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  const bundlesQueryKey = apiHooks.getKeyByPath("get", "/api/tracking/bundles/");

  const bulkCreateBundlesMutation = useMutation({
    mutationFn: async (data: BulkBundleCreateRequest) => {
      return api.tracking_bundles_bulk_create_create(data);
    },
    onSuccess: async () => {
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const bulkPreviewBundlesMutation = useMutation({
    mutationFn: async (data: BulkBundlePreviewRequest) => {
      return api.tracking_bundles_bulk_preview_create(data);
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/bundles/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: async () => {
      toast.success("Bundle deleted successfully");
      await queryClient.invalidateQueries({ queryKey: bundlesQueryKey });
      await bundlesQuery.refetch();
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

  const refreshBundles = async () => {
    await queryClient.invalidateQueries({ queryKey: bundlesQueryKey });
    await bundlesQuery.refetch();
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
      await queryClient.invalidateQueries({ queryKey: bundlesQueryKey });
      await bundlesQuery.refetch();
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    bundles: bundlesQuery.data?.results || [],
    pagination: {
      count: bundlesQuery.data?.count || 0,
      next: bundlesQuery.data?.next,
      previous: bundlesQuery.data?.previous,
    },

    isLoading: bundlesQuery.isLoading,
    isBulkCreating: bulkCreateBundlesMutation.isPending,
    isBulkPreviewing: bulkPreviewBundlesMutation.isPending,
    isDeleting: deleteBundleMutation.isPending,

    bulkCreateBundles,
    bulkPreviewBundles,
    deleteBundle,
    deleteBundles,
    refetch: bundlesQuery.refetch,
    refreshBundles,

    previewData: bulkPreviewBundlesMutation.data,
    previewError: bulkPreviewBundlesMutation.error,
  };
};
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Size = z.infer<typeof schemas.Size>;
type SizeRequest = z.infer<typeof schemas.SizeRequest>;

export const useSizes = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List sizes with pagination and search
  const sizesQuery = apiHooks.useGet("/api/tracking/sizes/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create size mutation
  const createSizeMutation = apiHooks.usePost(
    "/api/tracking/sizes/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Size created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/sizes/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update size mutation
  const updateSizeMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & SizeRequest) => {
      return api.patch("/api/tracking/sizes/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Size updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/sizes/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete size mutation
  const deleteSizeMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/sizes/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Size deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/sizes/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createSize = (data: SizeRequest) => {
    createSizeMutation.mutate(data);
  };

  const updateSize = (id: number, data: SizeRequest) => {
    updateSizeMutation.mutate({ id, ...data });
  };

  const deleteSize = (id: number) => {
    deleteSizeMutation.mutate({ id });
  };

  const deleteSizes = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteSizeMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} sizes deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/sizes/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    sizes: sizesQuery.data?.results || [],
    pagination: {
      count: sizesQuery.data?.count || 0,
      next: sizesQuery.data?.next,
      previous: sizesQuery.data?.previous,
    },

    // Loading states
    isLoading: sizesQuery.isLoading,
    isCreating: createSizeMutation.isPending,
    isUpdating: updateSizeMutation.isPending,
    isDeleting: deleteSizeMutation.isPending,

    // Actions
    createSize,
    updateSize,
    deleteSize,
    deleteSizes,
    refetch: sizesQuery.refetch,
  };
};

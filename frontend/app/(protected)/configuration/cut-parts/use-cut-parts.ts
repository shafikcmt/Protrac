import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type CutPartRequest = z.infer<typeof schemas.PartRequest>;

export const useCutParts = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List cut parts with pagination and search
  const cutPartsQuery = apiHooks.useGet("/api/tracking/parts/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create cut part mutation
  const createCutPartMutation = apiHooks.usePost(
    "/api/tracking/parts/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Cut part created successfully");
        const queryKey = apiHooks.getKeyByPath(
          "get",
          "/api/tracking/parts/"
        );
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: unknown) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update cut part mutation
  const updateCutPartMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & CutPartRequest) => {
      return api.patch("/api/tracking/parts/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Cut part updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/parts/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete cut part mutation
  const deleteCutPartMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/parts/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Cut part deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/parts/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createCutPart = (data: CutPartRequest) => {
    createCutPartMutation.mutate(data);
  };

  const updateCutPart = (id: number, data: CutPartRequest) => {
    updateCutPartMutation.mutate({ id, ...data });
  };

  const deleteCutPart = (id: number) => {
    deleteCutPartMutation.mutate({ id });
  };

  const deleteCutParts = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteCutPartMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} cut parts deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/parts/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    cutParts: cutPartsQuery.data?.results || [],
    pagination: {
      count: cutPartsQuery.data?.count || 0,
      next: cutPartsQuery.data?.next,
      previous: cutPartsQuery.data?.previous,
    },

    // Loading states
    isLoading: cutPartsQuery.isLoading,
    isCreating: createCutPartMutation.isPending,
    isUpdating: updateCutPartMutation.isPending,
    isDeleting: deleteCutPartMutation.isPending,

    // Actions
    createCutPart,
    updateCutPart,
    deleteCutPart,
    deleteCutParts,
    refetch: cutPartsQuery.refetch,
  };
};

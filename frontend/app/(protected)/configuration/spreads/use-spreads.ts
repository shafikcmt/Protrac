import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Spread = z.infer<typeof schemas.Spread>;
type SpreadRequest = z.infer<typeof schemas.SpreadRequest>;

export const useSpreads = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List spreads with pagination and search
  const spreadsQuery = apiHooks.useGet("/api/tracking/spreads/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create spread mutation
  const createSpreadMutation = apiHooks.usePost(
    "/api/tracking/spreads/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Spread created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/spreads/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update spread mutation
  const updateSpreadMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & SpreadRequest) => {
      return api.patch("/api/tracking/spreads/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Spread updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/spreads/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete spread mutation
  const deleteSpreadMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/spreads/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Spread deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/spreads/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createSpread = (data: SpreadRequest) => {
    createSpreadMutation.mutate(data);
  };

  const updateSpread = (id: number, data: SpreadRequest) => {
    updateSpreadMutation.mutate({ id, ...data });
  };

  const deleteSpread = (id: number) => {
    deleteSpreadMutation.mutate({ id });
  };

  const deleteSpreads = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteSpreadMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} spreads deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/spreads/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    spreads: spreadsQuery.data?.results || [],
    pagination: {
      count: spreadsQuery.data?.count || 0,
      next: spreadsQuery.data?.next,
      previous: spreadsQuery.data?.previous,
    },

    // Loading states
    isLoading: spreadsQuery.isLoading,
    isCreating: createSpreadMutation.isPending,
    isUpdating: updateSpreadMutation.isPending,
    isDeleting: deleteSpreadMutation.isPending,

    // Actions
    createSpread,
    updateSpread,
    deleteSpread,
    deleteSpreads,
    refetch: spreadsQuery.refetch,
  };
};

import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Buyer = z.infer<typeof schemas.Buyer>;
type BuyerRequest = z.infer<typeof schemas.BuyerRequest>;

export const useBuyers = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List buyers with pagination and search
  const buyersQuery = apiHooks.useGet("/api/tracking/buyers/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create buyer mutation
  const createBuyerMutation = apiHooks.usePost(
    "/api/tracking/buyers/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Buyer created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/buyers/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update buyer mutation
  const updateBuyerMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & BuyerRequest) => {
      return api.patch("/api/tracking/buyers/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Buyer updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/buyers/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete buyer mutation
  const deleteBuyerMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/buyers/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Buyer deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/buyers/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createBuyer = (data: BuyerRequest) => {
    createBuyerMutation.mutate(data);
  };

  const updateBuyer = (id: number, data: BuyerRequest) => {
    updateBuyerMutation.mutate({ id, ...data });
  };

  const deleteBuyer = (id: number) => {
    deleteBuyerMutation.mutate({ id });
  };

  const deleteBuyers = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteBuyerMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} buyers deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/buyers/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    buyers: buyersQuery.data?.results || [],
    pagination: {
      count: buyersQuery.data?.count || 0,
      next: buyersQuery.data?.next,
      previous: buyersQuery.data?.previous,
    },

    // Loading states
    isLoading: buyersQuery.isLoading,
    isCreating: createBuyerMutation.isPending,
    isUpdating: updateBuyerMutation.isPending,
    isDeleting: deleteBuyerMutation.isPending,

    // Actions
    createBuyer,
    updateBuyer,
    deleteBuyer,
    deleteBuyers,
    refetch: buyersQuery.refetch,
  };
};

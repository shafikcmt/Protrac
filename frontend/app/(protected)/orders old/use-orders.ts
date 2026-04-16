import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Order = z.infer<typeof schemas.Order>;
type OrderRequest = z.infer<typeof schemas.OrderRequest>;

export const useOrders = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List orders with pagination and search
  const ordersQuery = apiHooks.useGet("/api/tracking/orders/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create order mutation
  const createOrderMutation = apiHooks.usePost(
    "/api/tracking/orders/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Order created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/orders/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & OrderRequest) => {
      return api.patch("/api/tracking/orders/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Order updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/orders/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/orders/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Order deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/orders/");
      queryClient.invalidateQueries({ queryKey });
    },    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createOrder = (data: OrderRequest) => {
    createOrderMutation.mutate(data);
  };

  const updateOrder = (id: number, data: OrderRequest) => {
    updateOrderMutation.mutate({ id, ...data });
  };

  const deleteOrder = (id: number) => {
    deleteOrderMutation.mutate({ id });
  };

  const deleteOrders = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteOrderMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} orders deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/orders/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete orders");
    }
  };

  return {
    // Data
    orders: ordersQuery.data?.results || [],
    pagination: {
      count: ordersQuery.data?.count || 0,
      next: ordersQuery.data?.next,
      previous: ordersQuery.data?.previous,
    },

    // Loading states
    isLoading: ordersQuery.isLoading,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateOrderMutation.isPending,
    isDeleting: deleteOrderMutation.isPending,

    // Actions
    createOrder,
    updateOrder,
    deleteOrder,
    deleteOrders,
    refetch: ordersQuery.refetch,
  };
};

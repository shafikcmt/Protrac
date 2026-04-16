import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type OrderRequest = z.infer<typeof schemas.OrderRequest>;

export const useOrders = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/orders/");

  const ordersQuery = apiHooks.useGet("/api/tracking/orders/", undefined, {
    refetchOnWindowFocus: false,
  });

  const createOrderMutation = apiHooks.usePost(
    "/api/tracking/orders/",
    undefined,
    {
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & OrderRequest) => {
      return api.patch("/api/tracking/orders/:id/", data, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Order updated successfully");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/orders/:id/", undefined, {
        params: { id },
      });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createOrder = async (data: OrderRequest) => {
    try {
      await createOrderMutation.mutateAsync(data);
      toast.success("Order created successfully");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
      return true;
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
      return false;
    }
  };

  const createOrdersBulk = async (items: OrderRequest[]) => {
    try {
      for (const item of items) {
        await createOrderMutation.mutateAsync(item);
      }

      toast.success(`${items.length} orders created successfully`);
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
      return true;
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
      return false;
    }
  };

  const updateOrder = async (id: number, data: OrderRequest) => {
    try {
      await updateOrderMutation.mutateAsync({ id, ...data });
      return true;
    } catch {
      return false;
    }
  };

  const deleteOrder = async (id: number) => {
    try {
      await deleteOrderMutation.mutateAsync({ id });
      toast.success("Order deleted successfully");
      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch {
      return false;
    }
  };

  const deleteOrders = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteOrderMutation.mutateAsync({ id })));
      toast.success(`${ids.length} orders deleted successfully`);
      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
      return false;
    }
  };

  return {
    orders: ordersQuery.data?.results || [],
    pagination: {
      count: ordersQuery.data?.count || 0,
      next: ordersQuery.data?.next,
      previous: ordersQuery.data?.previous,
    },

    isLoading: ordersQuery.isLoading,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateOrderMutation.isPending,
    isDeleting: deleteOrderMutation.isPending,

    createOrder,
    createOrdersBulk,
    updateOrder,
    deleteOrder,
    deleteOrders,
    refetch: ordersQuery.refetch,
  };
};
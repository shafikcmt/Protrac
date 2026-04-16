import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Line = z.infer<typeof schemas.ProductionLine>;
type LineRequest = z.infer<typeof schemas.ProductionLineRequest>;

export const useLines = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List lines with pagination and search
  const linesQuery = apiHooks.useGet(
    "/api/tracking/productionlines/",
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create line mutation
  const createLineMutation = apiHooks.usePost(
    "/api/tracking/productionlines/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Line created successfully");
        const queryKey = apiHooks.getKeyByPath(
          "get",
          "/api/tracking/productionlines/"
        );
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update line mutation
  const updateLineMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & LineRequest) => {
      return api.patch("/api/tracking/productionlines/:id/", data, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Line updated successfully");
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/productionlines/"
      );
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete line mutation
  const deleteLineMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/productionlines/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Line deleted successfully");
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/productionlines/"
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createLine = (data: LineRequest) => {
    createLineMutation.mutate(data);
  };

  const updateLine = (id: number, data: LineRequest) => {
    updateLineMutation.mutate({ id, ...data });
  };

  const deleteLine = (id: number) => {
    deleteLineMutation.mutate({ id });
  };

  const deleteLines = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteLineMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} lines deleted successfully`);
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/productionlines/"
      );
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    lines: linesQuery.data?.results || [],
    pagination: {
      count: linesQuery.data?.count || 0,
      next: linesQuery.data?.next,
      previous: linesQuery.data?.previous,
    },

    // Loading states
    isLoading: linesQuery.isLoading,
    isCreating: createLineMutation.isPending,
    isUpdating: updateLineMutation.isPending,
    isDeleting: deleteLineMutation.isPending,

    // Actions
    createLine,
    updateLine,
    deleteLine,
    deleteLines,
    refetch: linesQuery.refetch,
  };
};

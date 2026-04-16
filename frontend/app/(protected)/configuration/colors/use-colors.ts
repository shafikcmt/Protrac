import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Color = z.infer<typeof schemas.Color>;
type ColorRequest = z.infer<typeof schemas.ColorRequest>;

export const useColors = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List colors with pagination and search
  const colorsQuery = apiHooks.useGet("/api/tracking/colors/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create color mutation
  const createColorMutation = apiHooks.usePost(
    "/api/tracking/colors/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Color created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/colors/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update color mutation
  const updateColorMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & ColorRequest) => {
      return api.patch("/api/tracking/colors/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Color updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/colors/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete color mutation
  const deleteColorMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/colors/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Color deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/colors/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createColor = (data: ColorRequest) => {
    createColorMutation.mutate(data);
  };

  const updateColor = (id: number, data: ColorRequest) => {
    updateColorMutation.mutate({ id, ...data });
  };

  const deleteColor = (id: number) => {
    deleteColorMutation.mutate({ id });
  };

  const deleteColors = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteColorMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} colors deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/colors/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    colors: colorsQuery.data?.results || [],
    pagination: {
      count: colorsQuery.data?.count || 0,
      next: colorsQuery.data?.next,
      previous: colorsQuery.data?.previous,
    },

    // Loading states
    isLoading: colorsQuery.isLoading,
    isCreating: createColorMutation.isPending,
    isUpdating: updateColorMutation.isPending,
    isDeleting: deleteColorMutation.isPending,

    // Actions
    createColor,
    updateColor,
    deleteColor,
    deleteColors,
    refetch: colorsQuery.refetch,
  };
};

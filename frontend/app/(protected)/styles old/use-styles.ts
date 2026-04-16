import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type StyleRequest = z.infer<typeof schemas.StyleWithPartsRequest>;

export const useStyles = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List styles with pagination and search
  const stylesQuery = apiHooks.useGet("/api/tracking/styles/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create style mutation
  const createStyleMutation = apiHooks.usePost(
    "/api/tracking/styles/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Style created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/styles/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: unknown) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update style mutation
  const updateStyleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & StyleRequest) => {
      return api.patch("/api/tracking/styles/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Style updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/styles/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete style mutation
  const deleteStyleMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/styles/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Style deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/styles/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createStyle = (data: StyleRequest) => {
    createStyleMutation.mutate(data);
  };

  const updateStyle = (id: number, data: StyleRequest) => {
    updateStyleMutation.mutate({ id, ...data });
  };

  const deleteStyle = (id: number) => {
    deleteStyleMutation.mutate({ id });
  };

  const deleteStyles = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteStyleMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} styles deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/styles/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    styles: stylesQuery.data?.results || [],
    pagination: {
      count: stylesQuery.data?.count || 0,
      next: stylesQuery.data?.next,
      previous: stylesQuery.data?.previous,
    },

    // Loading states
    isLoading: stylesQuery.isLoading,
    isCreating: createStyleMutation.isPending,
    isUpdating: updateStyleMutation.isPending,
    isDeleting: deleteStyleMutation.isPending,

    // Actions
    createStyle,
    updateStyle,
    deleteStyle,
    deleteStyles,
    refetch: stylesQuery.refetch,
  };
};

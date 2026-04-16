import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Defect = z.infer<typeof schemas.Defect>;
type DefectRequest = z.infer<typeof schemas.DefectRequest>;

export const useDefects = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List defects with pagination and search
  const defectsQuery = apiHooks.useGet("/api/tracking/defects/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create defect mutation
  const createDefectMutation = apiHooks.usePost(
    "/api/tracking/defects/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Defect created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/defects/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update defect mutation
  const updateDefectMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & DefectRequest) => {
      return api.patch("/api/tracking/defects/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Defect updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/defects/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete defect mutation
  const deleteDefectMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/defects/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Defect deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/defects/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createDefect = (data: DefectRequest) => {
    createDefectMutation.mutate(data);
  };

  const updateDefect = (id: number, data: DefectRequest) => {
    updateDefectMutation.mutate({ id, ...data });
  };

  const deleteDefect = (id: number) => {
    deleteDefectMutation.mutate({ id });
  };

  const deleteDefects = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteDefectMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} defects deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/defects/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    defects: defectsQuery.data?.results || [],
    pagination: {
      count: defectsQuery.data?.count || 0,
      next: defectsQuery.data?.next,
      previous: defectsQuery.data?.previous,
    },

    // Loading states
    isLoading: defectsQuery.isLoading,
    isCreating: createDefectMutation.isPending,
    isUpdating: updateDefectMutation.isPending,
    isDeleting: deleteDefectMutation.isPending,

    // Actions
    createDefect,
    updateDefect,
    deleteDefect,
    deleteDefects,
    refetch: defectsQuery.refetch,
  };
};

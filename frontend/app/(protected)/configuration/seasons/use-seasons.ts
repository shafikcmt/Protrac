import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type Season = z.infer<typeof schemas.Season>;
type SeasonRequest = z.infer<typeof schemas.SeasonRequest>;

export const useSeasons = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  // List seasons with pagination and search
  const seasonsQuery = apiHooks.useGet("/api/tracking/seasons/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create season mutation
  const createSeasonMutation = apiHooks.usePost(
    "/api/tracking/seasons/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Season created successfully");
        const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/seasons/");
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update season mutation
  const updateSeasonMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & SeasonRequest) => {
      return api.patch("/api/tracking/seasons/:id/", data, { params: { id } });
    },
    onSuccess: () => {
      toast.success("Season updated successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/seasons/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete season mutation
  const deleteSeasonMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/seasons/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Season deleted successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/seasons/");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createSeason = (data: SeasonRequest) => {
    createSeasonMutation.mutate(data);
  };

  const updateSeason = (id: number, data: SeasonRequest) => {
    updateSeasonMutation.mutate({ id, ...data });
  };

  const deleteSeason = (id: number) => {
    deleteSeasonMutation.mutate({ id });
  };

  const deleteSeasons = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteSeasonMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} seasons deleted successfully`);
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/seasons/");
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    // Data
    seasons: seasonsQuery.data?.results || [],
    pagination: {
      count: seasonsQuery.data?.count || 0,
      next: seasonsQuery.data?.next,
      previous: seasonsQuery.data?.previous,
    },

    // Loading states
    isLoading: seasonsQuery.isLoading,
    isCreating: createSeasonMutation.isPending,
    isUpdating: updateSeasonMutation.isPending,
    isDeleting: deleteSeasonMutation.isPending,

    // Actions
    createSeason,
    updateSeason,
    deleteSeason,
    deleteSeasons,
    refetch: seasonsQuery.refetch,
  };
};

import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

type PartRequest = z.infer<typeof schemas.PartRequest>;

export const useParts = () => {
  // List parts
  const partsQuery = apiHooks.useGet("/api/tracking/parts/", undefined, {
    refetchOnWindowFocus: false,
  });

  // Create part mutation
  const createPartMutation = apiHooks.usePost(
    "/api/tracking/parts/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Part created successfully");
        partsQuery.refetch();
      },
      onError: (error: unknown) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  const createPart = (data: PartRequest) => {
    return createPartMutation.mutateAsync(data);
  };

  return {
    // Data
    parts: partsQuery.data?.results || [],

    // Loading states
    isLoading: partsQuery.isLoading,
    isCreating: createPartMutation.isPending,

    // Actions
    createPart,
    refetch: partsQuery.refetch,
  };
};

"use client";

import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHooks, api } from "@/lib/api";
import { schemas } from "@/types/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";
import { useAuthStore } from "@/store/auth";

type LineTarget = z.infer<typeof schemas.LineTarget>;
type LineTargetRequest = z.infer<typeof schemas.LineTargetRequest>;

export interface BulkTargetEntry {
  line_id: number;
  line_name: string;
  target_quantity: number | null;
  work_hours: number | null;
  worker_count: number | null;
}

interface UseLineTargetsOptions {
  date?: string;
  line?: number;
  onSuccess?: () => void;
}

export function useLineTargets(options: UseLineTargetsOptions = {}) {
  const { date, line, onSuccess } = options;
  const queryClient = useQueryClient();

  // Build query parameters
  const queryParams: Record<string, any> = {};
  if (date) queryParams.date = date;
  if (line) queryParams.line = line;

  // Fetch line targets
  const {
    data: lineTargetsData,
    isLoading,
    error,
    refetch,
  } = apiHooks.useGet(
    "/api/tracking/line-targets/",
    Object.keys(queryParams).length > 0 ? { queries: queryParams } : undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch production lines for dropdowns
  const { data: productionLinesData } = apiHooks.useGet(
    "/api/tracking/productionlines/",
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create line target mutation
  const createLineTargetMutation = apiHooks.usePost(
    "/api/tracking/line-targets/",
    undefined,
    {
      onSuccess: () => {
        toast.success("Line target created successfully");
        const queryKey = apiHooks.getKeyByPath(
          "get",
          "/api/tracking/line-targets/"
        );
        queryClient.invalidateQueries({ queryKey });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error));
      },
    }
  );

  // Update line target mutation
  const updateLineTargetMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & LineTargetRequest) => {
      return api.patch("/api/tracking/line-targets/:id/", data, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Line target updated successfully");
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/line-targets/"
      );
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Delete line target mutation
  const deleteLineTargetMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return api.delete("/api/tracking/line-targets/:id/", undefined, {
        params: { id },
      });
    },
    onSuccess: () => {
      toast.success("Line target deleted successfully");
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/line-targets/"
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Bulk upsert mutation — uses raw fetch because the endpoint is not in the Zodios schema
  const bulkUpsertMutation = useMutation({
    mutationFn: async (payload: { date: string; targets: BulkTargetEntry[] }) => {
      const { tokens } = useAuthStore.getState();
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ??
        "http://127.0.0.1:8000";
      const res = await fetch(`${baseUrl}/api/tracking/line-targets/bulk/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.detail || "Failed to save line targets");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("All line targets saved successfully");
      const queryKey = apiHooks.getKeyByPath("get", "/api/tracking/line-targets/");
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save line targets");
    },
  });

  const bulkUpsertLineTargets = (payload: { date: string; targets: BulkTargetEntry[] }) => {
    bulkUpsertMutation.mutate(payload);
  };

  const createLineTarget = (data: LineTargetRequest) => {
    createLineTargetMutation.mutate(data);
  };

  const updateLineTarget = (id: number, data: LineTargetRequest) => {
    updateLineTargetMutation.mutate({ id, ...data });
  };

  const deleteLineTarget = (id: number) => {
    deleteLineTargetMutation.mutate({ id });
  };

  const deleteLineTargets = async (ids: number[]) => {
    try {
      await Promise.all(
        ids.map((id) => deleteLineTargetMutation.mutateAsync({ id }))
      );
      toast.success(`${ids.length} line targets deleted successfully`);
      const queryKey = apiHooks.getKeyByPath(
        "get",
        "/api/tracking/line-targets/"
      );
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  return {
    lineTargets: lineTargetsData?.results || [],
    productionLines: (productionLinesData?.results || []).filter(
      (l: any) => l.line_type === "sewing"
    ),
    totalCount: lineTargetsData?.count || 0,
    isLoading,
    error,
    isCreating: createLineTargetMutation.isPending,
    isUpdating: updateLineTargetMutation.isPending,
    isDeleting: deleteLineTargetMutation.isPending,
    isBulkUpserting: bulkUpsertMutation.isPending,
    createLineTarget,
    updateLineTarget,
    deleteLineTarget,
    deleteLineTargets,
    bulkUpsertLineTargets,
    refetch,
  };
}

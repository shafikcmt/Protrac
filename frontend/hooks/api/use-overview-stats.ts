"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

// Lightweight dashboard counts. Previously the Overview page fetched the full
// orders/styles/bundles lists just to read their `count`, which downloaded
// multi-MB payloads and took ~24s per bundles request (PAGE_SIZE is very high),
// leaving the cards stuck on "Loading...". This hook hits a dedicated
// count-only endpoint instead.

interface OverviewStatsResponse {
  total_orders: number;
  total_styles: number;
  total_bundles: number;
  completed_bundles: number;
  completion_rate: number;
}

const getBackendApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ??
  "http://192.168.245.25:8000";

async function fetchOverviewStats(): Promise<OverviewStatsResponse> {
  const token = useAuthStore.getState().tokens?.access;

  const res = await fetch(
    `${getBackendApiBaseUrl()}/api/tracking/stats/overview/`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to load overview stats (HTTP ${res.status})`);
  }

  return res.json();
}

export function useOverviewStats() {
  const query = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const data = query.data;

  return {
    orders: data ? { total: data.total_orders } : undefined,
    styles: data ? { total: data.total_styles } : undefined,
    bundles: data
      ? {
          total: data.total_bundles,
          completed: data.completed_bundles,
          inProgress: data.total_bundles - data.completed_bundles,
          completionRate: data.completion_rate,
        }
      : undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

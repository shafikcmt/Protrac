"use client";

import { apiHooks } from "@/lib/api";

// Hook to get orders count and stats
export function useOrdersStats() {
  const query = apiHooks.useGet(
    "/api/tracking/orders/",
    { queries: { page: 1 } },
    {
      refetchInterval: 60000, // Refresh every minute
      staleTime: 30000, // Cache for 30 seconds
    }
  );

  return {
    data: query.data ? { total: query.data.count } : undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook to get styles count
export function useStylesStats() {
  const query = apiHooks.useGet(
    "/api/tracking/styles/",
    { queries: { page: 1 } },
    {
      refetchInterval: 300000, // Refresh every 5 minutes (styles change less frequently)
      staleTime: 30000,
    }
  );

  return {
    data: query.data ? { total: query.data.count } : undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook to get bundles stats
export function useBundlesStats() {
  // Get total bundles
  const allBundlesQuery = apiHooks.useGet(
    "/api/tracking/bundles/",
    { queries: { page: 1 } },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 15000, // Cache for 15 seconds
    }
  );

  // Get completed bundles
  const completedBundlesQuery = apiHooks.useGet(
    "/api/tracking/bundles/",
    {
      queries: { page: 1, status: "completed" },
    },
    {
      refetchInterval: 30000,
      staleTime: 15000,
    }
  );

  const total = allBundlesQuery.data?.count ?? 0;
  const completed = completedBundlesQuery.data?.count ?? 0;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  return {
    data: {
      total,
      completed,
      inProgress: total - completed, // Approximation
      completionRate,
    },
    isLoading: allBundlesQuery.isLoading || completedBundlesQuery.isLoading,
    error: allBundlesQuery.error || completedBundlesQuery.error,
    refetch: () => {
      allBundlesQuery.refetch();
      completedBundlesQuery.refetch();
    },
  };
}

// Hook to get overall dashboard stats (combines multiple endpoints)
export function useOverviewStats() {
  const ordersQuery = useOrdersStats();
  const stylesQuery = useStylesStats();
  const bundlesQuery = useBundlesStats();

  return {
    orders: ordersQuery.data,
    styles: stylesQuery.data,
    bundles: bundlesQuery.data,
    isLoading:
      ordersQuery.isLoading || stylesQuery.isLoading || bundlesQuery.isLoading,
    error: ordersQuery.error || stylesQuery.error || bundlesQuery.error,
    refetch: () => {
      ordersQuery.refetch();
      stylesQuery.refetch();
      bundlesQuery.refetch();
    },
  };
}

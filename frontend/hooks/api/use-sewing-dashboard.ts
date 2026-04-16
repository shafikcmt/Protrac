import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type SewingLineDashboard = z.infer<typeof schemas.SewingLineDashboard>;

interface UseSewingDashboardOptions {
  active_only?: boolean;
  buyer_id?: number;
  buyer_ids?: number[];
  colors?: string[];
  date_from?: string;
  date_to?: string;
  order_id?: number;
  order_ids?: number[];
  production_line_id?: number;
  production_line_ids?: number[];
  sizes?: string[];
  style_id?: number;
  style_ids?: number[];
  refetchInterval?: number;
}

export const useSewingDashboard = (options: UseSewingDashboardOptions = {}) => {
  const {
    active_only,
    buyer_id,
    buyer_ids,
    colors,
    date_from,
    date_to,
    order_id,
    order_ids,
    production_line_id,
    production_line_ids,
    sizes,
    style_id,
    style_ids,
    refetchInterval = 10000,
  } = options;

  // Build query parameters
  const queries: Record<string, any> = {};
  if (active_only !== undefined) queries.active_only = active_only;
  if (buyer_id) queries.buyer_id = buyer_id;
  if (buyer_ids?.length) queries.buyer_ids = buyer_ids;
  if (colors?.length) queries.colors = colors;
  if (date_from) queries.date_from = date_from;
  if (date_to) queries.date_to = date_to;
  if (order_id) queries.order_id = order_id;
  if (order_ids?.length) queries.order_ids = order_ids;
  if (production_line_id) queries.production_line_id = production_line_id;
  if (production_line_ids?.length)
    queries.production_line_ids = production_line_ids;
  if (sizes?.length) queries.sizes = sizes;
  if (style_id) queries.style_id = style_id;
  if (style_ids?.length) queries.style_ids = style_ids;

  // Get sewing dashboard data with auto-refresh
  const dashboardQuery = apiHooks.useGet(
    "/api/tracking/reports/sewing-dashboard/",
    Object.keys(queries).length > 0 ? { queries } : undefined,
    {
      refetchOnWindowFocus: true,
      refetchInterval,
      retry: 3,
      retryDelay: 1000,
    }
  );

  return {
    sewingLines: dashboardQuery.data || [],
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
    isError: dashboardQuery.isError,
    isRefetching: dashboardQuery.isRefetching,
  };
};

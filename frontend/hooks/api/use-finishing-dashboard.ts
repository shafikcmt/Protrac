import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type FinishingOrderDashboard = z.infer<typeof schemas.FinishingOrderDashboard>;

interface UseFinishingDashboardOptions {
  active_only?: boolean;
  buyer_id?: number;
  buyer_ids?: number[];
  color?: string;
  colors?: string[];
  date_from?: string;
  date_to?: string;
  finishing_line_id?: number;
  finishing_line_ids?: number[];
  order_id?: number;
  order_ids?: number[];
  size?: string;
  sizes?: string[];
  style?: string;
  style_id?: number;
  style_ids?: number[];
  refetchInterval?: number;
}

export const useFinishingDashboard = (
  options: UseFinishingDashboardOptions = {}
) => {
  const {
    active_only,
    buyer_id,
    buyer_ids,
    color,
    colors,
    date_from,
    date_to,
    finishing_line_id,
    finishing_line_ids,
    order_id,
    order_ids,
    size,
    sizes,
    style,
    style_id,
    style_ids,
    refetchInterval = 10000,
  } = options;

  // Build query parameters
  const queries: Record<string, any> = {};
  if (active_only !== undefined) queries.active_only = active_only;
  if (buyer_id) queries.buyer_id = buyer_id;
  if (buyer_ids?.length) queries.buyer_ids = buyer_ids;
  if (color) queries.color = color;
  if (colors?.length) queries.colors = colors;
  if (date_from) queries.date_from = date_from;
  if (date_to) queries.date_to = date_to;
  if (finishing_line_id) queries.finishing_line_id = finishing_line_id;
  if (finishing_line_ids?.length)
    queries.finishing_line_ids = finishing_line_ids;
  if (order_id) queries.order_id = order_id;
  if (order_ids?.length) queries.order_ids = order_ids;
  if (size) queries.size = size;
  if (sizes?.length) queries.sizes = sizes;
  if (style) queries.style = style;
  if (style_id) queries.style_id = style_id;
  if (style_ids?.length) queries.style_ids = style_ids;

  // Get finishing dashboard data with auto-refresh
  const dashboardQuery = apiHooks.useGet(
    "/api/tracking/reports/finishing-dashboard/",
    Object.keys(queries).length > 0 ? { queries } : undefined,
    {
      refetchOnWindowFocus: true,
      refetchInterval,
      retry: 3,
      retryDelay: 1000,
    }
  );

  return {
    finishingOrders: dashboardQuery.data || [],
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
    isError: dashboardQuery.isError,
    isRefetching: dashboardQuery.isRefetching,
  };
};

import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface UseSewingDashboardV2Options {
  buyer_id?: number;
  colors?: string[];
  date?: string;
  date_from?: string;
  date_to?: string;
  order_id?: number;
  order_ids?: number[];
  production_line_id?: number;
  production_line_ids?: number[];
  size?: string;
  sizes?: string[];
  style_id?: number;
  style_ids?: number[];
  refetchInterval?: number;
}

export const useSewingDashboardV2 = (
  options: UseSewingDashboardV2Options = {}
) => {
  const {
    buyer_id,
    colors,
    date,
    date_from,
    date_to,
    order_id,
    order_ids,
    production_line_id,
    production_line_ids,
    size,
    sizes,
    style_id,
    style_ids,
    refetchInterval = 5000,
  } = options;


// Build query parameters
// Build query parameters
const queries: Record<string, any> = {};
if (buyer_id) queries.buyer_id = buyer_id;
if (date) queries.date = date;
if (date_from) queries.date_from = date_from;
if (date_to) queries.date_to = date_to;
if (order_id) queries.order_id = order_id;
if (production_line_id) queries.production_line_id = production_line_id;
if (size) queries.size = size;
if (style_id) queries.style_id = style_id;

// ✅ IMPORTANT: arrays must use [] to match backend (Django DRF style)
if (colors?.length) queries["colors[]"] = colors;
if (order_ids?.length) queries["order_ids[]"] = order_ids;
if (production_line_ids?.length) queries["production_line_ids[]"] = production_line_ids;
if (sizes?.length) queries["sizes[]"] = sizes;
if (style_ids?.length) queries["style_ids[]"] = style_ids;


  // Get sewing dashboard v2 data with auto-refresh
  const dashboardQuery = apiHooks.useGet(
    "/api/tracking/reports/sewing-line-dashboard-v2/",
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
    isRefetching: dashboardQuery.isRefetching,
  };
};

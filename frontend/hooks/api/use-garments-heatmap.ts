import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type GarmentHeatmapResponse = z.infer<typeof schemas.GarmentHeatmapResponse>;

interface UseGarmentsHeatmapOptions {
  buyer_id?: number;
  buyer_ids?: number[];
  color?: string;
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

export const useGarmentsHeatmap = (options: UseGarmentsHeatmapOptions = {}) => {
  const {
    buyer_id,
    buyer_ids,
    color,
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
  const queries: Record<string, any> = {};
  if (buyer_id) queries.buyer_id = buyer_id;
  if (buyer_ids?.length) queries.buyer_ids = buyer_ids;
  if (color) queries.color = color;
  if (colors?.length) queries.colors = colors;
  if (date) queries.date = date;
  if (date_from) queries.date_from = date_from;
  if (date_to) queries.date_to = date_to;
  if (order_id) queries.order_id = order_id;
  if (order_ids?.length) queries.order_ids = order_ids;
  if (production_line_id) queries.production_line_id = production_line_id;
  if (production_line_ids?.length)
    queries.production_line_ids = production_line_ids;
  if (size) queries.size = size;
  if (sizes?.length) queries.sizes = sizes;
  if (style_id) queries.style_id = style_id;
  if (style_ids?.length) queries.style_ids = style_ids;

  // Get garments heatmap data with auto-refresh
  const heatmapQuery = apiHooks.useGet(
    "/api/tracking/reports/garment-heatmap/",
    Object.keys(queries).length > 0 ? { queries } : undefined,
    {
      refetchOnWindowFocus: true,
      refetchInterval,
      retry: 3,
      retryDelay: 1000,
    }
  );

  return {
    heatmapData: heatmapQuery.data,
    isLoading: heatmapQuery.isLoading,
    error: heatmapQuery.error,
    refetch: heatmapQuery.refetch,
    isRefetching: heatmapQuery.isRefetching,
  };
};

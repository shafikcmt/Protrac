import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type DailyProductionReportResponse = z.infer<
  typeof schemas.DailyProductionReportResponse
>;

interface UseDailyProductionReportOptions {
  buyer_id?: number;
  buyer_ids?: number[];
  colors?: string[];
  date_from?: string;
  date_to?: string;
  order_id?: number;
  order_ids?: number[];
  production_line_id?: number;
  production_line_ids?: number[];
  report_date?: string;
  sizes?: string[];
  style_id?: number;
  style_ids?: number[];
  include_hidden?: boolean;
}

export const useDailyProductionReport = (
  options: UseDailyProductionReportOptions = {}
) => {
  const {
    buyer_id,
    buyer_ids,
    colors,
    date_from,
    date_to,
    order_id,
    order_ids,
    production_line_id,
    production_line_ids,
    report_date,
    sizes,
    style_id,
    style_ids,
    include_hidden,
  } = options;

  
  function appendParam(sp: URLSearchParams, key: string, value: any) {
  if (value === undefined || value === null || value === "") return;

  // ✅ arrays => key[]
  if (Array.isArray(value)) {
    value
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
      .forEach((v) => sp.append(`${key}[]`, String(v)));
    return;
  }

  sp.set(key, String(value));
}

 // ✅ Build query parameters (IMPORTANT: use plain keys; apiHooks will serialize arrays properly)
  const queries: Record<string, any> = {};

  if (buyer_id) queries.buyer_id = buyer_id;
  if (buyer_ids?.length) queries.buyer_ids = buyer_ids;

  if (production_line_id) queries.production_line_id = production_line_id;
  if (production_line_ids?.length) queries.production_line_ids = production_line_ids;

  if (style_id) queries.style_id = style_id;
  if (style_ids?.length) queries.style_ids = style_ids;

  if (order_id) queries.order_id = order_id;
  if (order_ids?.length) queries.order_ids = order_ids;

  if (sizes?.length) queries.sizes = sizes;
  if (colors?.length) queries.colors = colors;

  if (date_from) queries.date_from = date_from;
  if (date_to) queries.date_to = date_to;

  if (report_date) queries.report_date = report_date;

  // Only send include_hidden when explicitly enabled; the backend defaults to
  // false and hidden rows never affect summary totals either way.
  if (include_hidden) queries.include_hidden = true;

  const reportQuery = apiHooks.useGet(
    "/api/tracking/reports/daily-production/",
    Object.keys(queries).length > 0 ? { queries } : undefined,
    {
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: 1000,
    }
  );

  return {
    reportData: reportQuery.data,
    isLoading: reportQuery.isLoading,
    error: reportQuery.error,
    refetch: reportQuery.refetch,
    isError: reportQuery.isError,
    isRefetching: reportQuery.isRefetching,
  };
};
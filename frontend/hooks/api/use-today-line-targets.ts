"use client";

import { apiHooks } from "@/lib/api";
import { format } from "date-fns";

export function useTodayLineTargets() {
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's line targets
  const {
    data: lineTargetsData,
    isLoading,
    error,
    refetch,
  } = apiHooks.useGet(
    "/api/tracking/line-targets/",
    { queries: { date: today } },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    }
  );

  // Fetch production lines for reference
  const { data: productionLinesData } = apiHooks.useGet(
    "/api/tracking/productionlines/",
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  const lineTargets = lineTargetsData?.results || [];
  const productionLines = productionLinesData?.results || [];
  const totalLines = productionLines.length;
  const linesWithTargets = lineTargets.length;
  const totalTargetQuantity = lineTargets.reduce(
    (sum, target) => sum + target.target_quantity,
    0
  );

  return {
    lineTargets,
    totalLines,
    linesWithTargets,
    totalTargetQuantity,
    missingTargets: totalLines - linesWithTargets,
    isLoading,
    error,
    refetch,
  };
}

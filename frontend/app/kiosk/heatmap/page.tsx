"use client";

import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useGarmentsHeatmap } from "@/hooks/api";
import { useKioskFilters } from "../kiosk-context";
import { GarmentsHeatmapGrid } from "./garments-heatmap-grid";

export default function GarmentsHeatmapPage() {
  // State to control minimum display duration for refresh indicator
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);

  // Get filters from context
  const { filters } = useKioskFilters();

  // Fetch garments heatmap data with 5-second auto-refresh and filters
  const { heatmapData, isLoading, error, isRefetching } = useGarmentsHeatmap({
    buyer_id: filters.buyer_id,
    buyer_ids: filters.buyer_ids,
    color: filters.color,
    colors: filters.colors,
    date: filters.date,
    date_from: filters.date_from,
    date_to: filters.date_to,
    order_id: filters.order_id,
    order_ids: filters.order_ids,
    production_line_id: filters.production_line_id,
    production_line_ids: filters.production_line_ids,
    size: filters.size,
    sizes: filters.sizes,
    style_id: filters.style_id,
    style_ids: filters.style_ids,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Handle minimum 1-second display for refresh indicator
  useEffect(() => {
    if (isRefetching) {
      setShowRefreshIndicator(true);
    } else if (showRefreshIndicator) {
      // Keep showing for at least 1 second after refresh completes
      const timer = setTimeout(() => {
        setShowRefreshIndicator(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isRefetching, showRefreshIndicator]);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Garments Heatmap
          </h2>
          <p className="text-muted-foreground">
            Visual status overview of all garments organized by order
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <RefreshCw
            className={`h-4 w-4 ${
              showRefreshIndicator ? "animate-spin" : ""
            } text-muted-foreground`}
          />
          <span className="text-sm text-muted-foreground">
            Auto-refresh every 5s
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading heatmap data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error.message || "An unexpected error occurred"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !heatmapData && (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading heatmap data...</span>
          </div>
        </div>
      )}

      {/* Heatmap Content */}
      {heatmapData && (
        <GarmentsHeatmapGrid
          orders={heatmapData.orders}
          isRefetching={isRefetching}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && heatmapData?.orders?.length === 0 && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No orders found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            No orders match the current filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}

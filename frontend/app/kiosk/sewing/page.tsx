"use client";

import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useSewingDashboard } from "@/hooks/api";
import { StatsCards } from "./stats-cards";
import { ChartsGrid } from "./charts-grid";
import { useSewingChartData } from "./use-sewing-chart-data";
import { useKioskFilters } from "../kiosk-context";

export default function KioskPage() {
  // State to control minimum display duration for refresh indicator
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);

  // Get filters from context
  const { filters } = useKioskFilters();

  // Fetch sewing dashboard data with 5-second auto-refresh and filters
  const { sewingLines, isLoading, error, isRefetching } = useSewingDashboard({
    ...filters,
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

  // Process chart data and summary stats
  const { chartData, summaryStats } = useSewingChartData(sewingLines);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading dashboard data</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards
        chartData={chartData}
        summaryStats={summaryStats}
      />

      {/* Charts Grid */}
      <ChartsGrid
        chartData={chartData}
        isLoading={isLoading}
      />

      {/* Minimal refresh indicator - fixed at bottom right with minimum 1s display */}
      {showRefreshIndicator && (
        <div className="fixed bottom-4 right-4 z-50">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

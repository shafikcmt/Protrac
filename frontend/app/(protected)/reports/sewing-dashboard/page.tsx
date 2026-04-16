"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import { SewingStatsFilters } from "./sewing-stats-filters";
import { useSewingDashboard } from "@/hooks/api";
import { StatsCards } from "@/app/kiosk/sewing/stats-cards";
import { ChartsGrid } from "@/app/kiosk/sewing/charts-grid";
import { useSewingChartData } from "@/app/kiosk/sewing/use-sewing-chart-data";

interface FiltersState {
  production_line_id?: number;
  order_id?: number;
  date_from?: string;
  date_to?: string;
  active_only?: boolean;
}

export default function SewingDashboardPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Reports", url: "/reports" },
    { title: "Sewing Dashboard" },
  ];

  const [filters, setFilters] = useState<FiltersState>({
    active_only: true,
  });

  // State to control minimum display duration for refresh indicator
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);

  const handleFiltersChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
  };

  // Fetch sewing dashboard data with current filters
  const { sewingLines, isLoading, error, isRefetching } = useSewingDashboard({
    active_only: filters.active_only,
    date_from: filters.date_from,
    date_to: filters.date_to,
    order_id: filters.order_id,
    production_line_id: filters.production_line_id,
    refetchInterval: 30000, // Slower refresh for reports (30 seconds)
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
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <AppContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading dashboard data</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </AppContent>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Sewing Dashboard Report update
            </h1>
            <p className="text-muted-foreground">
              Monitor sewing line performance with real-time data and filtering
              capabilities
            </p>
          </div>

          {/* Filters */}
          <SewingStatsFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />

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

          {/* Refresh indicator - fixed at bottom right with minimum 1s display */}
          {showRefreshIndicator && (
            <div className="fixed bottom-4 right-4 z-50">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </AppContent>
    </>
  );
}

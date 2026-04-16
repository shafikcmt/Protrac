"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, FileText } from "lucide-react";
import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import { Button } from "@/components/ui/button";
import { ProductionReportFilters } from "./production-report-filters";
import { ProductionReportTable } from "./production-report-table";
import { useDailyProductionReport } from "@/hooks/api";
import { cn } from "@/lib/utils";

interface FiltersState {
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
}

export default function DailyProductionPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Reports", url: "/reports" },
    { title: "Daily Production Report" },
  ];

  const [filters, setFilters] = useState<FiltersState>({
    report_date: new Date().toISOString().split("T")[0], // Default to today
  });

  // State to control minimum display duration for refresh indicator
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);

  const handleFiltersChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
  };

  // Fetch daily production report data with current filters
  const { reportData, isLoading, error, isRefetching, refetch } =
    useDailyProductionReport({
      buyer_id: filters.buyer_id,
      buyer_ids: filters.buyer_ids,
      colors: filters.colors,
      date_from: filters.date_from,
      date_to: filters.date_to,
      order_id: filters.order_id,
      order_ids: filters.order_ids,
      production_line_id: filters.production_line_id,
      production_line_ids: filters.production_line_ids,
      report_date: filters.report_date,
      sizes: filters.sizes,
      style_id: filters.style_id,
      style_ids: filters.style_ids,
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

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log("Export functionality to be implemented");
  };

  if (error) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <AppContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading report data</p>
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
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Daily Production Report
              </h1>
              <p className="text-muted-foreground">
                Comprehensive daily production efficiency report for all
                production lines
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefetching}
                className="gap-2">
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    (isLoading || isRefetching) && "animate-spin"
                  )}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isLoading || !reportData}
                className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <ProductionReportFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />

          {/* Report Table */}
          <ProductionReportTable
            reportData={reportData}
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

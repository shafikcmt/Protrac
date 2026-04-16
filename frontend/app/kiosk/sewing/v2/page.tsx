"use client";

import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useSewingDashboardV2 } from "@/hooks/api";
import { useKioskFilters } from "../../kiosk-context";
import { StatsHeaderCards } from "./stats-header-cards";
import { SingleGauge } from "./single-gauge";
import { HourlyDataTable } from "./hourly-data-table";
import { WipAndLoadingCards } from "./wip-and-loading-cards";
import { EndLineDefects } from "./end-line-defects";
import { PartInventory } from "./part-inventory";
import { ChartConfig } from "@/components/ui/chart";

export default function SewingKioskV2Page() {
  // State to control minimum display duration for refresh indicator
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);

  // Get filters from context
  const { filters } = useKioskFilters();

  // Fetch sewing dashboard v2 data with 5-second auto-refresh and filters
  const { sewingLines, isLoading, error, isRefetching } = useSewingDashboardV2({
    buyer_id: filters.buyer_id,
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

  // Get the first line's data (assuming single line for kiosk)
  const lineData = sewingLines?.[0];

  // Gauge configurations
  const efficiencyConfig = {
    value: { label: "Efficiency", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const rejectionConfig = {
    value: { label: "Rejection", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  const dhuConfig = {
    value: { label: "DHU", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-4">
      {/* Header Stats Cards - Small height */}
      <StatsHeaderCards
        lineData={lineData}
        isLoading={isLoading}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-4 gap-4 h-[600px]">
        {/* Column 1: Hourly Table (spans full height) */}
        <div className="col-span-1 row-span-1">
          <HourlyDataTable
            lineData={lineData}
            isLoading={isLoading}
          />
        </div>

        {/* Column 2: Efficiency Gauge + End Line Defects */}
        <div className="col-span-1 space-y-4">
          <div className="h-[280px]">
            <SingleGauge
              title="EFFICIENCY"
              value={parseFloat(lineData?.efficiency_percentage ?? "0")}
              colorConfig={efficiencyConfig}
              isLoading={isLoading}
            />
          </div>
          <div className="h-[296px]">
            <EndLineDefects
              lineData={lineData}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Column 3: Rejection Gauge + Part Inventory */}
        <div className="col-span-1 space-y-4">
          <div className="h-[280px]">
            <SingleGauge
              title="REJECTION"
              value={parseFloat(lineData?.rejection_percentage ?? "0")}
              colorConfig={rejectionConfig}
              isLoading={isLoading}
            />
          </div>
          <div className="h-[296px]">
            <PartInventory
              lineData={lineData}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Column 4: DHU Gauge + WIP & Loading Cards */}
        <div className="col-span-1 space-y-4">
          <div className="h-[280px]">
            <SingleGauge
              title="DHU"
              value={parseFloat(lineData?.dhu_percentage ?? "0")}
              colorConfig={dhuConfig}
              isLoading={isLoading}
            />
          </div>
          <div className="h-[296px]">
            <WipAndLoadingCards
              lineData={lineData}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Minimal refresh indicator - fixed at bottom right with minimum 1s display */}
      {showRefreshIndicator && (
        <div className="fixed bottom-4 right-4 z-50">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

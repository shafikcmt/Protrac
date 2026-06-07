"use client";

import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useFinishingDashboard } from "@/hooks/api";
import { StatsCards } from "./stats-cards";
import { OrdersTable } from "./orders-table";
import { useFinishingChartData } from "./use-finishing-chart-data";
import { useKioskFilters } from "../kiosk-context";

export default function FinishingKioskPage() {
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);

  const { filters } = useKioskFilters();

  const { finishingOrders, isLoading, error, isRefetching } =
    useFinishingDashboard({
      ...filters,
      refetchInterval: 60000, // 60-second auto-refresh for TV display
    });

  useEffect(() => {
    if (isRefetching) {
      setShowRefreshIndicator(true);
    } else if (showRefreshIndicator) {
      const timer = setTimeout(() => setShowRefreshIndicator(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isRefetching, showRefreshIndicator]);

  const { chartData, summaryStats } = useFinishingChartData(finishingOrders);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 text-xl font-bold mb-2">
            Error loading dashboard
          </p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col gap-4 overflow-hidden -m-6 p-6 bg-slate-950">
      {/* Summary stats — fixed height */}
      <StatsCards chartData={chartData} summaryStats={summaryStats} />

      {/* Order cards grid — fills remaining height, no scroll */}
      <OrdersTable finishingOrders={finishingOrders} isLoading={isLoading} />

      {/* Subtle refresh indicator, bottom-right corner */}
      {showRefreshIndicator && (
        <div className="fixed bottom-4 right-4 z-50">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

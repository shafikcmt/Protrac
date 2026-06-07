"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { RefreshCw, Tv, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFinishingDashboard } from "@/hooks/api";
import { StatsCards } from "./stats-cards";
import { OrdersCarousel } from "./orders-carousel";
import { OrdersTable } from "./orders-table";
import { useFinishingChartData } from "./use-finishing-chart-data";
import { useKioskFilters } from "../kiosk-context";
import { groupOrders } from "./finishing-types";

export default function FinishingKioskPage() {
  // TV / Manage mode — persisted in localStorage
  const [tvMode, setTvMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("finishing-kiosk-mode") !== "manage";
  });

  const toggleMode = () => {
    setTvMode((prev) => {
      const next = !prev;
      localStorage.setItem("finishing-kiosk-mode", next ? "tv" : "manage");
      return next;
    });
  };

  // Refresh indicator state
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const wasRefetching = useRef(false);

  const { filters } = useKioskFilters();

  const { finishingOrders, isLoading, error, isRefetching } =
    useFinishingDashboard({
      ...filters,
      refetchInterval: 60000, // 60-second silent refresh for TV display
    });

  // Track refetch → mark last updated time
  useEffect(() => {
    if (isRefetching) {
      wasRefetching.current = true;
      setShowRefreshIndicator(true);
    } else if (wasRefetching.current) {
      wasRefetching.current = false;
      setLastUpdated(format(new Date(), "HH:mm:ss"));
      const timer = setTimeout(() => setShowRefreshIndicator(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isRefetching]);

  // Set last updated on initial data load
  useEffect(() => {
    if (!isLoading && !lastUpdated) {
      setLastUpdated(format(new Date(), "HH:mm:ss"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const { chartData, summaryStats } = useFinishingChartData(finishingOrders);

  // Group orders once; both carousel and table receive pre-grouped data
  const groups = useMemo(() => groupOrders(finishingOrders), [finishingOrders]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 text-xl font-bold mb-2">Error loading dashboard</p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const slideCount = Math.ceil(groups.length / 3);

  return (
    // -m-6 p-6 bleeds past <main className="p-6"> so dark bg fills edge-to-edge
    <div className="h-[calc(100vh-64px)] flex flex-col gap-4 overflow-hidden -m-6 p-6 bg-gray-50 dark:bg-slate-950">

      {/* Control row */}
      <div className="shrink-0 flex items-center justify-between">
        <button
          onClick={toggleMode}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            tvMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600"
          )}
        >
          {tvMode ? <Tv className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          {tvMode ? "TV Mode" : "Manage Mode"}
        </button>

        <span className="text-xs text-gray-400 dark:text-slate-500">
          {groups.length} order{groups.length !== 1 ? "s" : ""}
          {tvMode && groups.length > 3 && ` · ${slideCount} slides`}
        </span>
      </div>

      {/* Summary stat cards */}
      <StatsCards chartData={chartData} summaryStats={summaryStats} />

      {/* Main content: carousel (TV) or table with search (Manage) */}
      {tvMode ? (
        <OrdersCarousel groups={groups} />
      ) : (
        <OrdersTable groups={groups} isLoading={isLoading} />
      )}

      {/* Bottom info bar */}
      <div className="shrink-0 flex items-center justify-between border-t border-gray-200 dark:border-slate-800 pt-2 text-xs text-gray-400 dark:text-slate-500">
        <span>
          Showing{" "}
          <span className="font-bold text-gray-600 dark:text-slate-300">
            {groups.length}
          </span>{" "}
          order{groups.length !== 1 ? "s" : ""}
        </span>
        <span>
          Last updated:{" "}
          <span className="font-mono font-bold text-gray-600 dark:text-slate-300">
            {lastUpdated || "—"}
          </span>
        </span>
      </div>

      {/* Subtle refresh spinner */}
      {showRefreshIndicator && (
        <div className="fixed bottom-4 right-4 z-50">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

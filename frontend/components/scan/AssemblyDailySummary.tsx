"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiHooks } from "@/lib/api";
import {
  SerialHeatmapGrid,
  type SerialStatusConfig,
} from "@/components/scan/serial-heatmap-grid";

/** Today's date as YYYY-MM-DD in Dhaka time, independent of the browser tz. */
function getDhakaToday(): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Pretty header date, e.g. "Jun 15, 2026". */
function formatHeaderDate(iso: string): string {
  // Parse as a plain date (no tz shift) for display.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Two-status colour coding for the serial heatmap, mirroring the kiosk heatmap's
   visual language (pending = grey, issued = blue) but only the two assembly
   states this card cares about. Legend order = issued first, then pending. */
const ASSEMBLY_STATUS_CONFIG: SerialStatusConfig = {
  issued_for_assembly: {
    box: "bg-blue-500 text-white",
    dot: "bg-blue-500",
    label: "Issued today",
  },
  pending_assembly: {
    box: "bg-gray-400 text-white",
    dot: "bg-gray-400",
    label: "Pending",
  },
};
const ASSEMBLY_LEGEND_ORDER = ["issued_for_assembly", "pending_assembly"];

export function AssemblyDailySummary() {
  // Re-derive the Dhaka date on an interval so a long-open kiosk tab rolls over
  // to the next day automatically at midnight — no manual page reload needed.
  // Only bump state when the day actually changes to avoid needless re-renders.
  const [date, setDate] = React.useState(getDhakaToday);

  React.useEffect(() => {
    const id = setInterval(() => {
      setDate((prev) => {
        const now = getDhakaToday();
        return now === prev ? prev : now;
      });
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Which order-group (size) pill is selected. Index 0 = most-recently-active,
  // shown by default; clamped at render time in case the group list shrinks.
  const [selectedGroupIdx, setSelectedGroupIdx] = React.useState(0);

  const { data, isLoading, error } = apiHooks.useGet(
    "/api/tracking/assembly/daily-summary/",
    { queries: { date } },
    {
      refetchOnWindowFocus: false,
      refetchInterval: 60000,
    }
  );

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <Card className="py-4 gap-3">
        <CardHeader className="px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Error state ── */
  if (error || !data) {
    return (
      <Card className="py-4 gap-3">
        <CardHeader className="px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load today&apos;s summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    line,
    total_assemble,
    active_order,
    garments_grid = [],
    order_groups = [],
    hourly = [],
  } = data;

  // One serial grid per order (size) active today, most-recent first. During
  // rollout an older backend might not send order_groups yet, so fall back to the
  // legacy flat active_order + garments_grid as a single synthetic group.
  const groups =
    order_groups.length > 0
      ? order_groups
      : active_order
        ? [
            {
              order_number: active_order.order_number,
              style: active_order.style,
              size: "",
              last_activity_at: "",
              garments_grid,
            },
          ]
        : [];

  // A LineTarget for today yields a full hour grid (H1..Hn) even before any scans;
  // the table renders whenever those rows exist. Only a line with no LineTarget at
  // all comes back with an empty array, which shows the fallback instead. This
  // mirrors the sewing v3 "Parts-wise Products WIP" table, which always renders the
  // whole grid and dashes out empty hours rather than hiding.
  const hasLineTarget = hourly.length > 0;

  // Backend returns today's worklist for the active order, ascending serial:
  // garments still pending + garments issued for assembly today (issued ones
  // stay visible all day; previous days' issues are already filtered out).
  const issuedCount = garments_grid.filter(
    (g) => g.status === "issued_for_assembly"
  ).length;
  const pendingCount = garments_grid.length - issuedCount;

  return (
    <>
      {/* Card 1 — Top section: line, totals, parts breakdown, garments issued.
          Natural content height (no forced stretch). */}
      <Card className="py-4 gap-3">
      <CardHeader className="px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s summary
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatHeaderDate(data.date)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-4 space-y-3">
        {/* Line chip */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/12 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-500/30 dark:text-blue-300">
            <Factory className="h-3.5 w-3.5" />
            {line}
          </span>
        </div>

        {/* Total assemble + Pending counts, with active order identity */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-4">
            <div>
              <div className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {total_assemble}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total assemble
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-gray-500 dark:text-gray-400">
                {pendingCount}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Pending
              </div>
            </div>
          </div>
          {active_order && (
            <div className="min-w-0 text-right">
              <div className="truncate text-xs font-semibold">
                {active_order.order_number}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {active_order.style}
              </div>
            </div>
          )}
        </div>

        {/* Today's serial worklist — one grid per order (size) active today. The
            same style can have several sizes (each a distinct Order) assembling
            the same day. Rather than stacking every grid (tall card), a compact
            pill switcher lets the operator flip between sizes; only the selected
            size's grid renders, so the card height stays consistent no matter how
            many sizes are active. Groups arrive recency-sorted, so pill 0 (the
            most-recently-active size) is selected by default. */}
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No garments for this order today.
          </p>
        ) : (
          (() => {
            // In this branch groups is non-empty; index access is still typed as
            // possibly-undefined under noUncheckedIndexedAccess, so assert groups[0].
            const selected = groups[selectedGroupIdx] ?? groups[0]!;
            return (
              <div className="space-y-2">
                {/* Pill switcher — only when 2+ sizes are active today. */}
                {groups.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map((group, i) => {
                      const issued = group.garments_grid.filter(
                        (c) => c.status === "issued_for_assembly"
                      ).length;
                      const total = group.garments_grid.length;
                      const isSelected = i === selectedGroupIdx;
                      return (
                        <button
                          key={`${group.order_number}-${group.size}-${i}`}
                          type="button"
                          onClick={() => setSelectedGroupIdx(i)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                            isSelected
                              ? "bg-emerald-500 text-white ring-1 ring-emerald-500/30"
                              : "border-[0.5px] border-border bg-muted/30 text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                          <span className="max-w-[140px] truncate">
                            {group.style}
                            {group.size ? ` • ${group.size}` : ""}
                          </span>
                          <span
                            className={cn(
                              "tabular-nums",
                              isSelected ? "text-white/90" : "text-foreground/70"
                            )}
                          >
                            {issued}/{total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Only the selected group's grid — one at a time keeps the card
                    compact with no nested/runaway scrolling. */}
                <SerialHeatmapGrid
                  cells={selected.garments_grid}
                  statusConfig={ASSEMBLY_STATUS_CONFIG}
                  legendOrder={ASSEMBLY_LEGEND_ORDER}
                  emptyMessage="No garments for this order today."
                />
              </div>
            );
          })()
        )}
      </CardContent>
      </Card>

      {/* Card 2 — Hourly: bundles received vs assembly complete. Always renders
          the full hour grid (H1..Hn) when the line has a daily target — hours
          with no scans yet show a "–" placeholder, exactly like the sewing v3 WIP
          table. A line with no LineTarget at all falls back to a message.
          Natural content height (no forced stretch). */}
      <Card className="py-4 gap-3">
        <CardHeader className="px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Hourly · Bundles vs Assembly
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {hasLineTarget ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1 text-left font-medium">Hour</th>
                    <th className="px-3 py-1 text-right font-medium">Target</th>
                    <th className="px-3 py-1 text-right font-medium">Bundles</th>
                    <th className="px-3 py-1 text-right font-medium">Assembly</th>
                  </tr>
                </thead>
                <tbody>
                  {hourly.map((h) => (
                    <tr key={h.hour} className="border-t border-border/50">
                      <td className="px-3 py-1 text-left font-medium">H{h.hour}</td>
                      <td className="px-3 py-1 text-right text-muted-foreground">
                        {h.target || "–"}
                      </td>
                      <td className="px-3 py-1 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {h.bundles_received || "–"}
                      </td>
                      <td className="px-3 py-1 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {h.assembly_complete || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className="px-3 py-1 text-left">Total</td>
                    <td className="px-3 py-1 text-right text-muted-foreground">
                      {hourly.reduce((s, h) => s + (h.target || 0), 0) || "–"}
                    </td>
                    <td className="px-3 py-1 text-right text-blue-600 dark:text-blue-400">
                      {hourly.reduce((s, h) => s + h.bundles_received, 0) || "–"}
                    </td>
                    <td className="px-3 py-1 text-right text-emerald-600 dark:text-emerald-400">
                      {hourly.reduce((s, h) => s + h.assembly_complete, 0) || "–"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
              No daily target set for today
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

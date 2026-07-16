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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Pretty header date, e.g. "Jun 15, 2026". */
function formatHeaderDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Three-status colour coding for the serial heatmap, matching the QC status
   colour language (issued = blue, pass = green, rework = orange). Fail and Rework
   are merged server-side into the single "sewing_qc_rework" bucket, so there is no
   separate Fail colour here. Legend order: issued, pass, rework. */
const SEWING_QC_STATUS_CONFIG: SerialStatusConfig = {
  issued_for_assembly: {
    box: "bg-blue-500 text-white",
    dot: "bg-blue-500",
    label: "Issued",
  },
  sewing_qc_pass: {
    box: "bg-green-500 text-white",
    dot: "bg-green-500",
    label: "Pass",
  },
  sewing_qc_rework: {
    box: "bg-orange-500 text-white",
    dot: "bg-orange-500",
    label: "Rework",
  },
};
const SEWING_QC_LEGEND_ORDER = [
  "issued_for_assembly",
  "sewing_qc_pass",
  "sewing_qc_rework",
];

/* Stat tile colour language mirrors the QC status buttons on the scan form:
   output = green (pass), rework = orange, fail = red. DHU% is a neutral blue
   metric. */
function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "green" | "orange" | "red" | "blue";
}) {
  const toneClass = {
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  }[tone];
  return (
    <div className="rounded-lg border bg-card/40 px-3 py-2">
      <div className={cn("text-2xl font-bold tabular-nums", toneClass)}>
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function SewingQCDailySummary() {
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
    "/api/tracking/sewing-qc/daily-summary/",
    { queries: { date } },
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000,
    }
  );

  const Header = (
    <CardHeader className="px-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Today&apos;s QC summary
        </CardTitle>
        {data && (
          <span className="text-xs text-muted-foreground">
            {formatHeaderDate(data.date)}
          </span>
        )}
      </div>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card className="py-4 gap-3">
        {Header}
        <CardContent className="px-4">
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="py-4 gap-3">
        {Header}
        <CardContent className="px-4">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load today&apos;s QC summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    line,
    total_output,
    total_rework,
    pass_rate,
    dhu,
    top_defects = [],
    active_order,
    garments_grid = [],
    order_groups = [],
  } = data;

  // One serial grid per order (size) active today, most-recent first. During
  // rollout an older backend might not send order_groups yet, so fall back to the
  // legacy flat active_order + garments_grid as a single synthetic group. Mirrors
  // the assembly "Today's summary" card.
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

  // In this render groups may be empty; the Serial Status block below guards on
  // that. Clamp the selected index so a shrinking group list never dangles.
  const selectedGroup = groups[selectedGroupIdx] ?? groups[0];

  const maxDefect = top_defects.reduce((m, d) => Math.max(m, d.count), 0);

  return (
    <Card className="py-4 gap-3">
      {Header}
      <CardContent className="px-4 space-y-3">
        {/* Line chip */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/12 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-500/30 dark:text-blue-300">
            <Factory className="h-3.5 w-3.5" />
            {line}
          </span>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Total Output" value={total_output} tone="green" />
          <StatTile label="Total Rework" value={total_rework} tone="orange" />
          <StatTile label="Pass Rate %" value={pass_rate.toFixed(2)} tone="blue" />
          <StatTile label="DHU %" value={dhu.toFixed(2)} tone="red" />
        </div>

        {/* Active order's serial-status grid — the currently running style/order
            on this line, each garment coloured by sewing-QC status: blue = issued
            (awaiting QC), green = pass (today only), orange = rework/fail (carried
            forward until resolved). Same square visual language + internal scroll
            as the assembly-tracking grid. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Serial Status
            </div>
            {/* Top-right identity tracks the currently-selected pill, not always
                the first group. */}
            {selectedGroup && (
              <div className="min-w-0 text-right">
                <div className="truncate text-xs font-semibold">
                  {selectedGroup.order_number}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {selectedGroup.style}
                  {selectedGroup.size ? ` • ${selectedGroup.size}` : ""}
                </div>
              </div>
            )}
          </div>

          {/* One serial grid per order (size) active today. The same style can
              have several sizes (each a distinct Order) in QC the same day.
              Rather than stacking every grid (tall card), a compact pill switcher
              lets the operator flip between sizes; only the selected size's grid
              renders, so the card height stays consistent. Groups arrive
              recency-sorted, so pill 0 (most-recently-active) is default. Mirrors
              the assembly-tracking "Today's summary" card. */}
          {groups.length === 0 || !selectedGroup ? (
            <SerialHeatmapGrid
              cells={[]}
              statusConfig={SEWING_QC_STATUS_CONFIG}
              legendOrder={SEWING_QC_LEGEND_ORDER}
              emptyMessage="No active order on this line today."
            />
          ) : (
            <>
              {/* Pill switcher — only when 2+ sizes are active today. */}
              {groups.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((group, i) => {
                    // "Done" numerator = garments that passed QC today.
                    const done = group.garments_grid.filter(
                      (c) => c.status === "sewing_qc_pass"
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
                          {done}/{total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Only the selected group's grid — one at a time keeps the card
                  compact with no nested/runaway scrolling. */}
              <SerialHeatmapGrid
                cells={selectedGroup.garments_grid}
                statusConfig={SEWING_QC_STATUS_CONFIG}
                legendOrder={SEWING_QC_LEGEND_ORDER}
                emptyMessage="No active order on this line today."
              />
            </>
          )}
        </div>

        {/* Top defects — how often each code was tagged today */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Top Defects
          </div>
          {top_defects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No defects recorded today.
            </p>
          ) : (
            <div className="max-h-[260px] space-y-1.5 overflow-y-auto rounded-lg border bg-card/40 p-2">
              {top_defects.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded bg-red-500/12 px-1 font-semibold tabular-nums text-red-700 dark:text-red-300">
                    {d.code || "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate" title={d.name}>
                    {d.name}
                  </span>
                  {/* Frequency bar */}
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                    <span
                      className="block h-full rounded-full bg-red-500"
                      style={{
                        width: `${maxDefect ? (d.count / maxDefect) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="w-6 flex-shrink-0 text-right font-semibold tabular-nums">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

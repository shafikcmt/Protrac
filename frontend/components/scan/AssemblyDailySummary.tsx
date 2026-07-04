"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiHooks } from "@/lib/api";

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
   states this card cares about. */
const SERIAL_ISSUED = {
  box: "bg-blue-500 text-white",
  dot: "bg-blue-500",
  label: "Issued for Assembly",
} as const;
const SERIAL_PENDING = {
  box: "bg-gray-400 text-white",
  dot: "bg-gray-400",
  label: "Pending Assembly",
} as const;
function serialStatus(status: string) {
  return status === "issued_for_assembly" ? SERIAL_ISSUED : SERIAL_PENDING;
}

/** One compact garment cell — small rounded square with its serial number,
    coloured by assembly status. Same visual language as the kiosk heatmap's
    GarmentBox, shrunk to fit the summary column. */
function SerialBox({
  sequence_number,
  tracking_code,
  status,
}: {
  sequence_number: number;
  tracking_code: string;
  status: string;
}) {
  const s = serialStatus(status);
  return (
    <div
      className={cn(
        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums transition-transform hover:scale-110",
        s.box
      )}
      title={`#${sequence_number} · ${s.label} · ${tracking_code}`}
    >
      {sequence_number}
    </div>
  );
}

export function AssemblyDailySummary() {
  const date = React.useMemo(() => getDhakaToday(), []);

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
    hourly = [],
  } = data;

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

        {/* Today's serial worklist — pending + issued-today for the active order,
            ascending serial, coloured by status (grey = pending, blue = issued
            today). Same square visual language as the kiosk heatmap. Bounded
            height + internal scroll so a long list never expands the page /
            distorts the 3-column grid. */}
        {garments_grid.length > 0 ? (
          <div className="space-y-2">
            {/* Legend + counts */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                Issued today
                <span className="font-semibold tabular-nums text-foreground">
                  {issuedCount}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-gray-400" />
                Pending
                <span className="font-semibold tabular-nums text-foreground">
                  {pendingCount}
                </span>
              </span>
            </div>
            {/* Grid of serial squares (scrolls internally) */}
            <div className="max-h-[340px] overflow-y-auto rounded-lg border bg-card/40 p-2">
              <div className="flex flex-wrap gap-1">
                {garments_grid.map((g) => (
                  <SerialBox
                    key={g.tracking_code}
                    sequence_number={g.sequence_number}
                    tracking_code={g.tracking_code}
                    status={g.status}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No garments for this order today.
          </p>
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

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ChevronLeft, ChevronRight, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiHooks } from "@/lib/api";
import {
  SerialDualHeatmapGrid,
  SerialDualHeatmapLegend,
  type DualSerialCell,
  type DualStatusConfig,
} from "@/components/scan/serial-dual-heatmap-grid";

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

/* Sewing axis (top-left triangle) colour language — matches the sewing-QC grid:
   pass = green, rework/fail = orange. */
const SEWING_STATUS_CONFIG: DualStatusConfig = {
  sewing_qc_pass: { fill: "bg-green-500", dot: "bg-green-500", label: "Pass" },
  sewing_qc_rework: {
    fill: "bg-orange-500",
    dot: "bg-orange-500",
    label: "Rework",
  },
};
const SEWING_LEGEND_ORDER = ["sewing_qc_pass", "sewing_qc_rework"];

/* Finishing axis (bottom-right triangle): pending = slate (passed sewing, not
   yet finishing-QC'd), pass = green, rework/fail = orange. */
const FINISHING_STATUS_CONFIG: DualStatusConfig = {
  finishing_qc_pending: {
    fill: "bg-slate-400 dark:bg-slate-500",
    dot: "bg-slate-400 dark:bg-slate-500",
    label: "Pending",
  },
  finishing_qc_pass: {
    fill: "bg-green-500",
    dot: "bg-green-500",
    label: "Pass",
  },
  finishing_qc_rework: {
    fill: "bg-orange-500",
    dot: "bg-orange-500",
    label: "Rework",
  },
};
const FINISHING_LEGEND_ORDER = [
  "finishing_qc_pending",
  "finishing_qc_pass",
  "finishing_qc_rework",
];

/* Stat tile colour language mirrors the QC status buttons on the scan form:
   output = green (pass), rework = orange. DHU% is a neutral-red quality metric,
   pass-rate a neutral blue. */
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

export function FinishingQCDailySummary({
  onSerialSelect,
}: {
  /** When set, clicking a serial square fills the scan form's Tracking Code
      field with that garment's tracking code (click-to-paste). */
  onSerialSelect?: (trackingCode: string) => void;
} = {}) {
  // Re-derive the Dhaka date on an interval so a long-open kiosk tab rolls over
  // to the next day automatically at midnight — no manual page reload needed.
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

  // Two-level selection: which order tab, then which size pill inside it. Both
  // index 0 = most-recently-active. Selecting an order resets the size to 0.
  const [selectedOrderIdx, setSelectedOrderIdx] = React.useState(0);
  const [selectedSizeIdx, setSelectedSizeIdx] = React.useState(0);

  // Keep the selected order tab scrolled into view as the operator pages through
  // orders with the ‹ / › buttons (block: "nearest" avoids any vertical jump).
  const selectedTabRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    selectedTabRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [selectedOrderIdx]);

  const { data, isLoading, error } = apiHooks.useGet(
    "/api/tracking/finishing-qc/daily-summary/",
    { queries: { date } },
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000,
    }
  );

  // Two-level grouping: each `order_group` is one Order = order_number + style +
  // size, so several sizes of the same order arrive as separate groups. Collapse
  // them into one order tab per (order_number, style), each holding its sizes.
  // The API list is already recency-sorted, so first-seen order = most recent,
  // and its sizes stay in recency order too. Purely a UI regroup — no data change.
  //
  // Declared BEFORE any early return (loading/error) so the hook order stays
  // stable across renders; it guards on `data` internally rather than being
  // skipped while loading (Rules of Hooks).
  const orders = React.useMemo(() => {
    if (!data) return [];

    // One serial grid per order (size), most-recent first. Fall back to the
    // legacy flat active_order + garments_grid as a single synthetic group.
    const order_groups = data.order_groups ?? [];
    const groups =
      order_groups.length > 0
        ? order_groups
        : data.active_order
          ? [
              {
                order_number: data.active_order.order_number,
                style: data.active_order.style,
                size: "",
                last_activity_at: "",
                garments_grid: data.garments_grid ?? [],
              },
            ]
          : [];

    const byKey = new Map<
      string,
      { orderNumber: string; style: string; sizes: typeof groups }
    >();
    for (const g of groups) {
      const key = `${g.order_number}__${g.style}`;
      const entry = byKey.get(key);
      if (entry) {
        entry.sizes.push(g);
      } else {
        byKey.set(key, {
          orderNumber: g.order_number,
          style: g.style,
          sizes: [g],
        });
      }
    }
    return Array.from(byKey.values());
  }, [data]);

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

  // pass_rate / dhu are still returned by the API but no longer surfaced as tiles.
  const { line } = data;

  // Clamp both indices so a shrinking list never dangles.
  const selectedOrder = orders[selectedOrderIdx] ?? orders[0];
  const sizesOfSelected = selectedOrder?.sizes ?? [];
  const sizeIdx = Math.min(selectedSizeIdx, Math.max(sizesOfSelected.length - 1, 0));
  const selectedGroup = sizesOfSelected[sizeIdx] ?? sizesOfSelected[0];

  // Order-scoped tiles (all sizes of the selected order tab):
  //   Total Input  = serials that passed sewing QC (every pipeline serial),
  //   Total Output = serials that passed finishing QC,
  //   Total Rework = serials sent to finishing rework/fail.
  const orderCells: DualSerialCell[] = selectedOrder
    ? selectedOrder.sizes.flatMap((s) => s.garments_grid)
    : [];
  const totalInput = orderCells.filter(
    (c) => c.sewing_status === "sewing_qc_pass"
  ).length;
  const totalOutput = orderCells.filter(
    (c) => c.finishing_status === "finishing_qc_pass"
  ).length;
  const totalRework = orderCells.filter(
    (c) => c.finishing_status === "finishing_qc_rework"
  ).length;

  // Select an order tab and reset the size to its first (most-recent) pill.
  const selectOrder = (idx: number) => {
    setSelectedOrderIdx(idx);
    setSelectedSizeIdx(0);
  };

  // Day-wise grouping of the SELECTED order+size's serials: one section per
  // finishing-QC date (most recent first), plus a separate Pending section for
  // serials with no finishing record yet (finishing_checked_date === null).
  const selectedCells: DualSerialCell[] = selectedGroup?.garments_grid ?? [];
  const pendingCells = selectedCells.filter((c) => !c.finishing_checked_date);
  const dateSections = (() => {
    const byDate = new Map<string, DualSerialCell[]>();
    for (const c of selectedCells) {
      const d = c.finishing_checked_date;
      if (!d) continue;
      const bucket = byDate.get(d);
      if (bucket) bucket.push(c);
      else byDate.set(d, [c]);
    }
    // Dates descending (newest day first).
    return Array.from(byDate.entries()).sort((a, b) =>
      a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0
    );
  })();

  /** Passed-finishing / total serials across every size of an order — the
      at-a-glance progress shown on each order tab. */
  const orderProgress = (order: (typeof orders)[number]) => {
    let done = 0;
    let total = 0;
    for (const size of order.sizes) {
      total += size.garments_grid.length;
      done += size.garments_grid.filter(
        (c) => c.finishing_status === "finishing_qc_pass"
      ).length;
    }
    return { done, total };
  };

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

        {/* Stat tiles — scoped to the selected order (summed across its sizes):
            Input = sewing-passed serials, Output = finishing-passed, Rework =
            finishing rework/fail. */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Total Input" value={totalInput} tone="blue" />
          <StatTile label="Total Output" value={totalOutput} tone="green" />
          <StatTile label="Total Rework" value={totalRework} tone="orange" />
        </div>

        {/* Serial Status — each serial is a diagonally split square: top-left =
            sewing-QC status, bottom-right = finishing-QC status. Serials are
            grouped day-wise by their finishing-QC date, with a separate Pending
            section for serials that passed sewing but haven't been finishing-QC'd
            yet. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Serial Status
            </div>
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

          {orders.length === 0 || !selectedOrder || !selectedGroup ? (
            <SerialDualHeatmapGrid
              cells={[]}
              sewingConfig={SEWING_STATUS_CONFIG}
              finishingConfig={FINISHING_STATUS_CONFIG}
              sewingLegendOrder={SEWING_LEGEND_ORDER}
              finishingLegendOrder={FINISHING_LEGEND_ORDER}
              emptyMessage="No orders in the finishing pipeline right now."
            />
          ) : (
            <>
              {/* Level 1 — Order tabs. One tab per (order no + style); selecting
                  one shows only that order's sizes + grid below. ‹ / › page
                  through every active order (and scroll the selection into view),
                  so orders past the visible few stay reachable without relying on
                  drag/scroll. Reveals only when 2+ orders exist. */}
              {orders.length > 1 && (
                <div className="flex items-stretch gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous order"
                    disabled={selectedOrderIdx <= 0}
                    onClick={() => selectOrder(selectedOrderIdx - 1)}
                    className="flex flex-shrink-0 items-center justify-center rounded-lg border border-border bg-card px-1.5 text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex flex-1 gap-2 overflow-x-auto pb-1.5">
                    {orders.map((order, i) => {
                      const { done, total } = orderProgress(order);
                      const isSelected = i === selectedOrderIdx;
                      return (
                        <button
                          key={`${order.orderNumber}__${order.style}`}
                          ref={isSelected ? selectedTabRef : undefined}
                          type="button"
                          onClick={() => selectOrder(i)}
                          title={`${order.orderNumber} · ${order.style}`}
                          className={cn(
                            "flex min-w-[7.5rem] max-w-[12rem] flex-shrink-0 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            isSelected
                              ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/25 dark:border-blue-400/70"
                              : "border-border bg-card hover:border-border hover:bg-muted/50"
                          )}
                        >
                          <span
                            className={cn(
                              "w-full truncate text-xs font-semibold",
                              isSelected
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-foreground"
                            )}
                          >
                            {order.orderNumber}
                          </span>
                          <span className="w-full truncate text-[11px] text-muted-foreground">
                            {order.style}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                              isSelected
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {done}/{total} done
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    aria-label="Next order"
                    disabled={selectedOrderIdx >= orders.length - 1}
                    onClick={() => selectOrder(selectedOrderIdx + 1)}
                    className="flex flex-shrink-0 items-center justify-center rounded-lg border border-border bg-card px-1.5 text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Level 2 — Size pills for the selected order only. The "done"
                  numerator = serials that passed finishing QC. Shown only when
                  the selected order has 2+ sizes. */}
              {sizesOfSelected.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {sizesOfSelected.map((group, i) => {
                    const done = group.garments_grid.filter(
                      (c) => c.finishing_status === "finishing_qc_pass"
                    ).length;
                    const total = group.garments_grid.length;
                    const isSelected = i === sizeIdx;
                    return (
                      <button
                        key={`${group.order_number}-${group.size}-${i}`}
                        type="button"
                        onClick={() => setSelectedSizeIdx(i)}
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
                          {group.size ? group.size : "—"}
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

              {/* One shared legend for the whole selected order/size, then the
                  serials split into day-wise sections (by finishing-QC date, most
                  recent first) plus a separate Pending section. Counts reflect the
                  selected order/size. */}
              <SerialDualHeatmapLegend
                cells={selectedCells}
                sewingConfig={SEWING_STATUS_CONFIG}
                finishingConfig={FINISHING_STATUS_CONFIG}
                sewingLegendOrder={SEWING_LEGEND_ORDER}
                finishingLegendOrder={FINISHING_LEGEND_ORDER}
              />

              <div className="space-y-3">
                {dateSections.length === 0 && pendingCells.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No serials for this order yet.
                  </p>
                )}

                {/* One section per finishing-QC date (newest first). */}
                {dateSections.map(([date, dateCells]) => (
                  <div key={date} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {formatHeaderDate(date)}
                      </span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {dateCells.length}
                      </span>
                    </div>
                    <SerialDualHeatmapGrid
                      cells={dateCells}
                      sewingConfig={SEWING_STATUS_CONFIG}
                      finishingConfig={FINISHING_STATUS_CONFIG}
                      sewingLegendOrder={SEWING_LEGEND_ORDER}
                      finishingLegendOrder={FINISHING_LEGEND_ORDER}
                      showLegend={false}
                      onSelect={onSerialSelect}
                    />
                  </div>
                ))}

                {/* Pending — serials not yet finishing-QC'd. */}
                {pendingCells.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Pending
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        not yet finishing-QC&apos;d
                      </span>
                      <span className="rounded-full bg-slate-400/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                        {pendingCells.length}
                      </span>
                    </div>
                    <SerialDualHeatmapGrid
                      cells={pendingCells}
                      sewingConfig={SEWING_STATUS_CONFIG}
                      finishingConfig={FINISHING_STATUS_CONFIG}
                      sewingLegendOrder={SEWING_LEGEND_ORDER}
                      finishingLegendOrder={FINISHING_LEGEND_ORDER}
                      showLegend={false}
                      onSelect={onSerialSelect}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

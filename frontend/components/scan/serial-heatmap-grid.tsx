"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** One garment cell in a serial-status grid. */
export interface SerialCell {
  sequence_number: number;
  tracking_code: string;
  status: string;
}

/** Visual config for a single status value: a coloured square + legend swatch. */
export interface SerialStatusStyle {
  /** Tailwind classes for the numbered square (background + text). */
  box: string;
  /** Tailwind classes for the small legend swatch. */
  dot: string;
  /** Human-readable label used in the cell tooltip and legend. */
  label: string;
}

/** Maps each `cell.status` string to its visual style. */
export type SerialStatusConfig = Record<string, SerialStatusStyle>;

/** One compact garment cell — small rounded square with its serial number,
    coloured by status. Shared visual language across the assembly-tracking and
    sewing-QC daily summaries (originally the kiosk heatmap's GarmentBox). */
function SerialBox({
  cell,
  style,
}: {
  cell: SerialCell;
  style: SerialStatusStyle;
}) {
  return (
    <div
      className={cn(
        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums transition-transform hover:scale-110",
        style.box
      )}
      title={`#${cell.sequence_number} · ${style.label} · ${cell.tracking_code}`}
    >
      {cell.sequence_number}
    </div>
  );
}

/**
 * Serial-status heatmap grid: a wrap of small numbered squares coloured by
 * status, plus a legend showing the count per status. Height is bounded and the
 * grid scrolls internally so a long list never expands the page or distorts the
 * surrounding column layout.
 *
 * Callers supply their own `statusConfig` (status string -> colour/label), so the
 * same renderer drives both the 2-status assembly grid and the 3-status sewing-QC
 * grid. The legend lists the statuses in `legendOrder` (defaults to config order);
 * a status with no cells still shows with a count of 0.
 */
export function SerialHeatmapGrid({
  cells,
  statusConfig,
  legendOrder,
  emptyMessage = "No garments to show.",
}: {
  cells: SerialCell[];
  statusConfig: SerialStatusConfig;
  legendOrder?: string[];
  emptyMessage?: string;
}) {
  const order = legendOrder ?? Object.keys(statusConfig);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const key of order) c[key] = 0;
    for (const cell of cells) {
      if (cell.status in c) c[cell.status] = (c[cell.status] ?? 0) + 1;
    }
    return c;
  }, [cells, order]);

  /* Fall back to the first configured status's style for any unmapped status, so a
     cell always renders a square rather than crashing on a missing key. */
  const fallbackStyle: SerialStatusStyle =
    statusConfig[order[0] ?? ""] ??
    Object.values(statusConfig)[0] ?? {
      box: "bg-gray-400 text-white",
      dot: "bg-gray-400",
      label: "Unknown",
    };

  if (cells.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {/* Legend + per-status counts */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {order.map((key) => {
          const style = statusConfig[key];
          if (!style) return null;
          return (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", style.dot)} />
              {style.label}
              <span className="font-semibold tabular-nums text-foreground">
                {counts[key]}
              </span>
            </span>
          );
        })}
      </div>
      {/* Grid of serial squares (scrolls internally) */}
      <div className="max-h-[340px] overflow-y-auto rounded-lg border bg-card/40 p-2">
        <div className="flex flex-wrap gap-1">
          {cells.map((cell) => {
            const style = statusConfig[cell.status] ?? fallbackStyle;
            return (
              <SerialBox key={cell.tracking_code} cell={cell} style={style} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

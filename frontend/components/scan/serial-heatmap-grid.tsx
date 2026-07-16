"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    sewing-QC daily summaries (originally the kiosk heatmap's GarmentBox).

    Hovering (desktop) or tapping (touch) the square opens an interactive popover
    with the sequence number, status label, and tracking code + a copy button —
    replacing the old non-interactive native `title` tooltip. */
function SerialBox({
  cell,
  style,
}: {
  cell: SerialCell;
  style: SerialStatusStyle;
}) {
  const [open, setOpen] = React.useState(false);

  // Delay closing on mouse-leave so the pointer can travel from the square into
  // the popover to click Copy without it vanishing (the classic hover-gap). On
  // touch there's no hover — tap toggles open and an outside tap/Escape closes it
  // via Radix's onOpenChange, so it stays open until tapped elsewhere.
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [cancelClose]);
  React.useEffect(() => cancelClose, [cancelClose]);

  const copy = () => {
    navigator.clipboard.writeText(cell.tracking_code);
    toast.success("Copied " + cell.tracking_code);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          className={cn(
            "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums transition-transform hover:scale-110",
            style.box
          )}
        >
          {cell.sequence_number}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-auto p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="space-y-1.5 text-xs">
          <div className="font-semibold">
            #{cell.sequence_number} · {style.label}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copy}
              title="Copy tracking code"
              className="font-mono hover:underline"
            >
              {cell.tracking_code}
            </button>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy tracking code"
              title="Copy tracking code"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
  scrollable = true,
}: {
  cells: SerialCell[];
  statusConfig: SerialStatusConfig;
  legendOrder?: string[];
  emptyMessage?: string;
  /** When false, the grid renders at natural height with no internal scroll —
      used when an outer container owns the scrolling (e.g. the multi-group
      assembly summary), to avoid nested double-scrollbars. Defaults to true so
      existing single-grid callers keep their bounded, internally-scrolling box. */
  scrollable?: boolean;
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
      {/* Grid of serial squares (scrolls internally unless an outer container
          owns scrolling — see `scrollable`). */}
      <div
        className={cn(
          "rounded-lg border bg-card/40 p-2",
          scrollable && "max-h-[340px] overflow-y-auto"
        )}
      >
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

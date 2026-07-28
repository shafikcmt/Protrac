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

/** One garment cell carrying BOTH its sewing- and finishing-QC status. */
export interface DualSerialCell {
  sequence_number: number;
  tracking_code: string;
  sewing_status: string;
  finishing_status: string;
  /** Local date (YYYY-MM-DD) of the latest finishing-QC record, or null when the
      serial is still pending finishing. Used for day-wise grouping. */
  finishing_checked_date?: string | null;
}

/** Visual config for a single status value: fill colour + legend swatch + label. */
export interface DualStatusStyle {
  /** Tailwind background class for the serial box + its legend swatch. */
  fill: string;
  /** Tailwind background class for the small legend swatch. */
  dot: string;
  /** Human-readable label used in the popover + legend. */
  label: string;
  /** Box/swatch shape. "square" = a serial still pending finishing (awaiting
      finishing QC); "circle" = a serial that has been finishing-QC'd. Defaults to
      "circle". Encodes stage at a glance, independent of the fill colour. */
  shape?: "square" | "circle";
}

/** Maps each status string (per axis) to its visual style. */
export type DualStatusConfig = Record<string, DualStatusStyle>;

/** A neutral fallback so an unmapped status still renders a box. */
const FALLBACK_STYLE: DualStatusStyle = {
  fill: "bg-gray-300 dark:bg-gray-600",
  dot: "bg-gray-400",
  label: "Unknown",
  shape: "square",
};

/** Tailwind rounding for each box/swatch shape. */
const SHAPE_CLASS: Record<NonNullable<DualStatusStyle["shape"]>, string> = {
  square: "rounded-[5px]",
  circle: "rounded-full",
};

/** One compact garment cell — a solid box whose SHAPE encodes finishing stage
    (square = pending finishing, circle = finishing-QC'd) and whose COLOUR encodes
    the result (green = pass/pending, orange = rework). Hover (desktop) / tap
    (touch) opens a popover spelling out both sewing + finishing status, the
    tracking code, and a copy button + optional click-to-fill. */
function DualSerialBox({
  cell,
  sewingStyle,
  finishingStyle,
  onSelect,
}: {
  cell: DualSerialCell;
  sewingStyle: DualStatusStyle;
  finishingStyle: DualStatusStyle;
  onSelect?: (trackingCode: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

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
          onClick={() => onSelect?.(cell.tracking_code)}
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          title={onSelect ? "Click to fill the Tracking Code field" : undefined}
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center text-[11px] font-semibold tabular-nums text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            finishingStyle.fill,
            SHAPE_CLASS[finishingStyle.shape ?? "circle"]
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
          <div className="font-semibold">#{cell.sequence_number}</div>
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", sewingStyle.dot)} />
            <span className="text-muted-foreground">Sewing:</span>
            <span className="font-medium">{sewingStyle.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", finishingStyle.dot)} />
            <span className="text-muted-foreground">Finishing:</span>
            <span className="font-medium">{finishingStyle.label}</span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
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
 * Two-axis legend for the dual heatmap: a Sewing row and a Finishing row, each a
 * set of chips (colour dot + label + count) computed over `cells`. Exported so a
 * caller can render ONE shared legend above several headerless grids (e.g. the
 * finishing card's day-wise sections) instead of repeating it per section.
 */
export function SerialDualHeatmapLegend({
  cells,
  sewingConfig,
  finishingConfig,
  sewingLegendOrder,
  finishingLegendOrder,
}: {
  cells: DualSerialCell[];
  sewingConfig: DualStatusConfig;
  finishingConfig: DualStatusConfig;
  sewingLegendOrder?: string[];
  finishingLegendOrder?: string[];
}) {
  const sewingOrder = sewingLegendOrder ?? Object.keys(sewingConfig);
  const finishingOrder = finishingLegendOrder ?? Object.keys(finishingConfig);

  const { sewingCounts, finishingCounts } = React.useMemo(() => {
    const s: Record<string, number> = {};
    const f: Record<string, number> = {};
    for (const key of sewingOrder) s[key] = 0;
    for (const key of finishingOrder) f[key] = 0;
    for (const cell of cells) {
      if (cell.sewing_status in s)
        s[cell.sewing_status] = (s[cell.sewing_status] ?? 0) + 1;
      if (cell.finishing_status in f)
        f[cell.finishing_status] = (f[cell.finishing_status] ?? 0) + 1;
    }
    return { sewingCounts: s, finishingCounts: f };
  }, [cells, sewingOrder, finishingOrder]);

  const renderLegend = (
    heading: string,
    order: string[],
    config: DualStatusConfig,
    counts: Record<string, number>
  ) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-14 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </span>
      {order.map((key) => {
        const style = config[key];
        if (!style) return null;
        // Swatch mirrors the grid shape (square = pending, circle = finishing-QC'd)
        // so two same-colour entries (e.g. green Pending vs green Pass) stay
        // distinguishable in the legend.
        const swatchShape =
          style.shape === "square" ? "rounded-[2px]" : "rounded-full";
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <span className={cn("h-2 w-2", swatchShape, style.dot)} />
            {style.label}
            <span className="font-semibold tabular-nums text-foreground">
              {counts[key]}
            </span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-1.5">
      {renderLegend("Sewing", sewingOrder, sewingConfig, sewingCounts)}
      {renderLegend("Finishing", finishingOrder, finishingConfig, finishingCounts)}
    </div>
  );
}

/**
 * Dual-status serial heatmap: a wrap of small numbered squares, each split
 * diagonally to show a serial's sewing-QC status (top-left) and finishing-QC
 * status (bottom-right) at once. Height is bounded and the grid scrolls
 * internally so a long list never expands the page.
 *
 * Callers supply a `sewingConfig` and `finishingConfig` (status string -> style)
 * plus optional legend orders. Purpose-built for the finishing-QC daily summary;
 * the single-status `SerialHeatmapGrid` is untouched.
 *
 * `showLegend` (default true) renders the two-axis legend above the grid; set it
 * false when an outer caller already shows one shared legend (see the day-wise
 * sections in the finishing card).
 */
export function SerialDualHeatmapGrid({
  cells,
  sewingConfig,
  finishingConfig,
  sewingLegendOrder,
  finishingLegendOrder,
  emptyMessage = "No garments to show.",
  showLegend = true,
  onSelect,
}: {
  cells: DualSerialCell[];
  sewingConfig: DualStatusConfig;
  finishingConfig: DualStatusConfig;
  sewingLegendOrder?: string[];
  finishingLegendOrder?: string[];
  emptyMessage?: string;
  /** Render the two-axis legend above the grid (default true). */
  showLegend?: boolean;
  /** When set, clicking a square fills the caller's Tracking Code input. */
  onSelect?: (trackingCode: string) => void;
}) {
  if (cells.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2.5">
      {showLegend && (
        <SerialDualHeatmapLegend
          cells={cells}
          sewingConfig={sewingConfig}
          finishingConfig={finishingConfig}
          sewingLegendOrder={sewingLegendOrder}
          finishingLegendOrder={finishingLegendOrder}
        />
      )}
      {/* Grid of split serial squares (scrolls internally). */}
      <div className="max-h-[340px] overflow-y-auto rounded-lg border bg-card/40 p-2.5">
        <div className="flex flex-wrap gap-1.5">
          {cells.map((cell) => (
            <DualSerialBox
              key={cell.tracking_code}
              cell={cell}
              sewingStyle={sewingConfig[cell.sewing_status] ?? FALLBACK_STYLE}
              finishingStyle={
                finishingConfig[cell.finishing_status] ?? FALLBACK_STYLE
              }
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

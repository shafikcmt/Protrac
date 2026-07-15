"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

/** One hourly row: per-hour target vs actual. */
export type TargetVsActualRow = {
  hour: number;
  target: number;
  actual: number;
};

/**
 * Plain, compact, theme-aware hourly "Target vs Actual" card — 3 columns
 * (Hour, Target, Actual) plus a Total row. No badges, no colour-coding, no accent
 * colours: every value renders in the same neutral text style. All colours come
 * from shadcn semantic tokens (card / muted / border / foreground), so it flips
 * correctly between light and dark mode. Mirrors the "Hourly · Bundles vs
 * Assembly" card's quiet look.
 */
export function TargetVsActualCard({
  rows,
  title = "Target vs Actual",
}: {
  rows: TargetVsActualRow[];
  title?: string;
}) {
  // Running cumulative is kept here (reusable) even though the Cum columns are no
  // longer rendered; the Total row uses the final sums.
  const computed = React.useMemo(() => {
    let cumT = 0;
    let cumA = 0;
    const out = rows.map((r) => {
      cumT += r.target ?? 0;
      cumA += r.actual ?? 0;
      return { ...r, cumTarget: cumT, cumActual: cumA };
    });
    return { out, totalTarget: cumT, totalActual: cumA };
  }, [rows]);

  return (
    <Card className="py-3 gap-2">
      <CardHeader className="px-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] tabular-nums">
            <thead>
              <tr className="text-[9px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-0.5 text-left font-medium">Hour</th>
                <th className="px-2 py-0.5 text-right font-medium">Target</th>
                <th className="px-2 py-0.5 text-right font-medium">Actual</th>
              </tr>
            </thead>
            <tbody>
              {computed.out.map((r) => (
                <tr key={r.hour} className="border-t border-border/50">
                  <td className="px-2 py-0.5 text-left">H{r.hour}</td>
                  <td className="px-2 py-0.5 text-right">{r.target || "–"}</td>
                  <td className="px-2 py-0.5 text-right">{r.actual || "–"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/40 font-medium">
                <td className="px-2 py-0.5 text-left">Total</td>
                <td className="px-2 py-0.5 text-right">
                  {computed.totalTarget || "–"}
                </td>
                <td className="px-2 py-0.5 text-right">
                  {computed.totalActual || "–"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Factory, Check, Shirt } from "lucide-react";
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

/* Part-name colour coding per spec, with a neutral fallback. */
const PART_COLORS: Record<
  string,
  { badge: string; bar: string }
> = {
  BACK: { badge: "bg-blue-500/12 text-blue-700 dark:text-blue-300 ring-blue-500/30", bar: "#3b82f6" },
  COLLAR: { badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30", bar: "#10b981" },
  FRONT: { badge: "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/30", bar: "#8b5cf6" },
  SLEEVE: { badge: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/30", bar: "#f59e0b" },
};
const FALLBACK_COLOR = {
  badge: "bg-muted text-muted-foreground ring-border",
  bar: "#94a3b8",
};
function partColor(name: string) {
  return PART_COLORS[name?.toUpperCase()] ?? FALLBACK_COLOR;
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s summary
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s summary
          </CardTitle>
        </CardHeader>
        <CardContent>
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
    parts_summary,
    total_parts_issued,
    parts_issued_count,
    parts_total_count,
    recent_garments,
    hourly = [],
  } = data;

  const hasParts = parts_summary.length > 0;
  // A LineTarget for today yields a full hour grid (H1..Hn) even before any scans;
  // the table renders whenever those rows exist. Only a line with no LineTarget at
  // all comes back with an empty array, which shows the fallback instead. This
  // mirrors the sewing v3 "Parts-wise Products WIP" table, which always renders the
  // whole grid and dashes out empty hours rather than hiding.
  const hasLineTarget = hourly.length > 0;
  const maxIssued = hasParts
    ? Math.max(1, ...parts_summary.map((p) => p.issued_today))
    : 1;

  const moreCount = total_assemble - recent_garments.length;

  return (
    <Card>
      <CardHeader>
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

      <CardContent className="space-y-4">
        {/* Line chip */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/12 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-500/30 dark:text-blue-300">
            <Factory className="h-3.5 w-3.5" />
            {line}
          </span>
        </div>

        {/* 2 stat boxes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Box 1 — Total assemble */}
          <div className="rounded-lg border bg-card/40 p-3">
            <div className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {total_assemble}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Total assemble
            </div>
            <div className="text-xs text-muted-foreground">garments today</div>
          </div>

          {/* Box 2 — Total parts */}
          <div className="rounded-lg border bg-card/40 p-3">
            <div className="text-sm font-bold tabular-nums">
              {parts_issued_count}/{parts_total_count}
              <span className="text-muted-foreground font-medium">
                {" "}
                · {total_parts_issued} pcs
              </span>
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Total parts
            </div>
            {hasParts && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {parts_summary.map((p) => {
                  const issued = p.issued_today > 0;
                  return (
                    <span
                      key={p.part_name}
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        issued
                          ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground ring-border"
                      )}
                    >
                      {issued && <Check className="h-2.5 w-2.5" />}
                      {p.part_name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Part breakdown list */}
        {hasParts ? (
          <div className="space-y-2">
            {parts_summary.map((p) => {
              const tone = partColor(p.part_name);
              const pct = Math.round((p.issued_today / maxIssued) * 100);
              return (
                <div key={p.part_name} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "shrink-0 w-20 rounded-md px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset",
                      tone.badge
                    )}
                  >
                    {p.part_name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, background: tone.bar }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {p.issued_today} pcs
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No parts data yet for today
          </p>
        )}

        {/* Garment issued box */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Shirt className="h-3.5 w-3.5" />
                Garments issued today
              </div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {total_assemble}
              </div>
            </div>

            <div className="min-w-0 text-right">
              {recent_garments.map((g) => (
                <div
                  key={g.id}
                  className="truncate font-mono text-[11px] text-emerald-800 dark:text-emerald-200"
                >
                  …{g.id.slice(-6)} · {g.time}
                </div>
              ))}
              {moreCount > 0 && (
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  +{moreCount} more
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hourly: bundles received vs assembly complete. Always renders the full
            hour grid (H1..Hn) when the line has a daily target — hours with no scans
            yet show a "–" placeholder, exactly like the sewing v3 WIP table. Only a
            line with no LineTarget at all falls back to a message. */}
        {hasLineTarget ? (
          <div className="rounded-lg border bg-card/40">
            <div className="flex items-center gap-1.5 border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Hourly · bundles vs assembly
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 text-left font-medium">Hour</th>
                    <th className="px-3 py-1.5 text-right font-medium">Target</th>
                    <th className="px-3 py-1.5 text-right font-medium">Bundles</th>
                    <th className="px-3 py-1.5 text-right font-medium">Assembly</th>
                  </tr>
                </thead>
                <tbody>
                  {hourly.map((h) => (
                    <tr key={h.hour} className="border-t border-border/50">
                      <td className="px-3 py-1.5 text-left font-medium">H{h.hour}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {h.target || "–"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {h.bundles_received || "–"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {h.assembly_complete || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className="px-3 py-1.5 text-left">Total</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {hourly.reduce((s, h) => s + (h.target || 0), 0) || "–"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-blue-600 dark:text-blue-400">
                      {hourly.reduce((s, h) => s + h.bundles_received, 0) || "–"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-emerald-600 dark:text-emerald-400">
                      {hourly.reduce((s, h) => s + h.assembly_complete, 0) || "–"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
            No daily target set for today
          </div>
        )}
      </CardContent>
    </Card>
  );
}

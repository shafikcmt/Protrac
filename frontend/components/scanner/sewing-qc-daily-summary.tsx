"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiHooks } from "@/lib/api";

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
  const date = React.useMemo(() => getDhakaToday(), []);

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
    total_fail,
    dhu,
    top_defects = [],
  } = data;

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
          <StatTile label="Total Fail" value={total_fail} tone="red" />
          <StatTile label="DHU %" value={dhu.toFixed(2)} tone="blue" />
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

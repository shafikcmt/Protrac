"use client";

import * as React from "react";
import { apiHooks } from "@/lib/api";
import {
  TargetVsActualCard,
  type TargetVsActualRow,
} from "@/components/scan/target-vs-actual-card";

/** Today's date as YYYY-MM-DD in Dhaka time, independent of the browser tz. */
function getDhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Sewing-QC "Target vs Actual" hourly card. Reads the same daily-summary endpoint
 * as the QC summary card (React Query dedupes the request), and feeds its
 * `hourly` block — where Actual = sewing-QC pass count per hour — into the shared
 * presentational card. Falls back to a default 8-hour grid (target 0) server-side
 * when no daily target is set, so the card always renders.
 */
export function SewingQCTargetVsActual() {
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

  const { data, isLoading } = apiHooks.useGet(
    "/api/tracking/sewing-qc/daily-summary/",
    { queries: { date } },
    { refetchOnWindowFocus: false, refetchInterval: 30000 }
  );

  const rows: TargetVsActualRow[] = React.useMemo(
    () =>
      (data?.hourly ?? []).map((h) => ({
        hour: h.hour,
        target: h.target,
        actual: h.actual,
      })),
    [data?.hourly]
  );

  // Nothing to show until the first payload arrives; the summary card beside this
  // one already renders its own loading skeleton, so keep this compact.
  if (isLoading && rows.length === 0) {
    return (
      <div className="h-40 animate-pulse rounded-xl border bg-muted" />
    );
  }

  if (rows.length === 0) return null;

  return <TargetVsActualCard rows={rows} />;
}

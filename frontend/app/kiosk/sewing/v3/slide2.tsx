"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PartWipRow = { part: string; target: number; hours: number[] };

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);
  return matches;
}

const toNum = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const padHours = (arr: unknown, len: number) =>
  Array.from({ length: len }).map((_, i) => toNum((arr as number[] | undefined)?.[i], 0));

export default function SlideTwo({
  partsWip,
  assembleTotals,
  outputTotals,
  assembleTargetPerHour,
  outputTargetPerHour,
  hourCount,
}: {
  partsWip: PartWipRow[];
  assembleTotals: number[];
  outputTotals: number[];
  assembleTargetPerHour: number;
  outputTargetPerHour: number;
  hourCount: number;
}) {
  const compactH = useMediaQuery("(max-height: 860px)");
  const compact = compactH || hourCount >= 9;

  const assemble = padHours(assembleTotals, hourCount);
  const output = padHours(outputTotals, hourCount);

  const isSuccess = (value: number, target: number) =>
    Number(target) > 0 && Number(value) >= Number(target);

  const getPct = (value: number, target: number) => {
    if (target <= 0) return 0;
    return Math.max(0, Math.min(100, (value / target) * 100));
  };

  const rowCount = partsWip.length + 2;

  const rowHeightClass =
    rowCount <= 6
      ? compact
        ? "h-[48px]"
        : "h-[56px]"
      : rowCount <= 8
      ? compact
        ? "h-[44px]"
        : "h-[50px]"
      : compact
      ? "h-[40px]"
      : "h-[46px]";

  const headerHeightClass = compact ? "h-[42px]" : "h-[48px]";
  const headText = compact ? "text-[14px]" : "text-[16px]";
  const partText = compact ? "text-[15px]" : "text-[17px]";
  const targetText = compact ? "text-[15px]" : "text-[17px]";
  const valueText = compact ? "text-[17px]" : "text-[19px]";
  const cellOuter = compact ? "px-1 py-0.5" : "px-2 py-1.5";
  const labelPad = "px-5";

  const valueBoxClass = (success: boolean) =>
    cn(
      "relative overflow-hidden rounded-[14px] border",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.25)]",
      success
        ? "border-emerald-400/30 bg-[linear-gradient(180deg,rgba(5,150,105,0.28),rgba(4,120,87,0.28))]"
        : "border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.7),rgba(15,23,42,0.7))]"
    );

  const valueFillClass = (success: boolean) =>
    cn(
      "absolute inset-y-0 left-0 rounded-[14px] transition-[width] duration-700 ease-out",
      success
        ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.55),rgba(5,150,105,0.70))] shadow-[0_0_10px_rgba(16,185,129,0.4)]"
        : "bg-[linear-gradient(90deg,rgba(124,58,237,0.50),rgba(59,130,246,0.30))]"
    );

  const valueTextClass = (success: boolean) =>
    cn(
      "relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums tracking-[0.01em] kiosk-data",
      valueText,
      success ? "text-emerald-300" : "text-slate-200"
    );

  const totalBoxClass =
    "relative overflow-hidden rounded-[14px] border border-amber-400/30 bg-[linear-gradient(180deg,rgba(146,64,14,0.30),rgba(120,53,10,0.30))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_16px_rgba(0,0,0,0.24)]";

  const totalFillClass =
    "absolute inset-y-0 left-0 rounded-[14px] transition-[width] duration-700 ease-out bg-[linear-gradient(90deg,rgba(245,158,11,0.35)_0%,rgba(251,146,60,0.55)_50%,rgba(168,85,247,0.28)_100%)] shadow-[0_0_16px_rgba(245,158,11,0.25)]";

  const totalValueClass = cn(
    "relative z-10 flex h-full items-center justify-center font-black tabular-nums tracking-[-0.01em] text-amber-300 kiosk-data",
    compact ? "text-[28px]" : "text-[30px]"
  );

  return (
    <div className={cn("h-full w-full", compactH ? "p-2" : "p-2.5")}>
      {/* Card container */}
      <div
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: "var(--kiosk-card, rgba(8,15,30,0.97))",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Title */}
        <div className="relative shrink-0 flex items-center px-5 py-3 border-b border-white/8">
          <h2
            className="kiosk-header font-bold uppercase text-white"
            style={{ fontSize: compact ? "20px" : "24px", letterSpacing: "0.1em" }}
          >
            Parts-wise Products WIP ({hourCount} Hours)
          </h2>
        </div>

        {/* Rainbow strip */}
        <div
          className="h-[3px] w-full shrink-0"
          style={{
            background:
              "linear-gradient(90deg, #1E3A8A 0%, #7C3AED 25%, #F59E0B 50%, #06B6D4 75%, #065F46 100%)",
          }}
        />

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <table className="h-full w-full table-fixed border-collapse kiosk-data" style={{ color: "var(--kiosk-text, #CBD5E1)" }}>
            <colgroup>
              <col style={{ width: compact ? "190px" : "220px" }} />
              <col style={{ width: compact ? "94px" : "110px" }} />
              {Array.from({ length: hourCount }).map((_, i) => (
                <col key={i} style={{ width: compact ? "108px" : "122px" }} />
              ))}
              <col style={{ width: compact ? "116px" : "132px" }} />
            </colgroup>

            <thead>
              <tr className={headerHeightClass}>
                {/* Parts column — deep blue */}
                <th
                  className={cn(
                    "border-r border-white/10 text-left font-bold uppercase text-white",
                    headText,
                    labelPad
                  )}
                  style={{ letterSpacing: "0.1em", background: "#1E3A8A" }}
                >
                  Parts
                </th>

                {/* Target column — emerald */}
                <th
                  className={cn(
                    "border-r border-white/10 text-center font-bold uppercase text-white",
                    headText
                  )}
                  style={{ letterSpacing: "0.1em", background: "#065F46" }}
                >
                  Target
                </th>

                {/* Hourly columns — purple */}
                {Array.from({ length: hourCount }).map((_, i) => (
                  <th
                    key={i}
                    className={cn(
                      "border-r border-white/10 text-center font-bold uppercase text-white",
                      headText
                    )}
                    style={{ letterSpacing: "0.08em", background: "#6D28D9" }}
                  >
                    H{i + 1}
                  </th>
                ))}

                {/* G.Total column — amber */}
                <th
                  className={cn("text-center font-bold uppercase text-white", headText)}
                  style={{ letterSpacing: "0.1em", background: "#92400E" }}
                >
                  G.Total
                </th>
              </tr>
            </thead>

            <tbody>
              {partsWip.map((p, rowIdx) => {
                const rowTotal = Array.from({ length: hourCount }).reduce<number>(
                  (sum, _, i) => sum + Number(p.hours?.[i] ?? 0),
                  0
                );
                const dayTarget = (Number(p.target) || 0) * hourCount;
                const gtPct = getPct(rowTotal, dayTarget);
                const zebra = rowIdx % 2 === 0;

                return (
                  <tr
                    key={p.part}
                    className={rowHeightClass}
                    style={{ background: zebra ? "var(--kiosk-row-odd, #0F1629)" : "var(--kiosk-row-even, #151C35)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--kiosk-row-hover, #1E2B45)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        zebra ? "var(--kiosk-row-odd, #0F1629)" : "var(--kiosk-row-even, #151C35)";
                    }}
                  >
                    {/* Part name */}
                    <td
                      className={cn(
                        "border-b border-white/8 border-r border-white/8",
                        labelPad
                      )}
                      style={{ background: "rgba(30,58,138,0.35)", borderLeft: "3px solid #3B82F6" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-[3px] rounded-full bg-[linear-gradient(180deg,#60a5fa,#22d3ee)]" />
                        <div className={cn("truncate font-black text-white kiosk-data", partText)}>
                          {p.part}
                        </div>
                      </div>
                    </td>

                    {/* Target */}
                    <td
                      className="border-b border-white/8 border-r border-white/8"
                      style={{ background: "rgba(6,95,70,0.35)" }}
                    >
                      <div className="flex h-full items-center justify-center">
                        <span className={cn("font-black tabular-nums text-emerald-300 kiosk-data", targetText)}>
                          {p.target ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Hourly cells */}
                    {Array.from({ length: hourCount }).map((_, i) => {
                      const value = Number(p.hours?.[i] ?? 0);
                      const target = Number(p.target) || 0;
                      const pct = getPct(value, target);
                      const success = isSuccess(value, target);

                      return (
                        <td
                          key={i}
                          className={cn("border-b border-white/8", cellOuter)}
                        >
                          {value === 0 ? (
                            <div className="flex h-full items-center justify-center">
                              <span className="text-slate-600 font-bold text-sm">0</span>
                            </div>
                          ) : (
                            <div className={cn(valueBoxClass(success), "my-auto h-[60%]")}>
                              <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                              <div className={valueTextClass(success)}>{value}</div>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* G.Total */}
                    <td
                      className={cn("border-b border-white/8 border-l border-amber-400/20", cellOuter)}
                    >
                      <div className={cn(totalBoxClass, "my-auto h-[60%]")}>
                        <div className={totalFillClass} style={{ width: `${gtPct}%` }} />
                        <div className={totalValueClass}>{rowTotal}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Assemble Total row */}
              <tr
                className={rowHeightClass}
                style={{ background: "var(--kiosk-row-odd, #0D1A30)" }}
              >
                <td
                  className={cn("border-t border-b border-r border-white/10", labelPad)}
                  style={{ background: "rgba(30,58,138,0.55)" }}
                >
                  <div className={cn("font-black text-white kiosk-data", partText)}>
                    Assemble Total
                  </div>
                </td>

                <td
                  className="border-t border-b border-r border-white/10"
                  style={{ background: "rgba(6,95,70,0.55)" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className={cn("font-black tabular-nums text-emerald-300 kiosk-data", targetText)}>
                      {assembleTargetPerHour || "—"}
                    </span>
                  </div>
                </td>

                {assemble.map((t, i) => {
                  const pct = getPct(t, assembleTargetPerHour);
                  return (
                    <td
                      key={i}
                      className={cn("border-t border-b border-white/10", cellOuter)}
                    >
                      <div className={cn(valueBoxClass(false), "my-auto h-[60%]")}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-[14px] bg-[linear-gradient(90deg,rgba(124,58,237,0.55),rgba(99,102,241,0.30))]"
                          style={{ width: `${pct}%` }}
                        />
                        <div
                          className={cn(
                            "relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums text-slate-200 kiosk-data",
                            valueText
                          )}
                        >
                          {t}
                        </div>
                      </div>
                    </td>
                  );
                })}

                <td className={cn("border-t border-b border-l border-amber-400/20", cellOuter)}>
                  {(() => {
                    const total = assemble.reduce<number>((a, b) => a + Number(b ?? 0), 0);
                    const pct = getPct(total, (Number(assembleTargetPerHour) || 0) * hourCount);
                    return (
                      <div className={cn(totalBoxClass, "my-auto h-[60%]")}>
                        <div className={totalFillClass} style={{ width: `${pct}%` }} />
                        <div className={totalValueClass}>{total}</div>
                      </div>
                    );
                  })()}
                </td>
              </tr>

              {/* Output Total row */}
              <tr
                className={rowHeightClass}
                style={{ background: "var(--kiosk-row-even, #0A1525)" }}
              >
                <td
                  className={cn("border-t border-r border-white/10", labelPad)}
                  style={{ background: "rgba(30,58,138,0.45)" }}
                >
                  <div className={cn("font-black text-white kiosk-data", partText)}>
                    Output Total
                  </div>
                </td>

                <td
                  className="border-t border-r border-white/10"
                  style={{ background: "rgba(6,95,70,0.45)" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className={cn("font-black tabular-nums text-emerald-300 kiosk-data", targetText)}>
                      {outputTargetPerHour || "—"}
                    </span>
                  </div>
                </td>

                {output.map((t, i) => {
                  const pct = getPct(t, outputTargetPerHour);
                  const success = isSuccess(t, outputTargetPerHour);
                  return (
                    <td
                      key={i}
                      className={cn("border-t border-white/10", cellOuter)}
                    >
                      <div className={cn(valueBoxClass(success), "my-auto h-[60%]")}>
                        <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                        <div className={valueTextClass(success)}>{t}</div>
                      </div>
                    </td>
                  );
                })}

                <td className={cn("border-t border-l border-amber-400/20", cellOuter)}>
                  {(() => {
                    const total = output.reduce<number>((a, b) => a + Number(b ?? 0), 0);
                    const pct = getPct(total, (Number(outputTargetPerHour) || 0) * hourCount);
                    return (
                      <div className={cn(totalBoxClass, "my-auto h-[60%]")}>
                        <div className={totalFillClass} style={{ width: `${pct}%` }} />
                        <div className={totalValueClass}>{total}</div>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

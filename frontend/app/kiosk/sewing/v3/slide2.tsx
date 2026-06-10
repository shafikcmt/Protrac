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

  /* Row heights — fixed so table has natural height; wrapper centers it vertically */
  const rowHeightClass =
    rowCount <= 6
      ? compact ? "h-[56px]" : "h-[72px]"
      : rowCount <= 8
      ? compact ? "h-[46px]" : "h-[60px]"
      : compact ? "h-[38px]" : "h-[50px]";

  const headerHeightClass = "h-[44px]";
  const cellOuter = compact ? "px-1 py-0.5" : "px-2 py-1.5";
  const labelPad = "px-5";

  /* Cell badge — solid backgrounds for dark mode, overridden in light via CSS */
  const valueBoxClass = (success: boolean) =>
    cn(
      "relative overflow-hidden rounded-lg border",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.25)]",
      success
        ? "kiosk-s2-cell-ok border-emerald-500/40 bg-[linear-gradient(180deg,rgba(5,150,105,0.60),rgba(4,120,87,0.65))]"
        : "kiosk-s2-cell-fail border-indigo-400/30 bg-[linear-gradient(180deg,rgba(79,70,229,0.60),rgba(59,130,246,0.50))]"
    );

  const valueFillClass = (success: boolean) =>
    cn(
      "absolute inset-y-0 left-0 rounded-lg transition-[width] duration-700 ease-out",
      success
        ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.50),rgba(5,150,105,0.65))] shadow-[0_0_10px_rgba(16,185,129,0.4)]"
        : "bg-[linear-gradient(90deg,rgba(124,58,237,0.45),rgba(59,130,246,0.28))]"
    );

  const valueTextClass = (success: boolean) =>
    cn(
      "relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums tracking-[0.01em] kiosk-data text-[1rem]",
      success ? "text-white" : "text-slate-100"
    );

  const totalBoxClass =
    "kiosk-s2-total-box relative overflow-hidden rounded-lg border border-orange-400/40 " +
    "bg-[linear-gradient(180deg,rgba(249,115,22,0.28),rgba(234,88,12,0.38))] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_16px_rgba(0,0,0,0.24)]";

  const totalFillClass =
    "absolute inset-y-0 left-0 rounded-lg transition-[width] duration-700 ease-out " +
    "bg-[linear-gradient(90deg,rgba(245,158,11,0.35)_0%,rgba(251,146,60,0.55)_50%,rgba(168,85,247,0.28)_100%)] " +
    "shadow-[0_0_16px_rgba(245,158,11,0.25)]";

  const totalValueClass =
    "kiosk-s2-total-value relative z-10 flex h-full items-center justify-center " +
    "font-black tabular-nums tracking-[-0.01em] text-amber-300 kiosk-data text-[1.2rem]";

  /* Reusable zero cell */
  const ZeroCell = () => (
    <div className="flex h-full items-center justify-center">
      <span
        className="kiosk-data tabular-nums kiosk-s2-cell-zero"
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--kiosk-text-muted, rgba(255,255,255,0.45))",
        }}
      >
        0
      </span>
    </div>
  );

  return (
    <div className={cn("h-full w-full", compactH ? "p-2" : "p-2.5")}>
      {/* Card container */}
      <div
        className="kiosk-s2-card flex h-full flex-col overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: "var(--kiosk-card, rgba(8,15,30,0.97))",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Title */}
        <div className="relative shrink-0 flex items-center px-5 py-3 border-b border-white/8">
          <h2
            className="kiosk-header uppercase text-white"
            style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.1em" }}
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

        {/*
         * Table wrapper — flex-col justify-center so the table sits at its
         * natural height and is centred vertically; no h-full on <table>.
         */}
        <div className="flex-1 min-h-0 overflow-auto flex flex-col">
          <table
            className="w-full table-fixed border-collapse kiosk-data"
            style={{ color: "var(--kiosk-text, #CBD5E1)" }}
          >
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
                {/* Parts — deep blue */}
                <th
                  className={cn("border-r border-white/10 text-left uppercase text-white", labelPad)}
                  style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.08em", background: "#1E3A8A" }}
                >
                  Parts
                </th>

                {/* Target — emerald */}
                <th
                  className="border-r border-white/10 text-center uppercase text-white"
                  style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.08em", background: "#065F46" }}
                >
                  Target
                </th>

                {/* Hourly — purple */}
                {Array.from({ length: hourCount }).map((_, i) => (
                  <th
                    key={i}
                    className="border-r border-white/10 text-center uppercase text-white"
                    style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.08em", background: "#6D28D9" }}
                  >
                    H{i + 1}
                  </th>
                ))}

                {/* G.Total — amber */}
                <th
                  className="text-center uppercase text-white"
                  style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.08em", background: "#92400E" }}
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
                      className={cn("border-b border-white/8 border-r border-white/8", labelPad)}
                      style={{ background: "rgba(30,58,138,0.35)", borderLeft: "3px solid #3B82F6" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-[3px] rounded-full bg-[linear-gradient(180deg,#60a5fa,#22d3ee)]" />
                        <div className="truncate font-black text-white kiosk-data text-[1.05rem]">
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
                        <span className="font-black tabular-nums text-emerald-300 kiosk-data text-[1.05rem]">
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
                        <td key={i} className={cn("border-b border-white/8", cellOuter)}>
                          {value === 0 ? (
                            <ZeroCell />
                          ) : (
                            <div className={cn(valueBoxClass(success), "mx-auto h-9 min-w-[52px]")}>
                              <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                              <div className={valueTextClass(success)}>{value}</div>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* G.Total */}
                    <td
                      className={cn("kiosk-s2-total-td border-b border-white/8 border-l-2 border-orange-400", cellOuter)}
                      style={{ background: "rgba(249,115,22,0.12)" }}
                    >
                      <div className={cn(totalBoxClass, "mx-auto h-9 min-w-[52px]")}>
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
                  <div className="font-black text-white kiosk-data text-[1.05rem]">
                    Assemble Total
                  </div>
                </td>

                <td
                  className="border-t border-b border-r border-white/10"
                  style={{ background: "rgba(6,95,70,0.55)" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className="font-black tabular-nums text-emerald-300 kiosk-data text-[1.05rem]">
                      {assembleTargetPerHour || "—"}
                    </span>
                  </div>
                </td>

                {assemble.map((t, i) => {
                  const pct = getPct(t, assembleTargetPerHour);
                  return (
                    <td key={i} className={cn("border-t border-b border-white/10", cellOuter)}>
                      {t === 0 ? (
                        <ZeroCell />
                      ) : (
                        <div
                          className={cn(
                            "kiosk-s2-cell-fail relative overflow-hidden rounded-lg border border-indigo-400/30",
                            "bg-[linear-gradient(180deg,rgba(79,70,229,0.60),rgba(59,130,246,0.50))]",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.25)]",
                            "mx-auto h-9 min-w-[52px]"
                          )}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg bg-[linear-gradient(90deg,rgba(124,58,237,0.45),rgba(99,102,241,0.28))]"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums text-slate-100 kiosk-data text-[1rem]">
                            {t}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}

                <td
                  className={cn("kiosk-s2-total-td border-t border-b border-l-2 border-orange-400", cellOuter)}
                  style={{ background: "rgba(249,115,22,0.12)" }}
                >
                  {(() => {
                    const total = assemble.reduce<number>((a, b) => a + Number(b ?? 0), 0);
                    const pct = getPct(total, (Number(assembleTargetPerHour) || 0) * hourCount);
                    return (
                      <div className={cn(totalBoxClass, "mx-auto h-9 min-w-[52px]")}>
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
                  <div className="font-black text-white kiosk-data text-[1.05rem]">
                    Output Total
                  </div>
                </td>

                <td
                  className="border-t border-r border-white/10"
                  style={{ background: "rgba(6,95,70,0.45)" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className="font-black tabular-nums text-emerald-300 kiosk-data text-[1.05rem]">
                      {outputTargetPerHour || "—"}
                    </span>
                  </div>
                </td>

                {output.map((t, i) => {
                  const pct = getPct(t, outputTargetPerHour);
                  const success = isSuccess(t, outputTargetPerHour);
                  return (
                    <td key={i} className={cn("border-t border-white/10", cellOuter)}>
                      {t === 0 ? (
                        <ZeroCell />
                      ) : (
                        <div className={cn(valueBoxClass(success), "mx-auto h-9 min-w-[52px]")}>
                          <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                          <div className={valueTextClass(success)}>{t}</div>
                        </div>
                      )}
                    </td>
                  );
                })}

                <td
                  className={cn("kiosk-s2-total-td border-t border-l-2 border-orange-400", cellOuter)}
                  style={{ background: "rgba(249,115,22,0.12)" }}
                >
                  {(() => {
                    const total = output.reduce<number>((a, b) => a + Number(b ?? 0), 0);
                    const pct = getPct(total, (Number(outputTargetPerHour) || 0) * hourCount);
                    return (
                      <div className={cn(totalBoxClass, "mx-auto h-9 min-w-[52px]")}>
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

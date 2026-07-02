"use client";

import * as React from "react";
import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

type PartWipRow = { part: string; target: number; hours: number[] };

/* Cohesive jewel-tone accent set shared across both quality/WIP slides */
const ACCENT = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
} as const;

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

  /* Data-cell font: 24px on TV/normal, scaled down when compact (≥9 hrs / short
     viewport) so the fixed-width table never overflows. */
  const DATA_FS = compact ? "20px" : "24px";
  /* Pill box dimensions paired to the data font */
  const pillSize = compact ? "mx-auto h-9 min-w-[54px]" : "mx-auto h-11 min-w-[64px]";

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
      ? compact ? "h-[56px]" : "h-[84px]"
      : rowCount <= 8
      ? compact ? "h-[48px]" : "h-[72px]"
      : compact ? "h-[44px]" : "h-[60px]";

  const headerHeightClass = "h-[44px]";
  const cellOuter = compact ? "px-1 py-0.5" : "px-2 py-1.5";
  const labelPad = "px-5";

  /* Cell badge — refined palette: emerald = target met, slate-blue = below */
  const valueBoxClass = (success: boolean) =>
    cn(
      "relative overflow-hidden rounded-xl border ring-1 ring-inset",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_14px_rgba(0,0,0,0.28)]",
      success
        ? "kiosk-s2-cell-ok border-emerald-400/30 ring-emerald-300/10 bg-[linear-gradient(160deg,rgba(16,185,129,0.55),rgba(4,120,87,0.62))]"
        : "kiosk-s2-cell-fail border-sky-400/25 ring-sky-300/10 bg-[linear-gradient(160deg,rgba(56,108,214,0.52),rgba(37,73,156,0.55))]"
    );

  const valueFillClass = (success: boolean) =>
    cn(
      "absolute inset-y-0 left-0 rounded-xl transition-[width] duration-700 ease-out",
      success
        ? "bg-[linear-gradient(90deg,rgba(52,211,153,0.55),rgba(16,185,129,0.30))] shadow-[0_0_12px_rgba(16,185,129,0.45)]"
        : "bg-[linear-gradient(90deg,rgba(96,165,250,0.50),rgba(59,130,246,0.20))]"
    );

  const valueTextClass = (success: boolean) =>
    cn(
      "relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums tracking-[0.01em] kiosk-data drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
      success ? "text-white" : "text-white"
    );

  const totalBoxClass =
    "kiosk-s2-total-box relative overflow-hidden rounded-xl border border-amber-400/35 ring-1 ring-inset ring-amber-300/10 " +
    "bg-[linear-gradient(160deg,rgba(251,146,60,0.30),rgba(217,119,6,0.40))] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_18px_rgba(0,0,0,0.26)]";

  const totalFillClass =
    "absolute inset-y-0 left-0 rounded-xl transition-[width] duration-700 ease-out " +
    "bg-[linear-gradient(90deg,rgba(251,191,36,0.45)_0%,rgba(251,146,60,0.55)_60%,rgba(245,158,11,0.20)_100%)] " +
    "shadow-[0_0_16px_rgba(245,158,11,0.30)]";

  const totalValueClass =
    "kiosk-s2-total-value relative z-10 flex h-full items-center justify-center " +
    "font-black tabular-nums tracking-[-0.01em] text-amber-100 kiosk-data drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]";

  /* Reusable zero cell — intentional ghost dash, not a bare "0" */
  const ZeroCell = () => (
    <div className="flex h-full items-center justify-center">
      <span
        aria-label="No output"
        className={cn(
          "kiosk-s2-cell-zero flex items-center justify-center rounded-xl border border-dashed",
          pillSize
        )}
        style={{
          borderColor: "var(--kiosk-wip-border, rgba(255,255,255,0.10))",
          background: "var(--kiosk-wip-row-idle, rgba(255,255,255,0.018))",
          color: "var(--kiosk-text-muted, rgba(255,255,255,0.40))",
          fontSize: DATA_FS,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        –
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
        <div className="relative shrink-0 flex items-center gap-3.5 px-5 py-3 border-b border-white/8">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(99,102,241,0.45)] ring-1 ring-white/20"
            style={{ background: "linear-gradient(135deg,#6366f1,#22d3ee)" }}
          >
            <Boxes className="h-6 w-6 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h2
              className="kiosk-s2-title kiosk-header uppercase text-white leading-none"
              style={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "0.06em" }}
            >
              Parts-wise Products WIP
            </h2>
            <div className="kiosk-s2-subtitle kiosk-data mt-1 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white/45">
              Hourly output by part · {hourCount} hours
            </div>
          </div>
          {/* Cohesive brand divider */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, #6366f1 18%, #8b5cf6 50%, #22d3ee 82%, transparent)",
            }}
          />
        </div>

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
              <col style={{ width: compact ? "180px" : "210px" }} />
              <col style={{ width: compact ? "100px" : "120px" }} />
              {Array.from({ length: hourCount }).map((_, i) => (
                <col key={i} style={{ width: compact ? "112px" : "132px" }} />
              ))}
              <col style={{ width: compact ? "124px" : "144px" }} />
            </colgroup>

            <thead>
              <tr className={headerHeightClass}>
                {/* Parts — indigo accent */}
                <th
                  className={cn("kiosk-th text-left uppercase", labelPad)}
                  style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.08em", boxShadow: `inset 0 -3px 0 ${ACCENT.indigo}` }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT.indigo }} />
                    Parts
                  </span>
                </th>

                {/* Target — emerald accent */}
                <th
                  className="kiosk-th text-center uppercase"
                  style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.08em", boxShadow: `inset 0 -3px 0 ${ACCENT.emerald}` }}
                >
                  Target
                </th>

                {/* Hourly — violet accent */}
                {Array.from({ length: hourCount }).map((_, i) => (
                  <th
                    key={i}
                    className="kiosk-th text-center uppercase"
                    style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.08em", boxShadow: `inset 0 -3px 0 ${ACCENT.violet}` }}
                  >
                    H{i + 1}
                  </th>
                ))}

                {/* G.Total — amber accent */}
                <th
                  className="kiosk-th text-center uppercase"
                  style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.08em", boxShadow: `inset 0 -3px 0 ${ACCENT.amber}` }}
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
                      className={cn("kiosk-s2-part-td border-b border-white/8 border-r border-white/8", labelPad)}
                      style={{ background: "rgba(30,58,138,0.35)", borderLeft: "3px solid #3B82F6" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-[3px] rounded-full bg-[linear-gradient(180deg,#60a5fa,#22d3ee)]" />
                        <div className="kiosk-s2-part-text truncate font-black text-white kiosk-data text-[1.05rem]">
                          {p.part}
                        </div>
                      </div>
                    </td>

                    {/* Target */}
                    <td
                      className="kiosk-s2-tgt-td border-b border-white/8 border-r border-white/8"
                      style={{ background: "rgba(6,95,70,0.35)" }}
                    >
                      <div className="flex h-full items-center justify-center">
                        <span className="kiosk-s2-tgt-val font-black tabular-nums text-emerald-300 kiosk-data" style={{ fontSize: DATA_FS }}>
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
                            <div className={cn(valueBoxClass(success), pillSize)}>
                              <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                              <div className={valueTextClass(success)} style={{ fontSize: DATA_FS }}>{value}</div>
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
                      <div className={cn(totalBoxClass, pillSize)}>
                        <div className={totalFillClass} style={{ width: `${gtPct}%` }} />
                        <div className={totalValueClass} style={{ fontSize: DATA_FS }}>{rowTotal}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Assemble Total row */}
              <tr className={cn("kiosk-s2-sumrow", rowHeightClass)}>
                <td
                  className={cn("kiosk-s2-sum-label border-t border-b border-r border-white/10", labelPad)}
                  style={{ borderLeft: `3px solid ${ACCENT.amber}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="kiosk-s2-sum-tag rounded-md px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-amber-200"
                      style={{ background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.35)" }}
                    >
                      Total
                    </span>
                    <span className="kiosk-s2-part-text font-black text-white kiosk-data text-[1.05rem]">
                      Assemble
                    </span>
                  </div>
                </td>

                <td
                  className="kiosk-s2-tgt-td border-t border-b border-r border-white/10"
                  style={{ background: "rgba(6,95,70,0.55)" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className="kiosk-s2-tgt-val font-black tabular-nums text-emerald-300 kiosk-data" style={{ fontSize: DATA_FS }}>
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
                        <div className={cn(valueBoxClass(false), pillSize)}>
                          <div className={valueFillClass(false)} style={{ width: `${pct}%` }} />
                          <div className={valueTextClass(false)} style={{ fontSize: DATA_FS }}>{t}</div>
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
                      <div className={cn(totalBoxClass, pillSize)}>
                        <div className={totalFillClass} style={{ width: `${pct}%` }} />
                        <div className={totalValueClass} style={{ fontSize: DATA_FS }}>{total}</div>
                      </div>
                    );
                  })()}
                </td>
              </tr>

              {/* Output Total row */}
              <tr className={cn("kiosk-s2-sumrow", rowHeightClass)}>
                <td
                  className={cn("kiosk-s2-sum-label border-t border-r border-white/10", labelPad)}
                  style={{ borderLeft: `3px solid ${ACCENT.emerald}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="kiosk-s2-sum-tag rounded-md px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-emerald-200"
                      style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)" }}
                    >
                      Total
                    </span>
                    <span className="kiosk-s2-part-text font-black text-white kiosk-data text-[1.05rem]">
                      Output
                    </span>
                  </div>
                </td>

                <td
                  className="kiosk-s2-tgt-td border-t border-r border-white/10"
                  style={{ background: "rgba(6,95,70,0.45)" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className="kiosk-s2-tgt-val font-black tabular-nums text-emerald-300 kiosk-data" style={{ fontSize: DATA_FS }}>
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
                        <div className={cn(valueBoxClass(success), pillSize)}>
                          <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                          <div className={valueTextClass(success)} style={{ fontSize: DATA_FS }}>{t}</div>
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
                      <div className={cn(totalBoxClass, pillSize)}>
                        <div className={totalFillClass} style={{ width: `${pct}%` }} />
                        <div className={totalValueClass} style={{ fontSize: DATA_FS }}>{total}</div>
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

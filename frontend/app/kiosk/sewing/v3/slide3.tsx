"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/* Cohesive jewel-tone accent set shared across both quality/WIP slides */
const ACCENT = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  cyan: "#22d3ee",
  emerald: "#10b981",
} as const;

type DefectBreakdownItem = { code: string; name?: string; description?: string; qty: number };
type QualityDetailLine = { lineId: number; lineName: string; defects: DefectBreakdownItem[] };

type QualityRow = {
  hour: number;
  dhu: number;
  defects: number;
  remarks: string[];
  details?: QualityDetailLine[];
};

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

const dhuBarColor = (dhu: number) => {
  if (dhu <= 0) return "#22c55e";
  if (dhu < 3) return "#facc15";
  return "#ef4444";
};

const dhuBarGradient = (dhu: number) => {
  if (dhu <= 0) return "linear-gradient(90deg,#34d399,#10b981)";
  if (dhu < 3) return "linear-gradient(90deg,#fcd34d,#f59e0b)";
  return "linear-gradient(90deg,#fb7185,#ef4444)";
};

const dhuTextClass = (dhu: number) =>
  dhu <= 0
    ? "text-green-400 kiosk-s3-dhu-text-ok"
    : "text-red-400 kiosk-s3-dhu-text-bad";

const defectTone = (qty: number) => {
  if (qty <= 0)
    return { border: "border-slate-600/30", bg: "bg-slate-700/30", text: "text-slate-500" };
  if (qty <= 5)
    return { border: "border-amber-400/40", bg: "bg-amber-500/15", text: "text-amber-300" };
  return { border: "border-rose-400/40", bg: "bg-rose-500/15", text: "text-rose-300" };
};

export default function SlideThree({ qualityRows }: { qualityRows: QualityRow[] }) {
  const compactH = useMediaQuery("(max-height: 860px)");
  const [openHour, setOpenHour] = React.useState<QualityRow | null>(null);
  const close = React.useCallback(() => setOpenHour(null), []);

  const rowCount = qualityRows.length;
  const needsCompact = compactH || rowCount >= 8;
  const headPad = "px-4";
  const rowPad = needsCompact ? "px-3 py-2" : "px-4 py-2.5";
  const rowH = needsCompact ? "h-[52px]" : "h-[58px]";

  return (
    <div className="h-full w-full p-2.5">
      {/* Main card */}
      <div
        className="kiosk-s3-card flex h-full flex-col overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: "var(--kiosk-card, rgba(8,15,30,0.97))",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Title bar */}
        <div className="relative shrink-0 flex items-center justify-center gap-3.5 border-b border-white/8 px-5 py-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(139,92,246,0.45)] ring-1 ring-white/20"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)" }}
          >
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.4} />
          </div>
          <div className="text-center">
            <h2
              className="kiosk-header font-black text-white kiosk-s3-title leading-none"
              style={{ fontSize: "clamp(1.45rem, 2.2vw, 1.75rem)", letterSpacing: "0.06em" }}
            >
              Quality Monitoring
            </h2>
            <div className="kiosk-s3-subtitle kiosk-data mt-1 text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-white/45">
              Hourly defect &amp; DHU tracking
            </div>
          </div>
          {/* Cohesive brand divider */}
          <div
            className="absolute bottom-0 left-[8%] right-[8%] h-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #6366f1 18%, #8b5cf6 50%, #22d3ee 82%, transparent)",
            }}
          />
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <table
            className="h-full w-full table-fixed border-collapse kiosk-data"
            style={{ color: "var(--kiosk-text, #CBD5E1)" }}
          >
            <colgroup>
              <col style={{ width: compactH ? "158px" : "188px" }} />
              <col style={{ width: compactH ? "210px" : "240px" }} />
              <col style={{ width: compactH ? "118px" : "138px" }} />
              <col style={{ width: "31%" }} />
              <col style={{ width: compactH ? "130px" : "158px" }} />
            </colgroup>

            <thead>
              <tr className="h-[44px]">
                {/* HOURS — indigo accent */}
                <th
                  className={cn("kiosk-th text-left font-extrabold uppercase", headPad)}
                  style={{ fontSize: "1rem", letterSpacing: "0.1em", boxShadow: `inset 0 -3px 0 ${ACCENT.indigo}` }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT.indigo }} />
                    Hours
                  </span>
                </th>
                {/* DHU — violet accent */}
                <th
                  className={cn("kiosk-th text-left font-extrabold uppercase", headPad)}
                  style={{ fontSize: "1rem", letterSpacing: "0.1em", boxShadow: `inset 0 -3px 0 ${ACCENT.violet}` }}
                >
                  DHU
                </th>
                {/* DEFECTS — rose accent */}
                <th
                  className={cn("kiosk-th text-center font-extrabold uppercase", headPad)}
                  style={{ fontSize: "1rem", letterSpacing: "0.1em", boxShadow: `inset 0 -3px 0 ${ACCENT.rose}` }}
                >
                  Defects
                </th>
                {/* TOP 3 DEFECTS — cyan accent */}
                <th
                  className={cn("kiosk-th text-left font-extrabold uppercase", headPad)}
                  style={{ fontSize: "1rem", letterSpacing: "0.1em", boxShadow: `inset 0 -3px 0 ${ACCENT.cyan}` }}
                >
                  Top 3 Defects
                </th>
                {/* REMARKS — emerald accent */}
                <th
                  className={cn("kiosk-th text-left font-extrabold uppercase", headPad)}
                  style={{ fontSize: "1rem", letterSpacing: "0.1em", boxShadow: `inset 0 -3px 0 ${ACCENT.emerald}` }}
                >
                  Remarks
                </th>
              </tr>
            </thead>

            <tbody>
              {qualityRows.map((r, idx) => {
                const zebra = idx % 2 === 0;
                const dhu = Number(r.dhu ?? 0);
                const defects = Number(r.defects ?? 0);
                const dhuFill = Math.min(100, dhu * 10);

                return (
                  <tr
                    key={r.hour}
                    className={cn("transition-colors duration-150", rowH)}
                    style={{ background: zebra ? "var(--kiosk-row-odd, #0F1629)" : "var(--kiosk-row-even, #151C35)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--kiosk-row-hover, #1E2B45)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        zebra ? "var(--kiosk-row-odd, #0F1629)" : "var(--kiosk-row-even, #151C35)";
                    }}
                  >
                    {/* Hours cell */}
                    <td
                      className={cn("border-b border-white/8 border-r border-white/8", rowPad)}
                      style={{ borderLeft: "3px solid #3B82F6" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="kiosk-s3-hour-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white"
                          style={{
                            background: "rgba(59,130,246,0.25)",
                            border: "1px solid rgba(59,130,246,0.5)",
                          }}
                        >
                          {r.hour}
                        </div>
                        <span
                          className="kiosk-s3-hour-text font-bold text-white"
                          style={{ fontSize: "1.15rem" }}
                        >
                          Hour {r.hour}
                        </span>
                      </div>
                    </td>

                    {/* DHU cell — progress bar + text */}
                    <td className={cn("border-b border-white/8 border-r border-white/8", rowPad)}>
                      <div className="flex items-center gap-3">
                        <div
                          className="kiosk-s3-dhu-track relative h-[9px] w-[120px] shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-white/5"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                            style={{
                              width: `${Math.max(dhu > 0 ? 6 : 0, dhuFill)}%`,
                              background: dhuBarGradient(dhu),
                              boxShadow: dhu > 0 ? `0 0 8px ${dhuBarColor(dhu)}80` : "none",
                            }}
                          />
                        </div>
                        <span
                          className={cn("font-extrabold tabular-nums", dhuTextClass(dhu))}
                          style={{ fontSize: "1.375rem" }}
                        >
                          {dhu.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Defects cell — green pill for 0, red pill for >0 */}
                    <td className={cn("border-b border-white/8 border-r border-white/8 text-center", rowPad)}>
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "inline-flex min-w-[52px] items-center justify-center gap-1.5 rounded-full border px-3.5 py-1 font-extrabold tabular-nums ring-1 ring-inset",
                            defects === 0
                              ? "kiosk-s3-defect-ok border-emerald-400/30 bg-emerald-500/15 text-emerald-300 ring-emerald-300/10"
                              : "kiosk-s3-defect-bad border-rose-400/35 bg-rose-500/15 text-rose-300 ring-rose-300/10"
                          )}
                          style={{ fontSize: "1.375rem" }}
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: defects === 0 ? "#34d399" : "#fb7185" }}
                          />
                          {defects}
                        </span>
                      </div>
                    </td>

                    {/* Top 3 Defects */}
                    <td className={cn("border-b border-white/8 border-r border-white/8", rowPad)}>
                      {defects > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(r.remarks ?? []).slice(0, 3).map((code, i2) => (
                            <span
                              key={`${code}-${i2}`}
                              className={cn(
                                "kiosk-s3-chip inline-flex items-center rounded-full border px-3 py-1 font-bold ring-1 ring-inset",
                                i2 === 0 && "border-rose-400/35 bg-rose-500/15 text-rose-200 ring-rose-300/10",
                                i2 === 1 && "border-amber-400/35 bg-amber-500/15 text-amber-200 ring-amber-300/10",
                                i2 === 2 && "border-cyan-400/35 bg-cyan-500/15 text-cyan-200 ring-cyan-300/10"
                              )}
                              style={{ fontSize: compactH ? "13px" : "14px" }}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          className="kiosk-s3-empty inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1 font-semibold"
                          style={{
                            fontSize: compactH ? "13px" : "14px",
                            borderColor: "var(--kiosk-wip-border, rgba(255,255,255,0.10))",
                            background: "var(--kiosk-wip-row-idle, rgba(255,255,255,0.018))",
                            color: "var(--kiosk-text-muted, rgba(255,255,255,0.45))",
                          }}
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                          No defects
                        </span>
                      )}
                    </td>

                    {/* Remarks / Details */}
                    <td className={cn("border-b border-white/8", rowPad)}>
                      {defects > 0 ? (
                        <button
                          type="button"
                          onClick={() => setOpenHour(r)}
                          className="kiosk-s3-details-btn group inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-1.5 font-bold text-emerald-300 ring-1 ring-inset ring-emerald-300/10 transition hover:bg-emerald-500/25 hover:ring-emerald-300/20"
                          style={{ fontSize: compactH ? "13px" : "14px" }}
                        >
                          Details
                          <span className="transition-transform group-hover:translate-x-0.5">›</span>
                        </button>
                      ) : (
                        <span
                          className="kiosk-s3-empty inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed"
                          style={{
                            fontSize: "0.9rem",
                            borderColor: "var(--kiosk-wip-border, rgba(255,255,255,0.10))",
                            color: "var(--kiosk-text-muted, rgba(255,255,255,0.40))",
                          }}
                        >
                          –
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {openHour ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
          />
          <div
            className="relative max-h-[82vh] w-[92vw] max-w-5xl overflow-hidden rounded-2xl border border-white/12"
            style={{ background: "var(--kiosk-card, rgba(13,22,39,0.98))", backdropFilter: "blur(14px)" }}
          >
            <div
              className="border-b border-white/10 px-5 py-4"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="kiosk-header text-[30px] font-bold uppercase tracking-[0.1em] text-white">
                    Defect Details
                  </div>
                  <div className="mt-1 text-[13px] font-bold uppercase tracking-[0.14em] text-white/50 kiosk-data">
                    Hour {openHour.hour}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-white/15 kiosk-data"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[calc(82vh-84px)] overflow-auto p-4">
              {(openHour.details?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  {openHour.details!.map((ln) => (
                    <div
                      key={ln.lineId}
                      className="overflow-hidden rounded-2xl border border-white/10"
                      style={{ background: "rgba(255,255,255,0.025)" }}
                    >
                      <div
                        className="border-b border-white/10 px-4 py-3"
                        style={{ background: "rgba(59,130,246,0.10)" }}
                      >
                        <div className="kiosk-header text-[22px] font-bold uppercase tracking-[0.08em] text-white">
                          {ln.lineName}
                        </div>
                      </div>
                      <table
                        className="w-full table-fixed text-[15px] kiosk-data"
                        style={{ color: "var(--kiosk-text, #CBD5E1)" }}
                      >
                        <colgroup>
                          <col style={{ width: "140px" }} />
                          <col />
                          <col style={{ width: "110px" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th
                              className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-white"
                              style={{ background: "#1E3A8A" }}
                            >
                              Code
                            </th>
                            <th
                              className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-white"
                              style={{ background: "#0E7490" }}
                            >
                              Defect
                            </th>
                            <th
                              className="px-4 py-3 text-right text-[12px] font-bold uppercase tracking-[0.1em] text-white"
                              style={{ background: "#92400E" }}
                            >
                              Qty
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ln.defects.map((d, idx) => (
                            <tr
                              key={`${ln.lineId}-${d.code}`}
                              className="border-b border-white/8"
                              style={{ background: idx % 2 === 0 ? "var(--kiosk-row-odd, #0F1629)" : "var(--kiosk-row-even, #151C35)" }}
                            >
                              <td className="px-4 py-3 font-black text-white">{d.code}</td>
                              <td className="px-4 py-3 font-semibold text-white/85">
                                {d.name ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={cn(
                                    "inline-flex min-w-[56px] justify-center rounded-full border px-3 py-1 text-[14px] font-black tabular-nums",
                                    defectTone(d.qty ?? 0).border,
                                    defectTone(d.qty ?? 0).bg,
                                    defectTone(d.qty ?? 0).text
                                  )}
                                >
                                  {d.qty ?? 0}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-2xl border border-white/10 px-4 py-6 text-[16px] font-semibold text-white/60 kiosk-data"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  No detail data available for this hour.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

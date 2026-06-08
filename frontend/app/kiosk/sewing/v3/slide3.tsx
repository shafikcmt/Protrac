"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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

const dhuTone = (dhu: number) => {
  if (dhu <= 0)
    return {
      pill: "border-emerald-400/60 bg-emerald-500/20",
      text: "text-emerald-300",
      glow: "shadow-[0_0_14px_rgba(16,185,129,0.55),0_0_4px_rgba(16,185,129,0.3)]",
    };
  if (dhu <= 3)
    return {
      pill: "border-amber-400/60 bg-amber-500/20",
      text: "text-amber-300",
      glow: "shadow-[0_0_14px_rgba(245,158,11,0.65),0_0_4px_rgba(245,158,11,0.4)]",
    };
  return {
    pill: "border-rose-400/60 bg-rose-500/20",
    text: "text-rose-300",
    glow: "shadow-[0_0_14px_rgba(244,63,94,0.65),0_0_4px_rgba(244,63,94,0.4)]",
  };
};

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
  const headPad = needsCompact ? "px-3 py-2" : "px-4 py-3";
  const rowPad = needsCompact ? "px-3 py-1.5" : "px-4 py-2";
  const rowH = needsCompact ? "h-[44px]" : "h-[52px]";
  const headSz = compactH ? "14px" : "16px";
  const bodySz = compactH ? "15px" : "17px";

  return (
    <div className="h-full w-full p-2.5">
      {/* Main card */}
      <div
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: "var(--kiosk-card, rgba(8,15,30,0.97))",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Title bar */}
        <div className="relative shrink-0 flex items-center justify-center border-b border-white/8 px-5 py-3">
          <h2
            className="kiosk-header font-bold uppercase text-white text-center"
            style={{ fontSize: compactH ? "22px" : "28px", letterSpacing: "0.14em" }}
          >
            Quality Monitoring
          </h2>
          <div
            className="absolute bottom-0 left-[8%] right-[8%] h-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #7C3AED 30%, #06B6D4 60%, #10B981 85%, transparent)",
            }}
          />
        </div>

        {/* Rainbow stripe */}
        <div
          className="h-[3px] w-full shrink-0"
          style={{
            background:
              "linear-gradient(90deg, #3B82F6 0%, #7C3AED 25%, #F59E0B 50%, #06B6D4 75%, #10B981 100%)",
          }}
        />

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <table
            className="h-full w-full table-fixed border-collapse kiosk-data"
            style={{ color: "var(--kiosk-text, #CBD5E1)" }}
          >
            <colgroup>
              <col style={{ width: compactH ? "158px" : "188px" }} />
              <col style={{ width: compactH ? "185px" : "215px" }} />
              <col style={{ width: compactH ? "118px" : "138px" }} />
              <col style={{ width: "31%" }} />
              <col style={{ width: compactH ? "130px" : "158px" }} />
            </colgroup>

            <thead>
              <tr>
                {/* HOURS — steel blue */}
                <th
                  className={cn("text-left font-bold uppercase text-white border-r border-white/10", headPad)}
                  style={{ fontSize: headSz, letterSpacing: "0.12em", background: "#1E3A8A" }}
                >
                  Hours
                </th>
                {/* DHU — bright purple */}
                <th
                  className={cn("text-right font-bold uppercase text-white border-r border-white/10", headPad)}
                  style={{ fontSize: headSz, letterSpacing: "0.12em", background: "#6D28D9" }}
                >
                  DHU
                </th>
                {/* DEFECTS — amber */}
                <th
                  className={cn("text-right font-bold uppercase text-white border-r border-white/10", headPad)}
                  style={{ fontSize: headSz, letterSpacing: "0.12em", background: "#92400E" }}
                >
                  Defects
                </th>
                {/* TOP 3 DEFECTS — cyan */}
                <th
                  className={cn("text-left font-bold uppercase text-white border-r border-white/10", headPad)}
                  style={{ fontSize: headSz, letterSpacing: "0.12em", background: "#0E7490" }}
                >
                  Top 3 Defects
                </th>
                {/* REMARKS — emerald */}
                <th
                  className={cn("text-left font-bold uppercase text-white", headPad)}
                  style={{ fontSize: headSz, letterSpacing: "0.12em", background: "#065F46" }}
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
                const { pill, text: dhuText, glow } = dhuTone(dhu);
                const defStyle = defectTone(defects);

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
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white"
                          style={{
                            background: "rgba(59,130,246,0.2)",
                            border: "1px solid rgba(59,130,246,0.45)",
                          }}
                        >
                          {r.hour}
                        </div>
                        <span className="font-bold text-white" style={{ fontSize: bodySz }}>
                          Hour {r.hour}
                        </span>
                      </div>
                    </td>

                    {/* DHU cell */}
                    <td className={cn("border-b border-white/8 border-r border-white/8 text-right", rowPad)}>
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            "inline-flex min-w-[72px] justify-center rounded-full border px-3 py-1.5 font-black tabular-nums",
                            pill,
                            dhuText,
                            glow
                          )}
                          style={{ fontSize: bodySz }}
                        >
                          {dhu.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Defects cell */}
                    <td className={cn("border-b border-white/8 border-r border-white/8 text-right", rowPad)}>
                      {defects === 0 ? (
                        <span className="italic text-slate-500" style={{ fontSize: bodySz }}>
                          0
                        </span>
                      ) : (
                        <div className="flex justify-end">
                          <span
                            className={cn(
                              "inline-flex min-w-[56px] justify-center rounded-full border px-3 py-1.5 font-black tabular-nums",
                              defStyle.border,
                              defStyle.bg,
                              defStyle.text
                            )}
                            style={{ fontSize: bodySz }}
                          >
                            {defects}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Top 3 Defects */}
                    <td className={cn("border-b border-white/8 border-r border-white/8", rowPad)}>
                      {defects > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(r.remarks ?? []).slice(0, 3).map((code, i2) => (
                            <span
                              key={`${code}-${i2}`}
                              className={cn(
                                "inline-flex items-center rounded-full border px-3 py-1 font-bold",
                                i2 === 0 && "border-rose-400/40 bg-rose-500/15 text-rose-300",
                                i2 === 1 && "border-amber-400/40 bg-amber-500/15 text-amber-300",
                                i2 === 2 && "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                              )}
                              style={{ fontSize: compactH ? "13px" : "14px" }}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          className="italic text-slate-500"
                          style={{ fontSize: compactH ? "13px" : "14px" }}
                        >
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
                          className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                          style={{ fontSize: compactH ? "13px" : "14px" }}
                        >
                          Details
                        </button>
                      ) : (
                        <span
                          className="text-slate-500"
                          style={{ fontSize: compactH ? "13px" : "14px" }}
                        >
                          —
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

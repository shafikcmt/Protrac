"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const panelCard = cn(
  "overflow-hidden rounded-[26px] border shadow-[0_22px_60px_rgba(15,23,42,0.20)]",
  "border-slate-300/80 bg-[linear-gradient(180deg,#f7fbff_0%,#edf4fb_48%,#e7eef7_100%)]",
  "dark:border-white/12 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_22%),linear-gradient(180deg,#081427_0%,#07111f_54%,#070d18_100%)] dark:shadow-[0_20px_46px_rgba(0,0,0,0.38)]"
);

export default function SlideThree({
  qualityRows,
}: {
  qualityRows: QualityRow[];
}) {
  const compactH = useMediaQuery("(max-height: 860px)");
  const [openHour, setOpenHour] = React.useState<QualityRow | null>(null);
  const close = React.useCallback(() => setOpenHour(null), []);

  const compact = compactH;

  const headPad = "px-3 py-2";
  const rowPad = "px-3 py-1.5";
  const headText = "text-[13px]";
  const bodyText = "text-[14px]";

const dhuTone = (dhu: number) => {
  if (dhu <= 2) {
    return {
      chip: "border-emerald-300/30 bg-emerald-400/12 dark:border-emerald-300/20 dark:bg-emerald-400/10",
      fill: "bg-[linear-gradient(90deg,#2dd4bf_0%,#10b981_100%)]",
    };
  }
  if (dhu <= 5) {
    return {
      chip: "border-amber-300/40 bg-amber-300/18 dark:border-amber-300/24 dark:bg-amber-400/12",
      fill: "bg-[linear-gradient(90deg,#fbbf24_0%,#f59e0b_100%)]",
    };
  }
  return {
    chip: "border-rose-300/40 bg-rose-300/18 dark:border-rose-300/24 dark:bg-rose-400/12",
      fill: "bg-[linear-gradient(90deg,#fb7185_0%,#f43f5e_100%)]",
  };
};

const defectTone = (qty: number) => {
  if (qty <= 0) {
    return "border-slate-300/70 bg-white/80 dark:border-white/14 dark:bg-white/[0.08]";
  }
  if (qty <= 5) {
    return "border-amber-300/60 bg-amber-200/26 dark:border-amber-300/28 dark:bg-amber-400/14";
  }
  return "border-rose-300/60 bg-rose-200/26 dark:border-rose-300/28 dark:bg-rose-400/14";
};


  return (
    <div className={cn("h-full w-full", compactH ? "p-2" : "p-2.5")}>
      <Card className={cn(panelCard, "flex h-full flex-col")}>
        <CardHeader className="relative shrink-0 pb-1 pt-1.5">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.28),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)]" />
          <div className="flex items-center justify-center">
            <CardTitle className="text-slate-950 dark:text-white text-center font-black tracking-[-0.035em] text-2xl xl:text-3xl leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.96)] dark:drop-shadow-[0_7px_26px_rgba(0,0,0,0.60)]">
              Quality Monitoring
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 pt-1 pb-2">
          <div className="h-full min-h-0 overflow-hidden rounded-[24px] border border-slate-300/90 bg-[linear-gradient(180deg,#f7fbff_0%,#edf4fb_100%)] shadow-[0_16px_34px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(7,18,37,0.98),rgba(6,15,31,0.99))] dark:shadow-[0_18px_44px_rgba(0,0,0,0.34)] flex flex-col">
            <div className="h-1.5 w-full shrink-0 bg-[linear-gradient(90deg,rgba(59,130,246,0.62),rgba(34,211,238,0.42),rgba(245,158,11,0.42),rgba(168,85,247,0.42))] dark:bg-[linear-gradient(90deg,rgba(59,130,246,0.26),rgba(34,211,238,0.18),rgba(245,158,11,0.18),rgba(168,85,247,0.22))]" />

            <div className="flex-1 min-h-0 overflow-hidden">
              <table className={cn("h-full w-full table-fixed border-collapse text-slate-900 dark:text-white", bodyText)}>
                <colgroup>
                  <col style={{ width: compact ? "165px" : "190px" }} />
                  <col style={{ width: compact ? "195px" : "230px" }} />
                  <col style={{ width: compact ? "125px" : "145px" }} />
                  <col style={{ width: "31%" }} />
                  <col style={{ width: compact ? "135px" : "155px" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th
                      className={cn(
                        "text-left font-black uppercase tracking-[0.06em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)] bg-[linear-gradient(180deg,#2d6b93,#214f70)]",
                        headPad,
                        headText
                      )}
                    >
                      Hours
                    </th>
                    <th
                      className={cn(
                        "text-right font-black uppercase tracking-[0.06em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)] bg-[linear-gradient(180deg,#9b5cff,#5b2ee8)]",
                        headPad,
                        headText
                      )}
                    >
                      DHU
                    </th>
                    <th
                      className={cn(
                        "text-right font-black uppercase tracking-[0.06em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)] bg-[linear-gradient(180deg,#ffa61a,#eb8f00)]",
                        headPad,
                        headText
                      )}
                    >
                      Defects
                    </th>
                    <th
                      className={cn(
                        "text-left font-black uppercase tracking-[0.06em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)] bg-[linear-gradient(180deg,#50aae3,#318dc8)]",
                        headPad,
                        headText
                      )}
                    >
                      Top 3 Defects
                    </th>
                    <th
                      className={cn(
                        "text-left font-black uppercase tracking-[0.06em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)] bg-[linear-gradient(180deg,#6fd4c6,#49b7aa)]",
                        headPad,
                        headText
                      )}
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
                    const dhuStyle = dhuTone(dhu);

                    return (
                      <tr
                        key={r.hour}
                        className={cn(
                          "transition-colors duration-200",
                          "h-[44px]",
                          zebra ? "bg-slate-50 dark:bg-white/[0.02]" : "bg-white dark:bg-transparent",
                          "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        <td
                          className={cn(
                            "border-b border-slate-200/90 border-l-4 border-l-blue-400 bg-[linear-gradient(180deg,#d7e2ef_0%,#c8d5e4_100%)] dark:border-white/10 dark:border-l-blue-500/40 dark:bg-[linear-gradient(180deg,rgba(39,61,92,0.96),rgba(31,51,78,0.96))]",
                            rowPad
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                "border border-slate-300/80 bg-[linear-gradient(180deg,#ffffff_0%,#edf3fa_100%)]",
                                "text-[12px] font-black leading-none text-slate-800",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_4px_8px_rgba(15,23,42,0.10)]",
                                "dark:border-white/18 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.10))]",
                                "dark:!text-white dark:[text-shadow:0_1px_10px_rgba(0,0,0,0.85)]",
                                "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_10px_rgba(0,0,0,0.28)]"
                              )}
                            >
                              {r.hour}
                            </div>
                            <div className="text-sm font-black tracking-[-0.02em] text-slate-950 leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.9)] dark:text-white dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.38)]">
                              Hour {r.hour}
                            </div>
                          </div>
                        </td>

                        <td
                          className={cn(
                            "border-b border-slate-200/90 text-right bg-[linear-gradient(180deg,rgba(156,133,255,0.10),rgba(120,98,214,0.12))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(70,53,124,0.44),rgba(55,43,98,0.44))]",
                            rowPad
                          )}
                        >
                          <div className="flex items-center justify-end">
                            <span
                              className={cn(
                                "inline-flex min-w-[64px] justify-center rounded-full border px-3 py-1 text-lg font-black tabular-nums tracking-[-0.02em]",
                                "text-slate-950 dark:!text-white",
                                "[text-shadow:0_1px_0_rgba(255,255,255,0.55)] dark:[text-shadow:0_1px_12px_rgba(0,0,0,0.85)]",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_8px_rgba(15,23,42,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.20)]",
                                dhuStyle.chip
                              )}
                            >
                              {dhu.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        <td
                          className={cn(
                            "border-b border-slate-200/90 text-right bg-[linear-gradient(180deg,rgba(255,212,111,0.12),rgba(243,180,59,0.16))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(97,79,36,0.36),rgba(80,65,28,0.36))]",
                            rowPad
                          )}
                        >
                          {defects === 0 ? (
                            <span className="text-slate-400 dark:text-slate-500 font-bold text-sm">0</span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex min-w-[56px] justify-center rounded-full border px-3 py-1 text-lg font-black tabular-nums tracking-[-0.02em]",
                                "text-slate-950 dark:!text-white",
                                "[text-shadow:0_1px_0_rgba(255,255,255,0.55)] dark:[text-shadow:0_1px_12px_rgba(0,0,0,0.85)]",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_8px_rgba(15,23,42,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.20)]",
                                defectTone(defects)
                              )}
                            >
                              {defects}
                            </span>
                          )}
                        </td>

                        <td
                          className={cn(
                            "border-b border-slate-200/90 bg-[linear-gradient(180deg,rgba(109,189,236,0.08),rgba(94,157,214,0.10))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(40,74,114,0.30),rgba(25,54,86,0.30))]",
                            rowPad
                          )}
                        >
                          {defects > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {(r.remarks ?? []).slice(0, 3).map((code: string, i2) => (
                                <span
                                  key={`${code}-${i2}`}
                                  className={cn(
                                      "inline-flex items-center rounded-full border px-3 py-1 text-sm font-black tracking-[0.005em]",
                                      "text-slate-950 dark:!text-white",
                                      "[text-shadow:0_1px_0_rgba(255,255,255,0.42)] dark:[text-shadow:0_1px_12px_rgba(0,0,0,0.85)]",
                                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.30)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                                      i2 === 0 && "border-rose-300/80 bg-[#ffe3ea] dark:border-rose-300/35 dark:bg-rose-500/24",
                                      i2 === 1 && "border-amber-300/80 bg-[#fff0cc] dark:border-amber-300/35 dark:bg-amber-500/24",
                                      i2 === 2 && "border-cyan-300/80 bg-[#dbf6ff] dark:border-cyan-300/35 dark:bg-cyan-500/24"
                                    )}
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">No defects</span>
                          )}
                        </td>

                        <td
                          className={cn(
                            "border-b border-slate-200/90 bg-[linear-gradient(180deg,rgba(122,218,206,0.10),rgba(109,196,189,0.12))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(73,108,104,0.28),rgba(55,83,79,0.28))]",
                            rowPad
                          )}
                        >
                          {defects > 0 ? (
                            <button
                              type="button"
                              onClick={() => setOpenHour(r)}
                              className="inline-flex items-center rounded-lg border border-cyan-400/70 bg-[linear-gradient(180deg,#c8f1ff_0%,#8de0fb_100%)] px-3 py-1 text-sm font-black text-cyan-950 shadow-[0_4px_10px_rgba(6,182,212,0.16)] transition hover:brightness-[0.98] dark:border-cyan-300/26 dark:bg-[linear-gradient(180deg,rgba(34,211,238,0.24),rgba(14,165,233,0.20))] dark:text-white dark:shadow-[0_4px_10px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.10)] dark:hover:bg-cyan-400/22"
                            >
                              <span className="tracking-[-0.01em] text-inherit drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] dark:[text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">Details</span>
                            </button>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>


      {openHour ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] dark:bg-black/78"
          />

          <div className="relative max-h-[82vh] w-[92vw] max-w-5xl overflow-hidden rounded-[24px] border border-slate-300 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(241,246,255,0.99))] shadow-2xl dark:border-white/12 dark:bg-[linear-gradient(135deg,rgba(24,31,50,0.98),rgba(8,12,22,0.98))]">
            <div className="border-b border-slate-200 bg-[linear-gradient(90deg,rgba(59,130,246,0.12),rgba(168,85,247,0.10),rgba(34,211,238,0.10))] px-5 py-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[32px] font-black tracking-[-0.03em] text-slate-950 dark:text-white">
                    Defect Details
                  </div>
                  <div className="mt-1 text-[14px] font-extrabold uppercase tracking-[0.12em] text-slate-600 dark:text-white/65">
                    Hour {openHour.hour}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[14px] font-extrabold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
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
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.98))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                    >
                      <div className="border-b border-slate-200 bg-[linear-gradient(90deg,rgba(59,130,246,0.12),rgba(34,211,238,0.10))] px-4 py-3 dark:border-white/10">
                        <div className="text-[22px] font-black tracking-[-0.02em] text-slate-950 dark:text-white">
                          {ln.lineName}
                        </div>
                      </div>

                      <table className="w-full table-fixed text-[16px] text-slate-900 dark:text-white">
                        <colgroup>
                          <col style={{ width: "140px" }} />
                          <col />
                          <col style={{ width: "110px" }} />
                        </colgroup>

                        <thead>
                          <tr>
                            <th className="bg-[linear-gradient(180deg,#2d6b93,#214f70)] px-4 py-3 text-left text-[12px] font-black uppercase tracking-[0.08em] text-white">
                              Code
                            </th>
                            <th className="bg-[linear-gradient(180deg,#50aae3,#318dc8)] px-4 py-3 text-left text-[12px] font-black uppercase tracking-[0.08em] text-white">
                              Defect
                            </th>
                            <th className="bg-[linear-gradient(180deg,#ffa61a,#eb8f00)] px-4 py-3 text-right text-[12px] font-black uppercase tracking-[0.08em] text-white">
                              Qty
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {ln.defects.map((d, idx) => (
                            <tr
                              key={`${ln.lineId}-${d.code}`}
                              className={cn(
                                "border-b border-slate-200 dark:border-white/8",
                                idx % 2 === 0 ? "bg-slate-50/80 dark:bg-white/[0.018]" : "bg-transparent"
                              )}
                            >
                              <td className="px-4 py-3 font-black text-slate-950 dark:text-white">
                                {d.code}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-white/92">
                                {d.name ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={cn(
                                    "inline-flex min-w-[64px] justify-center rounded-full border px-3 py-1 text-[15px] font-black tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_10px_rgba(15,23,42,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.14)]",
                                    defectTone(d.qty ?? 0)
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
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-[16px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/78">
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

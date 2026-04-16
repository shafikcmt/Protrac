"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const panelCard =
  "overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.98))] shadow-[0_14px_34px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(14,22,40,0.96),rgba(7,12,24,0.98))] dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)]";

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
        ? "h-[70px]"
        : "h-[82px]"
      : rowCount <= 8
        ? compact
          ? "h-[70px]"
          : "h-[76px]"
        : compact
          ? "h-[70px]"
          : "h-[86px]";

  const headerHeightClass = compact ? "h-[62px]" : "h-[72px]";
  const titleClass = compact ? "text-[34px] xl:text-[38px]" : "text-[42px] xl:text-[48px]";

  const partText = compact ? "text-[22px]" : "text-[25px]";
  const headText = compact ? "text-[20px]" : "text-[22px]";
  const targetText = compact ? "text-[23px]" : "text-[25px]";
  const valueText = compact ? "text-[25px]" : "text-[28px]";

  const cellOuter = compact ? "px-1 py-1" : "px-3 py-2.5";
  const labelPad = "px-5";

  const valueBoxClass = (success: boolean) =>
    cn(
      "relative overflow-hidden rounded-[16px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.70),0_6px_16px_rgba(148,163,184,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_16px_rgba(0,0,0,0.20)]",
      success
        ? "border-emerald-300/55 bg-[linear-gradient(180deg,#effdf5,#d8fae7)] dark:border-emerald-300/20 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.76),rgba(8,15,30,0.92))]"
        : "border-slate-300/80 bg-[linear-gradient(180deg,#f8fbff,#e8eef8)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(22,31,52,0.76),rgba(12,20,36,0.92))]"
    );

  const valueFillClass = (success: boolean) =>
    cn(
      "absolute inset-y-0 left-0 rounded-[16px] transition-[width] duration-700 ease-out",
      success
        ? "bg-[linear-gradient(90deg,#22c55e,#10b981)] shadow-[0_0_10px_rgba(34,197,94,0.35)] dark:shadow-[0_0_10px_rgba(34,197,94,0.45)]"
        : "bg-[linear-gradient(90deg,rgba(124,58,237,0.78),rgba(59,130,246,0.34))] dark:bg-[linear-gradient(90deg,rgba(124,58,237,0.42),rgba(59,130,246,0.18))]"
    );

  const valueTextClass = (success: boolean) =>
    cn(
      "relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums tracking-[0.01em] text-slate-900 [text-shadow:0_1px_0_rgba(255,255,255,0.72)] dark:text-white dark:[text-shadow:0_2px_8px_rgba(0,0,0,0.38)]",
      valueText,
      success && "drop-shadow-[0_1px_8px_rgba(16,185,129,0.16)] dark:drop-shadow-[0_1px_8px_rgba(16,185,129,0.20)]"
    );

  const totalBoxClass =
    "relative overflow-hidden rounded-[16px] border border-amber-300/85 bg-[linear-gradient(180deg,#fff4dd_0%,#f7e5bb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(148,163,184,0.18)] dark:border-amber-500/20 dark:bg-[linear-gradient(180deg,rgba(33,22,18,0.90),rgba(18,14,22,0.96))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.24)]";

  const totalFillClass =
    "absolute inset-y-0 left-0 rounded-[16px] transition-[width] duration-700 ease-out bg-[linear-gradient(90deg,rgba(251,146,60,0.42)_0%,rgba(245,158,11,0.62)_46%,rgba(168,85,247,0.22)_100%)] shadow-[0_0_18px_rgba(245,158,11,0.18)] dark:bg-[linear-gradient(90deg,rgba(249,115,22,0.30)_0%,rgba(245,158,11,0.42)_45%,rgba(168,85,247,0.38)_100%)] dark:shadow-[0_0_22px_rgba(245,158,11,0.18)]";

  const totalValueClass = cn(
    "relative z-10 flex h-full items-center justify-center font-black tabular-nums tracking-[-0.01em] text-[#6b3f00] [text-shadow:0_1px_0_rgba(255,255,255,0.80)] dark:text-[#fff3cf] dark:[text-shadow:0_2px_12px_rgba(0,0,0,0.48)]",
    compact ? "text-[30px]" : "text-[32px]"
  );

  return (
    <div className={cn("h-full w-full", compactH ? "p-2" : "p-2.5")}>
      <Card
        className={cn(
          panelCard,
          "flex h-full flex-col",
          "bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef5fd_54%,#e8f0fa_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_22%),linear-gradient(180deg,#091325_0%,#07101d_54%,#060d18_100%)]"
        )}
      >
        <CardHeader className="relative shrink-0 pb-3 pt-4">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.35),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)]" />
          <div className="flex items-center justify-center">
            <CardTitle
              className={cn(
                "text-center font-black leading-none tracking-tight text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.85)] dark:text-white dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.48)]",
                titleClass
              )}
            >
              Parts-wise Products WIP ({hourCount} Hours)
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 pb-3 pt-1">
          <div className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fdfefe_0%,#f3f8fe_100%)] shadow-[0_16px_40px_rgba(148,163,184,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(7,15,30,0.98),rgba(7,13,24,0.99))] dark:shadow-[0_16px_40px_rgba(0,0,0,0.30)]">
            <div className="h-1.5 w-full bg-[linear-gradient(90deg,rgba(56,189,248,0.22),rgba(59,130,246,0.16),rgba(168,85,247,0.20),rgba(245,158,11,0.18))]" />

            <div className="flex h-full flex-col">
              <table className="w-full table-fixed border-collapse text-slate-900 dark:text-white">
                <colgroup>
                  <col style={{ width: compact ? "190px" : "220px" }} />
                  <col style={{ width: compact ? "94px" : "110px" }} />
                  {Array.from({ length: hourCount }).map((_, i) => (
                    <col key={i} style={{ width: compact ? "112px" : "126px" }} />
                  ))}
                  <col style={{ width: compact ? "116px" : "132px" }} />
                </colgroup>

                <thead>
                  <tr className={headerHeightClass}>
                    <th
                      className={cn(
                        "border-r border-white/10 bg-[linear-gradient(180deg,#1f5f82,#1a4963)] text-left font-black uppercase tracking-[0.08em] text-white",
                        headText,
                        labelPad
                      )}
                    >
                      Parts
                    </th>

                    <th
                      className={cn(
                        "border-r border-white/10 bg-[linear-gradient(180deg,#4aa6db,#327fae)] text-center font-black uppercase tracking-[0.08em] text-white",
                        headText
                      )}
                    >
                      Target
                    </th>

                    {Array.from({ length: hourCount }).map((_, i) => (
                      <th
                        key={i}
                        className={cn(
                          "border-r border-[#5326b0] bg-[linear-gradient(180deg,#9b5cf8,#6f2fe6)] text-center font-black uppercase tracking-[0.08em] text-white",
                          headText
                        )}
                      >
                        H{i + 1}
                      </th>
                    ))}

                    <th
                      className={cn(
                        "bg-[linear-gradient(180deg,#f59e0b,#ea7b00)] text-center font-black uppercase tracking-[0.08em] text-white",
                        headText
                      )}
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
                        className={cn(
                          rowHeightClass,
                          zebra ? "bg-slate-100/75 dark:bg-white/[0.015]" : "bg-white/75 dark:bg-transparent"
                        )}
                      >
                        <td
                          className={cn(
                            "border-b border-slate-200/80 border-r border-slate-200/80 bg-[linear-gradient(180deg,#314b6c,#2a425f)] dark:border-b-white/10 dark:border-r-white/8 dark:bg-[linear-gradient(180deg,rgba(39,61,88,0.98),rgba(32,50,72,0.98))]",
                            labelPad
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-[4px] rounded-full bg-[linear-gradient(180deg,#60a5fa,#22d3ee)]" />
                            <div
                              className={cn(
                                "truncate font-black text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.30)]",
                                partText
                              )}
                            >
                              {p.part}
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-slate-200/80 border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(124,164,198,0.92),rgba(98,137,171,0.92))] dark:border-b-white/10 dark:border-r-white/8 dark:bg-[linear-gradient(180deg,rgba(70,112,149,0.72),rgba(55,90,120,0.72))]">
                          <div className="flex h-full items-center justify-center">
                            <span className={cn("font-black tabular-nums text-white", targetText)}>
                              {p.target ?? "—"}
                            </span>
                          </div>
                        </td>

                        {Array.from({ length: hourCount }).map((_, i) => {
                          const value = Number(p.hours?.[i] ?? 0);
                          const target = Number(p.target) || 0;
                          const pct = getPct(value, target);
                          const success = isSuccess(value, target);

                          return (
                            <td
                              key={i}
                              className={cn(
                                "border-b border-slate-200/80 dark:border-b-white/10",
                                cellOuter
                              )}
                            >
                              <div className={cn(valueBoxClass(success), "my-auto h-[60%]")}>
                                <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                                <div className={valueTextClass(success)}>{value}</div>
                              </div>
                            </td>
                          );
                        })}

                        <td
                          className={cn(
                            "border-b border-slate-200/80 border-l border-amber-300/70 dark:border-b-white/10 dark:border-l-[#7a4300]/40",
                            cellOuter
                          )}
                        >
                          <div className={cn(totalBoxClass, "my-auto h-[60%]")}>
                            <div className={totalFillClass} style={{ width: `${gtPct}%` }} />
                            <div className={totalValueClass}>{rowTotal}</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  <tr className={cn(rowHeightClass, "bg-slate-100/85 dark:bg-white/[0.025]")}>
                    <td
                      className={cn(
                        "border-t border-b border-r border-slate-200/80 bg-[linear-gradient(180deg,#365577,#28435f)] dark:border-t-white/10 dark:border-b-white/10 dark:border-r-white/8 dark:bg-[linear-gradient(180deg,#2b4464,#213650)]",
                        labelPad
                      )}
                    >
                      <div className={cn("font-black text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.30)]", partText)}>
                        Assemble Total
                      </div>
                    </td>

                    <td className="border-t border-b border-r border-slate-200/80 bg-[linear-gradient(180deg,#7cb2d7,#5b8eb5)] dark:border-t-white/10 dark:border-b-white/10 dark:border-r-white/8 dark:bg-[linear-gradient(180deg,#649ac0,#4e7ea2)]">
                      <div className="flex h-full items-center justify-center">
                        <span className={cn("font-black tabular-nums text-white", targetText)}>
                          {assembleTargetPerHour || "—"}
                        </span>
                      </div>
                    </td>

                    {assemble.map((t, i) => {
                      const pct = getPct(t, assembleTargetPerHour);

                      return (
                        <td
                          key={i}
                          className={cn(
                            "border-t border-b border-slate-200/80 dark:border-t-white/10 dark:border-b-white/10",
                            cellOuter
                          )}
                        >
                          <div className={cn(valueBoxClass(false), "my-auto h-[60%]")}>
                            <div
                              className="absolute inset-y-0 left-0 rounded-[16px] bg-[linear-gradient(90deg,rgba(124,58,237,0.82),rgba(99,102,241,0.38))] dark:bg-[linear-gradient(90deg,rgba(124,58,237,0.60),rgba(99,102,241,0.34))]"
                              style={{ width: `${pct}%` }}
                            />
                            <div
                              className={cn(
                                "relative z-10 flex h-full items-center justify-center font-extrabold tabular-nums text-slate-900 [text-shadow:0_1px_0_rgba(255,255,255,0.72)] dark:text-white dark:[text-shadow:0_2px_8px_rgba(0,0,0,0.38)]",
                                valueText
                              )}
                            >
                              {t}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td
                      className={cn(
                        "border-t border-b border-l border-amber-300/70 dark:border-t-white/10 dark:border-b-white/10 dark:border-l-[#7a4300]/40",
                        cellOuter
                      )}
                    >
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

                  <tr className={cn(rowHeightClass, "bg-white/80 dark:bg-white/[0.02]")}>
                    <td
                      className={cn(
                        "border-t border-r border-slate-200/80 bg-[linear-gradient(180deg,#3a5875,#2b445d)] dark:border-t-white/10 dark:border-r-white/8 dark:bg-[linear-gradient(180deg,#324b67,#25384d)]",
                        labelPad
                      )}
                    >
                      <div className={cn("font-black text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.30)]", partText)}>
                        Output Total
                      </div>
                    </td>

                    <td className="border-t border-r border-slate-200/80 bg-[linear-gradient(180deg,#85bce1,#5f93ba)] dark:border-t-white/10 dark:border-r-white/8 dark:bg-[linear-gradient(180deg,#6aa4cc,#4a7ea3)]">
                      <div className="flex h-full items-center justify-center">
                        <span className={cn("font-black tabular-nums text-white", targetText)}>
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
                          className={cn("border-t border-slate-200/80 dark:border-t-white/10", cellOuter)}
                        >
                          <div className={cn(valueBoxClass(success), "my-auto h-[60%]")}>
                            <div className={valueFillClass(success)} style={{ width: `${pct}%` }} />
                            <div className={valueTextClass(success)}>{t}</div>
                          </div>
                        </td>
                      );
                    })}

                    <td
                      className={cn(
                        "border-t border-l border-amber-300/70 dark:border-t-white/10 dark:border-l-[#7a4300]/40",
                        cellOuter
                      )}
                    >
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
        </CardContent>
      </Card>
    </div>
  );
}

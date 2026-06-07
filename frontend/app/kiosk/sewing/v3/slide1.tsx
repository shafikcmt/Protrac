"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers3,
  Scissors,
  Shirt,
  PanelTop,
  BadgeCheck,
  Target,
  Zap,
  AlertTriangle,
  RefreshCw as RefreshCwIcon,
} from "lucide-react";

type WipTone =
  | "blue"
  | "cyan"
  | "emerald"
  | "violet"
  | "amber"
  | "orange"
  | "pink"
  | "slate";

type KpiData = {
  target: number;
  actual: number;
  efficiency: number;
  dhu: number;
  reworkQty: number;
  reworkPct: number;
  rejectionPct?: number;
  rejectedQty?: number;
};

type PlanVsActualRow = { serial: number; plan: number; actual: number };

type WipData = {
  totalInput: number;
  totalOutput: number;
  lineWip: number;
  partWipRows: { label: string; value: number; max: number }[];
};

const DEFAULT_PARTS = ["Front", "Back", "Sleeve", "Collar", "Hood"];

const normalizeKey = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");

function useCountUp(value: number, durationMs = 900) {
  const [v, setV] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return v;
}

const TONE_STYLES: Record<
  WipTone,
  {
    rail: string;
    fill: string;
    chip: string;
    iconWrap: string;
    glow: string;
  }
> = {
  blue: {
    rail: "bg-blue-500/10 border-blue-300/10",
    fill: "bg-[linear-gradient(90deg,#60a5fa_0%,#3b82f6_100%)]",
    chip: "bg-blue-400/15 text-blue-100 border-blue-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(96,165,250,0.28),rgba(37,99,235,0.22))] text-blue-100 border-blue-300/20",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  },
  cyan: {
    rail: "bg-cyan-500/10 border-cyan-300/10",
    fill: "bg-[linear-gradient(90deg,#67e8f9_0%,#06b6d4_100%)]",
    chip: "bg-cyan-400/15 text-cyan-100 border-cyan-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(103,232,249,0.26),rgba(8,145,178,0.22))] text-cyan-100 border-cyan-300/20",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.22)]",
  },
  emerald: {
    rail: "bg-emerald-500/10 border-emerald-300/10",
    fill: "bg-[linear-gradient(90deg,#6ee7b7_0%,#10b981_100%)]",
    chip: "bg-emerald-400/15 text-emerald-100 border-emerald-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(110,231,183,0.26),rgba(5,150,105,0.22))] text-emerald-100 border-emerald-300/20",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.22)]",
  },
  violet: {
    rail: "bg-violet-500/10 border-violet-300/10",
    fill: "bg-[linear-gradient(90deg,#a78bfa_0%,#7c3aed_100%)]",
    chip: "bg-violet-400/15 text-violet-100 border-violet-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(167,139,250,0.26),rgba(109,40,217,0.22))] text-violet-100 border-violet-300/20",
    glow: "shadow-[0_0_18px_rgba(139,92,246,0.22)]",
  },
  amber: {
    rail: "bg-amber-500/10 border-amber-300/10",
    fill: "bg-[linear-gradient(90deg,#fde68a_0%,#f59e0b_100%)]",
    chip: "bg-amber-400/15 text-amber-50 border-amber-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(253,230,138,0.28),rgba(217,119,6,0.22))] text-amber-50 border-amber-300/20",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.24)]",
  },
  orange: {
    rail: "bg-orange-500/10 border-orange-300/10",
    fill: "bg-[linear-gradient(90deg,#fdba74_0%,#f97316_100%)]",
    chip: "bg-orange-400/15 text-orange-50 border-orange-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(253,186,116,0.28),rgba(234,88,12,0.22))] text-orange-50 border-orange-300/20",
    glow: "shadow-[0_0_18px_rgba(249,115,22,0.22)]",
  },
  pink: {
    rail: "bg-pink-500/10 border-pink-300/10",
    fill: "bg-[linear-gradient(90deg,#f9a8d4_0%,#ec4899_100%)]",
    chip: "bg-pink-400/15 text-pink-50 border-pink-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(249,168,212,0.28),rgba(219,39,119,0.22))] text-pink-50 border-pink-300/20",
    glow: "shadow-[0_0_18px_rgba(236,72,153,0.22)]",
  },
  slate: {
    rail: "bg-slate-500/10 border-slate-300/10",
    fill: "bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)]",
    chip: "bg-slate-400/15 text-slate-100 border-slate-300/20",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(148,163,184,0.22),rgba(71,85,105,0.22))] text-slate-100 border-slate-300/20",
    glow: "shadow-[0_0_18px_rgba(100,116,139,0.18)]",
  },
};

const panelCard =
  "rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,22,40,0.96),rgba(7,12,24,0.98))] shadow-[0_14px_34px_rgba(0,0,0,0.34)] overflow-hidden";

const flatKpiBase =
  "relative rounded-[20px] overflow-hidden border shadow-[0_10px_24px_rgba(0,0,0,0.22)] h-full";

const flatKpiTitle =
  "px-4 py-1.5 text-center text-lg font-bold uppercase tracking-widest opacity-70 leading-none border-b";

const flatKpiValue =
  "px-4 pt-2 pb-0 text-center text-[36px] md:text-[42px] xl:text-[52px] leading-none font-black tabular-nums";

const flatKpiSub =
  "pt-1 pb-2 text-center text-sm font-semibold opacity-60";

const targetWrap =
  "h-full min-h-0 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,30,0.96),rgba(8,18,35,0.98))] shadow-[0_10px_28px_rgba(0,0,0,0.28)]";

const targetTopStrip =
  "bg-[linear-gradient(90deg,rgba(56,189,248,0.18),rgba(59,130,246,0.14),rgba(245,158,11,0.14),rgba(16,185,129,0.14),rgba(139,92,246,0.16))]";

const thBase =
  "relative overflow-hidden text-white font-black uppercase tracking-[0.05em] [text-shadow:0_1px_6px_rgba(0,0,0,0.22)]";

const thHours = "bg-slate-700 text-left";
const thTarget = "bg-slate-700 text-right";
const thCumTarget = "bg-slate-700 text-right";
const thActual = "bg-slate-700 text-right";
const thCumActual = "bg-slate-700 text-right";

const cellBase = "border-b border-white/8 font-bold";

const tdHours =
  "bg-[linear-gradient(180deg,rgba(43,66,95,0.96),rgba(35,55,78,0.96))] text-white";
const tdTarget =
  "bg-[linear-gradient(180deg,rgba(80,126,160,0.56),rgba(62,101,132,0.56))] text-white";
const tdCumTarget =
  "bg-[linear-gradient(180deg,rgba(118,100,46,0.82),rgba(105,88,40,0.82))] text-white";
const tdActual =
  "bg-[linear-gradient(180deg,rgba(84,117,117,0.88),rgba(71,100,100,0.88))]";
const tdCumActual =
  "bg-[linear-gradient(180deg,rgba(42,60,84,0.96),rgba(34,49,70,0.96))] text-white";

const tdTotalHours = "bg-slate-700 text-white";
const tdTotalTarget = "bg-slate-700 text-white";
const tdTotalCumTarget = "bg-slate-700 text-white";
const tdTotalActual = "bg-slate-700 text-white";
const tdTotalCumActual = "bg-slate-700 text-white";

function FlatInfoKpiCard({
  title,
  value,
  subtitle,
  cardClass,
  titleClass,
  valueClass,
  subClass,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  cardClass: string;
  titleClass?: string;
  valueClass?: string;
  subClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={cn(flatKpiBase, cardClass)}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_45%)] pointer-events-none" />
      {icon && (
        <div className="absolute top-4 right-4 opacity-10 w-14 h-14 pointer-events-none">
          {icon}
        </div>
      )}
      <div className={cn(flatKpiTitle, titleClass)}>{title}</div>

      <CardContent className="p-0 min-h-[112px] flex flex-col items-center justify-center">
        <div className={cn(flatKpiValue, valueClass)}>{value}</div>
        {subtitle ? <div className={cn(flatKpiSub, subClass)}>{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}

function WipRow({
  label,
  value,
  max,
  tone = "cyan",
  icon,
  compact = false,
  showMeta = true,
}: {
  label: string;
  value: number;
  max: number;
  tone?: WipTone;
  icon?: React.ReactNode;
  compact?: boolean;
  showMeta?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const toneStyle = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        "border-white/10 bg-slate-800/30 dark:bg-slate-800/50",
        "px-3 py-1.5"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-[18px] bg-white/8" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-1.5 left-0 w-[3px] rounded-r-full",
          toneStyle.fill
        )}
      />

      <div
        className={cn(
          "grid items-center",
          "grid-cols-[auto_minmax(0,1fr)_60px] gap-2"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[12px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_10px_rgba(0,0,0,0.16)]",
              toneStyle.iconWrap,
              "h-7 w-7"
            )}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-bold tracking-[0.01em] text-white leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.30)]",
                "text-sm"
              )}
            >
              {label}
            </div>

            {showMeta ? (
              <div className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-white/42 leading-none">
                {pct.toFixed(0)}% utilization
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div
            className={cn(
              "relative overflow-hidden rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
              toneStyle.rail,
              "h-2"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                toneStyle.fill,
                toneStyle.glow
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div
          className={cn(
            "rounded-[12px] border text-center tabular-nums font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_10px_rgba(0,0,0,0.14)]",
            toneStyle.chip,
            "px-2 py-1 text-xl"
          )}
        >
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function SlideOne({
  kpi,
  planVsActualRows,
  wip,
}: {
  kpi: KpiData;
  planVsActualRows: PlanVsActualRow[];
  wip: WipData;
}) {
  const efficiency = useCountUp(kpi.efficiency, 700);
  const dhu = useCountUp(kpi.dhu, 700);
  const reworkQty = useCountUp(kpi.reworkQty, 700);
  const reworkPct = useCountUp(kpi.reworkPct, 700);

  const hourCount = planVsActualRows.length;

  const computed = React.useMemo(() => {
    let running = 0;
    const all = planVsActualRows.map((r) => {
      running += r.actual ?? 0;
      return { ...r, achievement: running };
    });

    const totalTarget = all.reduce((s, x) => s + (x.plan ?? 0), 0);
    const totalActual = all.reduce((s, x) => s + (x.actual ?? 0), 0);

    return { all, totalTarget, totalActual };
  }, [planVsActualRows]);

  const cumTargetBySerial = React.useMemo(() => {
    let running = 0;
    const map = new Map<number, number>();
    for (const r of planVsActualRows) {
      running += Number(r.plan ?? 0);
      map.set(r.serial, running);
    }
    return map;
  }, [planVsActualRows]);

  const tableRows = React.useMemo(() => {
    return planVsActualRows.map((r) => ({
      ...r,
      cumTarget: cumTargetBySerial.get(r.serial) ?? 0,
    }));
  }, [planVsActualRows, cumTargetBySerial]);

  const visibleWipRows = React.useMemo(() => {
    const map = new Map(
      (wip.partWipRows ?? []).map((r) => {
        const partName = String(r.label).replace(/\s*wip\s*$/i, "").trim();
        return [normalizeKey(partName), r] as const;
      })
    );

    return DEFAULT_PARTS.map((part) => {
      return (
        map.get(normalizeKey(part)) ?? {
          label: `${part} WIP`,
          value: 0,
          max: 1,
        }
      );
    });
  }, [wip.partWipRows]);

  const isCompactWip = visibleWipRows.length >= 4 || hourCount >= 8;

const wipMeta: Record<string, { tone: WipTone; icon: React.ReactNode }> = {
  front: {
    tone: "orange",
    icon: <Shirt className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />,
  },
  back: {
    tone: "cyan",
    icon: <PanelTop className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />,
  },
  sleeve: {
    tone: "blue",
    icon: <Scissors className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />,
  },
  collar: {
    tone: "amber",
    icon: <BadgeCheck className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />,
  },
  hood: {
    tone: "violet",
    icon: <Layers3 className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />,
  },
};

const thPad =
  hourCount >= 10
    ? "px-3 py-1.5 text-[14px]"
    : hourCount >= 8
    ? "px-3 py-2 text-[15px]"
    : "px-4 py-2.5 text-[16px]";

const tdPad =
  hourCount >= 10
    ? "px-3 py-1.5"
    : hourCount >= 8
    ? "px-3 py-2"
    : "px-4 py-2.5";

const tdNum =
  hourCount >= 10
    ? "text-[18px] font-black"
    : hourCount >= 8
    ? "text-[20px] font-black"
    : "text-[22px] font-black";

  return (
    <div className="h-full w-full p-2 text-white">
      <div className="grid h-full grid-rows-[160px_minmax(0,1fr)] gap-2">
        <div className="grid h-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <FlatInfoKpiCard
            title="Target / Actual"
            value={
              <div className="flex items-center justify-center gap-3">
                <span className="text-slate-800 dark:text-white">
                  {Math.round(kpi.target).toLocaleString()}
                </span>
                <span className="text-slate-400 dark:text-white/40 text-[28px] md:text-[32px] xl:text-[36px] leading-none">
                  /
                </span>
                <span className="text-slate-800 dark:text-white">
                  {Math.round(kpi.actual).toLocaleString()}
                </span>
              </div>
            }
            subtitle={`A: ${Math.round(kpi.actual).toLocaleString()} • T: ${Math.round(kpi.target).toLocaleString()}`}
            icon={<Target className="w-full h-full" />}
            cardClass="border-slate-200 bg-white dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 shadow-2xl rounded-2xl"
            titleClass="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-white/70 border-b border-slate-200 dark:border-white/10"
            valueClass="text-slate-800 dark:text-white"
            subClass="text-slate-500 dark:text-white/60"
          />

          <FlatInfoKpiCard
            title="Efficiency"
            value={<span className="text-green-700 dark:text-white">{efficiency.toFixed(1)}%</span>}
            subtitle="Today"
            icon={<Zap className="w-full h-full" />}
            cardClass="border-green-200 bg-green-50 dark:border-green-600/40 dark:bg-gradient-to-br dark:from-green-900 dark:to-slate-900 shadow-2xl rounded-2xl"
            titleClass="bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200/70 border-b border-green-200 dark:border-green-700/30"
            valueClass="text-green-700 dark:text-white"
            subClass="text-green-600 dark:text-green-300/60"
          />

          <FlatInfoKpiCard
            title="DHU"
            value={<span className="text-purple-700 dark:text-white">{dhu.toFixed(1)}%</span>}
            subtitle="Today"
            icon={<AlertTriangle className="w-full h-full" />}
            cardClass="border-purple-200 bg-purple-50 dark:border-purple-600/40 dark:bg-gradient-to-br dark:from-purple-900 dark:to-slate-900 shadow-2xl rounded-2xl"
            titleClass="bg-purple-100 dark:bg-purple-800/40 text-purple-800 dark:text-purple-200/70 border-b border-purple-200 dark:border-purple-700/30"
            valueClass="text-purple-700 dark:text-white"
            subClass="text-purple-600 dark:text-purple-300/60"
          />

          <FlatInfoKpiCard
            title="Rework Qty"
            value={<span className="text-orange-700 dark:text-white">{Math.round(reworkQty).toLocaleString()}</span>}
            subtitle={`${reworkPct.toFixed(1)}% • Today`}
            icon={<RefreshCwIcon className="w-full h-full" />}
            cardClass="border-orange-200 bg-orange-50 dark:border-orange-600/40 dark:bg-gradient-to-br dark:from-orange-900 dark:to-slate-900 shadow-2xl rounded-2xl"
            titleClass="bg-orange-100 dark:bg-orange-800/40 text-orange-800 dark:text-orange-200/70 border-b border-orange-200 dark:border-orange-700/30"
            valueClass="text-orange-700 dark:text-white"
            subClass="text-orange-600 dark:text-orange-300/60"
          />
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-[1.15fr_0.85fr]">
            <Card
        className={cn(
            panelCard,
            "h-full min-h-0 flex flex-col border-white/10",
            "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_24%),linear-gradient(180deg,#0b1425_0%,#09111f_55%,#08101b_100%)]"
        )}
        >
        <CardHeader className="relative pb-0 pt-0.5 shrink-0">
            <div className="flex items-end justify-between">
            <CardTitle className="text-white font-black tracking-tight text-[34px] xl:text-[40px] leading-none drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)]">
                Target vs Actual
            </CardTitle>
            </div>
        </CardHeader>

        <CardContent className="pt-0 pb-2 flex-1 min-h-0">
            <div className={cn(targetWrap, "h-full min-h-0 flex flex-col")}>
            <div className={cn("h-1 w-full shrink-0", targetTopStrip)} />

            <div className="shrink-0">
                <table className="w-full table-fixed border-collapse text-white">
                <thead>
                    <tr>
                    <th className={cn(thBase, thHours, thPad)}>Hours</th>
                    <th className={cn(thBase, thTarget, thPad)}>Target</th>
                    <th className={cn(thBase, thCumTarget, thPad)}>Cum Target</th>
                    <th className={cn(thBase, thActual, thPad)}>Actual</th>
                    <th className={cn(thBase, thCumActual, thPad)}>Cum Actual</th>
                    </tr>
                </thead>
                </table>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                <table className="w-full table-fixed border-collapse text-white">
                <tbody>
                    {tableRows.map((r, idx) => {
                    const ok = (r.actual ?? 0) >= (r.plan ?? 0);
                    const cum =
                        computed.all.find((x) => x.serial === r.serial)?.achievement ?? 0;

                    return (
                        <tr
                        key={r.serial}
                        className={cn(
                            "h-[52px]",
                            idx % 2 === 0 ? "bg-slate-900/60" : "bg-slate-800/40",
                            "hover:bg-slate-700/40 transition-colors duration-200"
                        )}
                        >
                        <td className={cn(cellBase, tdHours, tdPad)}>
                            <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.10] text-[13px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_3px_8px_rgba(0,0,0,0.16)]">
                                {r.serial}
                            </div>
                            <div className="text-[14px] font-extrabold tracking-[0.015em] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.34)]">
                                Hour {r.serial}
                            </div>
                            </div>
                        </td>

                        <td className={cn(cellBase, tdTarget, tdPad, "text-right")}>
                            <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                            {r.plan}
                            </span>
                        </td>

                        <td className={cn(cellBase, tdCumTarget, tdPad, "text-right")}>
                            <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                            {r.cumTarget}
                            </span>
                        </td>

                       <td className={cn(cellBase, tdActual, tdPad, "text-right")}>
                        <div className="flex justify-end">
                          <span
                            className={cn(
                              "inline-flex min-w-[72px] justify-center rounded-full border px-3 py-1",
                              "text-lg font-black leading-none tabular-nums",
                              ok
                                ? "border-green-500/30 bg-green-500/20 text-green-400"
                                : "border-red-500/30 bg-red-500/20 text-red-400"
                            )}
                          >
                            {r.actual}
                          </span>
                        </div>
                      </td>

                        <td className={cn(cellBase, tdCumActual, tdPad, "text-right")}>
                            <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                            {cum}
                            </span>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>

            <div className="shrink-0 border-t-2 border-slate-500">
                <table className="w-full table-fixed border-collapse text-white">
                <tfoot>
                    <tr>
                    <td className={cn(tdTotalHours, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5")}>
                        <div className="rounded-full border border-white/10 bg-white/[0.10] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] w-fit">
                        Total
                        </div>
                    </td>

                    <td className={cn(tdTotalTarget, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                        <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                        {computed.totalTarget}
                        </span>
                    </td>

                    <td className={cn(tdTotalCumTarget, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                        <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                        {computed.totalTarget}
                        </span>
                    </td>

                    <td className={cn(tdTotalActual, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                        <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                        {computed.totalActual}
                        </span>
                    </td>

                    <td className={cn(tdTotalCumActual, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                        <span className={cn(tdNum, "tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.24)]")}>
                        {computed.totalActual}
                        </span>
                    </td>
                    </tr>
                </tfoot>
                </table>
            </div>
            </div>
        </CardContent>
        </Card>

         <Card
  className={cn(
    panelCard,
    "h-full min-h-0 flex flex-col overflow-hidden border-white/10",
    "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#0f172a_0%,#0a1220_50%,#09101d_100%)]"
  )}
>
  <CardHeader className="relative pb-0 pt-1 shrink-0">
    <div className="flex items-center justify-between">
      <CardTitle className="text-white font-black tracking-tight text-2xl xl:text-3xl leading-none drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)]">
        WIP Summary
      </CardTitle>

      <div className="rounded-full border border-cyan-300/20 bg-cyan-400/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_4px_12px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)]">
        Live
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-1 pb-1.5 flex-1 min-h-0">
    <div className="grid h-full content-start gap-1">
      <div className="grid gap-1">
        <WipRow
          label="Total Input"
          value={wip.totalInput}
          max={Math.max(1, wip.totalInput)}
          tone="blue"
          icon={<ArrowDownToLine className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
          compact
          showMeta={false}
        />

        <WipRow
          label="Total Output"
          value={wip.totalOutput}
          max={Math.max(1, wip.totalInput)}
          tone="emerald"
          icon={<ArrowUpFromLine className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
          compact
          showMeta={false}
        />

        <WipRow
          label="Line WIP"
          value={wip.lineWip}
          max={Math.max(1, wip.lineWip)}
          tone="violet"
          icon={<Layers3 className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
          compact
          showMeta={false}
        />
      </div>

      <div className="relative py-1">
        <div className="h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-slate-900/95 px-2.5 py-[3px] text-[8px] font-black uppercase tracking-[0.14em] text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          Process WIP
        </div>
      </div>

      <div className="grid gap-1">
        {visibleWipRows.map((r, idx) => {
          const partName = String(r.label)
            .replace(/\s*wip\s*$/i, "")
            .trim()
            .toLowerCase();

          const meta = wipMeta[partName] ?? {
            tone: "slate" as WipTone,
            icon: <Layers3 className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />,
          };

          return (
            <WipRow
              key={`${r.label}-${idx}`}
              label={r.label}
              value={r.value}
              max={Math.max(1, r.max)}
              tone={meta.tone}
              icon={meta.icon}
              compact
              showMeta={false}
            />
          );
        })}
      </div>
    </div>
  </CardContent>
</Card>
        </div>
      </div>
    </div>
  );
}
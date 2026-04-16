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
  "px-4 py-2.5 text-center text-[16px] md:text-[18px] xl:text-[19px] font-black uppercase tracking-[0.08em] leading-none [text-shadow:0_1px_0_rgba(0,0,0,0.12)]";

const flatKpiValue =
  "px-4 pt-1 pb-0 text-center text-[42px] md:text-[48px] xl:text-[54px] leading-none font-black tabular-nums";

const flatKpiSub =
  "pt-1 pb-3 text-center text-[13px] md:text-[14px] xl:text-[15px] font-black uppercase tracking-[0.08em] opacity-95";

const targetWrap =
  "h-full min-h-0 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,30,0.96),rgba(8,18,35,0.98))] shadow-[0_10px_28px_rgba(0,0,0,0.28)]";

const targetTopStrip =
  "bg-[linear-gradient(90deg,rgba(56,189,248,0.18),rgba(59,130,246,0.14),rgba(245,158,11,0.14),rgba(16,185,129,0.14),rgba(139,92,246,0.16))]";

const thBase =
  "relative overflow-hidden text-white font-black uppercase tracking-[0.05em] [text-shadow:0_1px_6px_rgba(0,0,0,0.22)]";

const thHours = "bg-[linear-gradient(180deg,#2a6a89,#22556f)] text-left";
const thTarget = "bg-[linear-gradient(180deg,#41afe2,#2d8ec0)] text-right";
const thCumTarget = "bg-[linear-gradient(180deg,#e6b92b,#bf9318)] text-right";
const thActual = "bg-[linear-gradient(180deg,#67cdbf,#45aea2)] text-right";
const thCumActual = "bg-[linear-gradient(180deg,#3b6488,#2c4c67)] text-right";

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

const tdTotalHours = "bg-[linear-gradient(180deg,#294261,#203650)] text-white";
const tdTotalTarget = "bg-[linear-gradient(180deg,#4d89b0,#3a6d90)] text-white";
const tdTotalCumTarget = "bg-[linear-gradient(180deg,#b48d21,#8e6f15)] text-white";
const tdTotalActual = "bg-[linear-gradient(180deg,#4aa79f,#3b8f88)] text-white";
const tdTotalCumActual = "bg-[linear-gradient(180deg,#314f6e,#233a52)] text-white";

function FlatInfoKpiCard({
  title,
  value,
  subtitle,
  cardClass,
  titleClass,
  valueClass,
  subClass,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  cardClass: string;
  titleClass?: string;
  valueClass?: string;
  subClass?: string;
}) {
  return (
    <Card className={cn(flatKpiBase, cardClass)}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_45%)] pointer-events-none" />
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
        "group relative overflow-hidden rounded-[18px] border transition-all duration-300",
        "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))]",
        "shadow-[0_8px_20px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.05)]",
        compact ? "px-3.5 py-2.5" : "px-4 py-3"
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
          compact
            ? "grid-cols-[auto_minmax(0,1fr)_72px] gap-2.5"
            : "grid-cols-[auto_minmax(0,1fr)_82px] gap-3"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[12px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_10px_rgba(0,0,0,0.16)]",
              toneStyle.iconWrap,
              compact ? "h-9 w-9" : "h-10 w-10"
            )}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-black tracking-[0.01em] text-white leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.30)]",
                compact ? "text-[14px]" : "text-[15px]"
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
              compact ? "h-4" : "h-4.5"
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
            compact ? "px-3 py-2 text-[16px]" : "px-3 py-2 text-[17px]"
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
      <div className="grid h-full grid-rows-[200px_minmax(0,1fr)] gap-2">
        <div className="grid h-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <FlatInfoKpiCard
            title="Target / Actual"
            value={
              <div className="flex items-center justify-center gap-3">
                <span className="text-[#1e1e1e] drop-shadow-[0_1px_0_rgba(255,255,255,0.28)]">
                  {Math.round(kpi.target).toLocaleString()}
                </span>
                <span className="text-[#6e6e6e] text-[28px] md:text-[32px] xl:text-[36px] leading-none">
                  /
                </span>
                <span className="text-[#111] drop-shadow-[0_1px_0_rgba(255,255,255,0.18)]">
                  {Math.round(kpi.actual).toLocaleString()}
                </span>
              </div>
            }
            subtitle={`A: ${Math.round(kpi.actual).toLocaleString()} • T: ${Math.round(kpi.target).toLocaleString()}`}
            cardClass="border-[#c7c9cf] bg-[linear-gradient(180deg,#ececec_0%,#d8d8d8_100%)]"
            titleClass="bg-[linear-gradient(180deg,#d9d9d9_0%,#c9c9c9_100%)] text-[#2b2b2b] border-b border-[#b8b8b8]"
            valueClass="text-[#222]"
            subClass="text-[#555]"
          />

          <FlatInfoKpiCard
            title="Efficiency"
            value={<span className="text-white">{efficiency.toFixed(1)}%</span>}
            subtitle="Today"
            cardClass="border-[#43a44b] bg-[linear-gradient(135deg,#58c15a_0%,#45a94d_100%)]"
            titleClass="bg-[linear-gradient(180deg,#4aa84b_0%,#3f9443_100%)] text-white border-b border-[#357c38]"
            valueClass="text-white"
            subClass="text-white/90"
          />

          <FlatInfoKpiCard
            title="DHU"
            value={<span className="text-white">{dhu.toFixed(1)}%</span>}
            subtitle="Today"
            cardClass="border-[#8b48ef] bg-[linear-gradient(135deg,#a855f7_0%,#8b46ea_100%)]"
            titleClass="bg-[linear-gradient(180deg,#9a50f3_0%,#7d41d6_100%)] text-white border-b border-[#6b35b9]"
            valueClass="text-white"
            subClass="text-white/90"
          />

          <FlatInfoKpiCard
            title="Rework Qty"
            value={<span className="text-white">{Math.round(reworkQty).toLocaleString()}</span>}
            subtitle={`${reworkPct.toFixed(1)}% • Today`}
            cardClass="border-[#e28a12] bg-[linear-gradient(135deg,#ffa200_0%,#f38b00_100%)]"
            titleClass="bg-[linear-gradient(180deg,#f19500_0%,#dd7d00_100%)] text-white border-b border-[#bf6800]"
            valueClass="text-white"
            subClass="text-white/90"
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
                            idx % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent",
                            "hover:bg-white/[0.035] transition-colors duration-200"
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
                              "inline-flex min-w-[72px] justify-center rounded-full border px-4 py-1",
                              "text-[20px] font-black leading-none tabular-nums tracking-[-0.02em]",
                              "text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]",
                              "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_14px_rgba(0,0,0,0.18)]",
                              ok
                                ? "border-emerald-200/28 bg-[linear-gradient(180deg,rgba(52,211,153,0.26),rgba(16,185,129,0.20))]"
                                : "border-rose-200/28 bg-[linear-gradient(180deg,rgba(251,113,133,0.26),rgba(225,29,72,0.20))]"
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

            <div className="shrink-0 border-t border-white/10">
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
      <CardTitle className="text-white font-black tracking-tight text-[34px] xl:text-[40px] leading-none drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)]">
        WIP Summary
      </CardTitle>

      <div className="rounded-full border border-cyan-300/20 bg-cyan-400/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_4px_12px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)]">
        Live
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-1 pb-1.5 flex-1 min-h-0">
    <div className="grid h-full content-start gap-1.5">
      <div className="grid gap-1.5">
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

      <div className="grid gap-1.5">
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
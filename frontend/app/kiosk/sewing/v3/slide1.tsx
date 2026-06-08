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
    const to = value;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(to * eased);
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
    chipActive: string;
    iconWrap: string;
    glow: string;
    accent: string;
  }
> = {
  blue: {
    rail: "bg-blue-500/10 border-blue-300/10",
    fill: "bg-[linear-gradient(90deg,#60a5fa_0%,#3b82f6_100%)]",
    chip: "bg-blue-400/15 text-blue-200 border-blue-300/25",
    chipActive: "bg-blue-500/75 text-white border-blue-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(96,165,250,0.28),rgba(37,99,235,0.22))] text-blue-200 border-blue-300/25",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.35)]",
    accent: "border-blue-500/60",
  },
  cyan: {
    rail: "bg-cyan-500/10 border-cyan-300/10",
    fill: "bg-[linear-gradient(90deg,#67e8f9_0%,#06b6d4_100%)]",
    chip: "bg-cyan-400/15 text-cyan-200 border-cyan-300/25",
    chipActive: "bg-cyan-500/75 text-white border-cyan-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(103,232,249,0.26),rgba(8,145,178,0.22))] text-cyan-200 border-cyan-300/25",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.35)]",
    accent: "border-cyan-500/60",
  },
  emerald: {
    rail: "bg-emerald-500/10 border-emerald-300/10",
    fill: "bg-[linear-gradient(90deg,#6ee7b7_0%,#10b981_100%)]",
    chip: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25",
    chipActive: "bg-emerald-500/75 text-white border-emerald-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(110,231,183,0.26),rgba(5,150,105,0.22))] text-emerald-200 border-emerald-300/25",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.35)]",
    accent: "border-emerald-500/60",
  },
  violet: {
    rail: "bg-violet-500/10 border-violet-300/10",
    fill: "bg-[linear-gradient(90deg,#a78bfa_0%,#7c3aed_100%)]",
    chip: "bg-violet-400/15 text-violet-200 border-violet-300/25",
    chipActive: "bg-violet-500/75 text-white border-violet-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(167,139,250,0.26),rgba(109,40,217,0.22))] text-violet-200 border-violet-300/25",
    glow: "shadow-[0_0_18px_rgba(139,92,246,0.35)]",
    accent: "border-violet-500/60",
  },
  amber: {
    rail: "bg-amber-500/10 border-amber-300/10",
    fill: "bg-[linear-gradient(90deg,#fde68a_0%,#f59e0b_100%)]",
    chip: "bg-amber-400/15 text-amber-200 border-amber-300/25",
    chipActive: "bg-amber-500/75 text-white border-amber-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(253,230,138,0.28),rgba(217,119,6,0.22))] text-amber-200 border-amber-300/25",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.35)]",
    accent: "border-amber-500/60",
  },
  orange: {
    rail: "bg-orange-500/10 border-orange-300/10",
    fill: "bg-[linear-gradient(90deg,#fdba74_0%,#f97316_100%)]",
    chip: "bg-orange-400/15 text-orange-200 border-orange-300/25",
    chipActive: "bg-orange-500/75 text-white border-orange-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(253,186,116,0.28),rgba(234,88,12,0.22))] text-orange-200 border-orange-300/25",
    glow: "shadow-[0_0_18px_rgba(249,115,22,0.35)]",
    accent: "border-orange-500/60",
  },
  pink: {
    rail: "bg-pink-500/10 border-pink-300/10",
    fill: "bg-[linear-gradient(90deg,#f9a8d4_0%,#ec4899_100%)]",
    chip: "bg-pink-400/15 text-pink-200 border-pink-300/25",
    chipActive: "bg-pink-500/75 text-white border-pink-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(249,168,212,0.28),rgba(219,39,119,0.22))] text-pink-200 border-pink-300/25",
    glow: "shadow-[0_0_18px_rgba(236,72,153,0.35)]",
    accent: "border-pink-500/60",
  },
  slate: {
    rail: "bg-slate-500/10 border-slate-300/10",
    fill: "bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)]",
    chip: "bg-slate-400/15 text-slate-300 border-slate-300/25",
    chipActive: "bg-slate-500/70 text-white border-slate-400/60",
    iconWrap:
      "bg-[linear-gradient(135deg,rgba(148,163,184,0.22),rgba(71,85,105,0.22))] text-slate-300 border-slate-300/25",
    glow: "shadow-[0_0_18px_rgba(100,116,139,0.25)]",
    accent: "border-slate-500/40",
  },
};

/* ── Styling constants ── */
const flatKpiBase = "relative rounded-[20px] overflow-hidden border h-full";

const flatKpiTitle =
  "kiosk-kpi-title px-4 py-2.5 text-center text-[14px] font-black uppercase leading-none border-b border-white/10 text-white kiosk-header tracking-[0.15em]";

const flatKpiValue =
  "kiosk-kpi-value px-4 pt-3 pb-0 text-center text-[46px] md:text-[54px] xl:text-[62px] leading-none font-black tabular-nums kiosk-data";

const flatKpiSub = "kiosk-kpi-sub pt-2 pb-3 text-center text-[14px] font-semibold opacity-55 kiosk-data";

const thBase =
  "relative overflow-hidden text-white font-black uppercase tracking-[0.1em] [text-shadow:0_1px_6px_rgba(0,0,0,0.28)]";

const thHours    = "bg-[#1E3A8A] text-left";
const thTarget   = "bg-[#065F46] text-right";
const thCumTarget= "bg-[#6D28D9] text-right";
const thActual   = "bg-[#92400E] text-right";
const thCumActual= "bg-[#0E4E6B] text-right";

const cellBase = "border-b border-white/8 font-bold";

const tdHours    = "bg-[linear-gradient(180deg,rgba(30,58,138,0.55),rgba(24,46,110,0.55))]";
const tdTarget   = "bg-[linear-gradient(180deg,rgba(6,95,70,0.45),rgba(5,76,57,0.45))]";
const tdCumTarget= "bg-[linear-gradient(180deg,rgba(109,40,217,0.38),rgba(88,32,174,0.38))]";
const tdActual   = "bg-[linear-gradient(180deg,rgba(146,64,14,0.45),rgba(120,53,10,0.45))]";
const tdCumActual= "bg-[linear-gradient(180deg,rgba(14,78,107,0.45),rgba(11,63,87,0.45))]";

const tdTotalHours    = "bg-[#1A2E5E]";
const tdTotalTarget   = "bg-[#064E3B]";
const tdTotalCumTarget= "bg-[#5B21B6]";
const tdTotalActual   = "bg-[#78350F]";
const tdTotalCumActual= "bg-[#0C4A6E]";

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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_45%)] pointer-events-none" />
      {icon && (
        <div className="absolute top-4 right-4 opacity-8 w-14 h-14 pointer-events-none">{icon}</div>
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
  const isActive = value > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-300",
        isActive
          ? cn("border-white/12 bg-slate-800/45", toneStyle.accent)
          : "border-white/6 bg-slate-800/20",
        "px-3 py-1.5",
        !isActive && "opacity-40"
      )}
      style={{
        backdropFilter: isActive ? "blur(8px)" : undefined,
        borderLeft: isActive ? undefined : undefined,
      }}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-1.5 left-0 w-[3px] rounded-r-full transition-opacity",
          toneStyle.fill,
          isActive ? "opacity-100" : "opacity-20"
        )}
      />

      <div className="grid items-center grid-cols-[auto_minmax(0,1fr)_64px] gap-2 pl-2">
        {/* Icon + label */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[12px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_10px_rgba(0,0,0,0.18)]",
              toneStyle.iconWrap,
              "h-7 w-7",
              !isActive && "opacity-60"
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold tracking-[0.01em] text-white leading-none text-[14px]">
              {label}
            </div>
            {showMeta ? (
              <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.13em] text-white/38 leading-none">
                {pct.toFixed(0)}% utilized
              </div>
            ) : null}
          </div>
        </div>

        {/* Progress bar — thicker */}
        <div className="min-w-0">
          <div
            className={cn(
              "relative overflow-hidden rounded-full border",
              toneStyle.rail,
              "h-3.5"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                toneStyle.fill,
                isActive && toneStyle.glow
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Value badge */}
        <div
          className={cn(
            "rounded-[12px] border text-center tabular-nums font-black leading-none",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_10px_rgba(0,0,0,0.14)]",
            isActive ? toneStyle.chipActive : toneStyle.chip,
            "px-2 py-1 text-[18px]"
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
  const dhu        = useCountUp(kpi.dhu, 700);
  const reworkQty  = useCountUp(kpi.reworkQty, 700);
  const reworkPct  = useCountUp(kpi.reworkPct, 700);

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

  const tableRows = React.useMemo(
    () => planVsActualRows.map((r) => ({ ...r, cumTarget: cumTargetBySerial.get(r.serial) ?? 0 })),
    [planVsActualRows, cumTargetBySerial]
  );

  const visibleWipRows = React.useMemo(() => {
    const map = new Map(
      (wip.partWipRows ?? []).map((r) => {
        const partName = String(r.label).replace(/\s*wip\s*$/i, "").trim();
        return [normalizeKey(partName), r] as const;
      })
    );
    return DEFAULT_PARTS.map(
      (part) => map.get(normalizeKey(part)) ?? { label: `${part} WIP`, value: 0, max: 1 }
    );
  }, [wip.partWipRows]);

  const isCompactWip = visibleWipRows.length >= 4 || hourCount >= 8;

  const wipMeta: Record<string, { tone: WipTone; icon: React.ReactNode }> = {
    front:  { tone: "orange", icon: <Shirt    className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} /> },
    back:   { tone: "cyan",   icon: <PanelTop className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} /> },
    sleeve: { tone: "blue",   icon: <Scissors className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} /> },
    collar: { tone: "amber",  icon: <BadgeCheck className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} /> },
    hood:   { tone: "violet", icon: <Layers3  className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} /> },
  };

  const thPad =
    hourCount >= 10 ? "px-3 py-2 text-[14px]" :
    hourCount >= 8  ? "px-3 py-2.5 text-[15px]" :
                      "px-4 py-3 text-[16px]";

  const tdPad =
    hourCount >= 10 ? "px-3 py-1.5" :
    hourCount >= 8  ? "px-3 py-2" :
                      "px-4 py-2.5";

  const tdNum =
    hourCount >= 10 ? "text-[18px] font-black" :
    hourCount >= 8  ? "text-[20px] font-black" :
                      "text-[22px] font-black";

  return (
    <div className="h-full w-full p-2 text-white">
      <div className="grid h-full grid-rows-[168px_minmax(0,1fr)] gap-2">

        {/* ── KPI cards row ── */}
        <div className="grid h-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {/* Target / Actual — blue */}
          <FlatInfoKpiCard
            title="Target / Actual"
            value={
              <div className="flex items-center justify-center gap-3">
                <span className="text-white">{Math.round(kpi.target).toLocaleString()}</span>
                <span className="text-white/30 text-[30px] leading-none">/</span>
                <span className="text-white">{Math.round(kpi.actual).toLocaleString()}</span>
              </div>
            }
            subtitle={`A: ${Math.round(kpi.actual).toLocaleString()} • T: ${Math.round(kpi.target).toLocaleString()}`}
            icon={<Target className="w-full h-full" />}
            cardClass="kiosk-kpi-blue border-blue-500/30 bg-gradient-to-br from-[#0A1628] to-[#060E1A] shadow-[0_0_32px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(59,130,246,0.12)]"
            titleClass="bg-[#1E3A8A]"
            valueClass="text-white"
            subClass="text-white/55"
          />

          {/* Efficiency — emerald */}
          <FlatInfoKpiCard
            title="Efficiency"
            value={<span className="text-emerald-300">{efficiency.toFixed(1)}%</span>}
            subtitle="Today"
            icon={<Zap className="w-full h-full" />}
            cardClass="kiosk-kpi-emerald border-emerald-500/30 bg-gradient-to-br from-[#071A10] to-[#040E09] shadow-[0_0_32px_rgba(16,185,129,0.22),inset_0_1px_0_rgba(16,185,129,0.12)]"
            titleClass="bg-[#065F46]"
            valueClass="text-emerald-300"
            subClass="text-emerald-300/55"
          />

          {/* DHU — purple */}
          <FlatInfoKpiCard
            title="DHU"
            value={<span className="text-purple-300">{dhu.toFixed(1)}%</span>}
            subtitle="Today"
            icon={<AlertTriangle className="w-full h-full" />}
            cardClass="kiosk-kpi-purple border-purple-500/30 bg-gradient-to-br from-[#130A22] to-[#0A0614] shadow-[0_0_32px_rgba(168,85,247,0.22),inset_0_1px_0_rgba(168,85,247,0.12)]"
            titleClass="bg-[#6D28D9]"
            valueClass="text-purple-300"
            subClass="text-purple-300/55"
          />

          {/* Rework — amber */}
          <FlatInfoKpiCard
            title="Rework Qty"
            value={<span className="text-amber-300">{Math.round(reworkQty).toLocaleString()}</span>}
            subtitle={`${reworkPct.toFixed(1)}% • Today`}
            icon={<RefreshCwIcon className="w-full h-full" />}
            cardClass="kiosk-kpi-amber border-amber-500/30 bg-gradient-to-br from-[#1A0E04] to-[#0D0702] shadow-[0_0_32px_rgba(245,158,11,0.22),inset_0_1px_0_rgba(245,158,11,0.12)]"
            titleClass="bg-[#92400E]"
            valueClass="text-amber-300"
            subClass="text-amber-300/55"
          />
        </div>

        {/* ── Bottom row ── */}
        <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-[1.15fr_0.85fr]">

          {/* Target vs Actual */}
          <Card
            className="h-full min-h-0 flex flex-col overflow-hidden rounded-[22px] border border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.5)]"
            style={{
              background: "var(--kiosk-card, rgba(8,15,30,0.97))",
              backdropFilter: "blur(10px)",
            }}
          >
            <CardHeader className="relative pb-0 pt-2 shrink-0">
              <CardTitle className="kiosk-header text-white font-bold tracking-tight text-[32px] xl:text-[38px] leading-none drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)]">
                Target vs Actual
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-1 pb-2 flex-1 min-h-0">
              <div
                className="h-full min-h-0 overflow-hidden rounded-[20px] border border-white/10 flex flex-col"
                style={{ background: "linear-gradient(180deg, #060E1C, #040A14)" }}
              >
                {/* Colored top stripe */}
                <div
                  className="h-[3px] w-full shrink-0"
                  style={{
                    background:
                      "linear-gradient(90deg, #1E3A8A 0%, #065F46 25%, #6D28D9 50%, #92400E 75%, #0E4E6B 100%)",
                  }}
                />

                {/* Sticky header */}
                <div className="shrink-0">
                  <table className="w-full table-fixed border-collapse text-white">
                    <thead>
                      <tr>
                        <th className={cn(thBase, thHours,     thPad)}>Hours</th>
                        <th className={cn(thBase, thTarget,    thPad)}>Target</th>
                        <th className={cn(thBase, thCumTarget, thPad)}>Cum Target</th>
                        <th className={cn(thBase, thActual,    thPad)}>Actual</th>
                        <th className={cn(thBase, thCumActual, thPad)}>Cum Actual</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Scrollable body */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <table className="w-full table-fixed border-collapse" style={{ color: "var(--kiosk-text, #CBD5E1)" }}>
                    <tbody>
                      {tableRows.map((r, idx) => {
                        const ok = (r.actual ?? 0) >= (r.plan ?? 0);
                        const cum = computed.all.find((x) => x.serial === r.serial)?.achievement ?? 0;
                        const bg = idx % 2 === 0 ? "var(--kiosk-row-odd, #0F1629)" : "var(--kiosk-row-even, #151C35)";

                        return (
                          <tr
                            key={r.serial}
                            className="transition-colors duration-200"
                            style={{ background: bg }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                "var(--kiosk-row-hover, #1E2B45)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = bg;
                            }}
                          >
                            <td className={cn(cellBase, tdHours, tdPad)}>
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/10 text-[13px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                                  {r.serial}
                                </div>
                                <span className="text-[15px] font-bold tracking-[0.01em] text-white kiosk-data">
                                  Hour {r.serial}
                                </span>
                              </div>
                            </td>
                            <td className={cn(cellBase, tdTarget,    tdPad, "text-right")}>
                              <span className={cn(tdNum, "tabular-nums text-white kiosk-data")}>{r.plan}</span>
                            </td>
                            <td className={cn(cellBase, tdCumTarget, tdPad, "text-right")}>
                              <span className={cn(tdNum, "tabular-nums text-white kiosk-data")}>{r.cumTarget}</span>
                            </td>
                            <td className={cn(cellBase, tdActual, tdPad, "text-right")}>
                              <div className="flex justify-end">
                                <span
                                  className={cn(
                                    "inline-flex min-w-[72px] justify-center rounded-full border px-3 py-1",
                                    "text-[18px] font-black leading-none tabular-nums kiosk-data",
                                    ok
                                      ? "border-emerald-500/35 bg-emerald-500/22 text-emerald-300"
                                      : "border-rose-500/35 bg-rose-500/22 text-rose-300"
                                  )}
                                >
                                  {r.actual}
                                </span>
                              </div>
                            </td>
                            <td className={cn(cellBase, tdCumActual, tdPad, "text-right")}>
                              <span className={cn(tdNum, "tabular-nums text-white kiosk-data")}>{cum}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals footer */}
                <div className="shrink-0 border-t-2 border-white/15">
                  <table className="w-full table-fixed border-collapse text-white">
                    <tfoot>
                      <tr>
                        <td className={cn(tdTotalHours,     hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5")}>
                          <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/85 w-fit">
                            Total
                          </div>
                        </td>
                        <td className={cn(tdTotalTarget,    hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                          <span className={cn(tdNum, "tabular-nums kiosk-data")}>{computed.totalTarget}</span>
                        </td>
                        <td className={cn(tdTotalCumTarget, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                          <span className={cn(tdNum, "tabular-nums kiosk-data")}>{computed.totalTarget}</span>
                        </td>
                        <td className={cn(tdTotalActual,    hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                          <span className={cn(tdNum, "tabular-nums kiosk-data")}>{computed.totalActual}</span>
                        </td>
                        <td className={cn(tdTotalCumActual, hourCount >= 8 ? "px-3 py-2" : "px-4 py-2.5", "text-right")}>
                          <span className={cn(tdNum, "tabular-nums kiosk-data")}>{computed.totalActual}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WIP Summary */}
          <Card
            className="h-full min-h-0 flex flex-col overflow-hidden rounded-[22px] border border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.5)]"
            style={{
              background: "var(--kiosk-card, rgba(7,16,30,0.97))",
              backdropFilter: "blur(10px)",
            }}
          >
            <CardHeader className="relative pb-0 pt-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="kiosk-header text-white font-bold tracking-tight text-2xl xl:text-3xl leading-none">
                  WIP Summary
                </CardTitle>
                <div className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                  Live
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-1.5 pb-2 flex-1 min-h-0">
              <div className="grid h-full content-start gap-1.5">
                <div className="grid gap-1.5">
                  <WipRow
                    label="Total Input"
                    value={wip.totalInput}
                    max={Math.max(1, wip.totalInput)}
                    tone="blue"
                    icon={<ArrowDownToLine className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
                    showMeta={false}
                  />
                  <WipRow
                    label="Total Output"
                    value={wip.totalOutput}
                    max={Math.max(1, wip.totalInput)}
                    tone="emerald"
                    icon={<ArrowUpFromLine className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
                    showMeta={false}
                  />
                  <WipRow
                    label="Line WIP"
                    value={wip.lineWip}
                    max={Math.max(1, wip.lineWip)}
                    tone="violet"
                    icon={<Layers3 className={isCompactWip ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
                    showMeta={false}
                  />
                </div>

                <div className="relative py-1">
                  <div className="h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#060E1C] px-2.5 py-[3px] text-[8px] font-black uppercase tracking-[0.14em] text-white/40">
                    Process WIP
                  </div>
                </div>

                <div className="grid gap-1.5">
                  {visibleWipRows.map((r, idx) => {
                    const partName = String(r.label).replace(/\s*wip\s*$/i, "").trim().toLowerCase();
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

"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Pause, Play, RefreshCw, Download } from "lucide-react";
import { useSewingDashboardV2 } from "@/hooks/api";
import { useKioskFilters } from "../../kiosk-context";
import { ArrowDownToLine, ArrowUpFromLine, Layers3, Scissors, Shirt, PanelTop, BadgeCheck } from "lucide-react";

/* ------------------ HELPERS ------------------ */
const toNum = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampHourCount = (n: number) => {
  const x = Math.floor(toNum(n, 0));
  return Math.max(1, Math.min(10, x || 0));
};

// ✅ target/hour must be <= 20
const clamp20 = (n: unknown) => Math.max(0, Math.min(20, Math.floor(toNum(n, 0))));

const DEFAULT_PARTS = ["Front", "Back", "Sleeve", "Collar", "Hood"];

const normalizeKey = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");

const padHours = (arr: unknown, len: number) =>
  Array.from({ length: len }).map((_, i) => toNum((arr as any)?.[i], 0));

const dhakaDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

function useInterval(callback: () => void, delay: number | null) {
  const cb = React.useRef(callback);
  React.useEffect(() => void (cb.current = callback), [callback]);

  React.useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => cb.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

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

function useAvailableHeight() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState<number>(0);

  const recalc = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const avail = Math.floor(window.innerHeight - rect.top - 6);
    setHeight(Math.max(360, avail));
  }, []);

  React.useLayoutEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(recalc) : null;
    if (ro && ref.current) ro.observe(ref.current);

    return () => {
      window.removeEventListener("resize", recalc);
      ro?.disconnect();
    };
  }, [recalc]);

  return { ref, height };
}




/* ------------------ TYPES ------------------ */
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

/* ------------------ STYLES ------------------ */
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



type PartWipRow = { part: string; target: number; hours: number[] };

type DefectBreakdownItem = { code: string; name?: string; description?: string; qty: number };
type QualityDetailLine = { lineId: number; lineName: string; defects: DefectBreakdownItem[] };

type QualityRow = {
  hour: number;
  dhu: number;
  defects: number;
  remarks: string[];
  details?: QualityDetailLine[];
};




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
        "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
        compact ? "px-3 py-2.5" : "px-3.5 py-3"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-[18px] bg-white/10" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-r-full",
          toneStyle.fill
        )}
      />

      <div
        className={cn(
          "grid items-center",
          compact
            ? "grid-cols-[auto_minmax(0,1fr)_62px] gap-2.5"
            : "grid-cols-[auto_minmax(0,1fr)_68px] gap-3"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
              toneStyle.iconWrap,
              compact ? "h-8 w-8" : "h-9 w-9"
            )}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-extrabold tracking-[0.01em] text-white leading-none",
                compact ? "text-[12px]" : "text-[13px]"
              )}
            >
              {label}
            </div>

            {showMeta ? (
              <div className="mt-1 text-[8px] font-medium uppercase tracking-[0.14em] text-white/45 leading-none">
                {pct.toFixed(0)}% utilization
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div
            className={cn(
              "relative overflow-hidden rounded-full border",
              toneStyle.rail,
              compact ? "h-3.5" : "h-4"
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
            "rounded-xl border text-center tabular-nums font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
            toneStyle.chip,
            compact ? "px-2.5 py-2 text-[14px]" : "px-3 py-2 text-[15px]"
          )}
        >
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}


  const shellBg =
  "bg-[radial-gradient(circle_at_top_left,#162033_0%,#0f172a_38%,#050814_100%)]";

  const tableHeadClass =
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.05))] text-white";
  
  const tableRowClass = "border-b border-white/10";
  
  
  
  /* ------------------ SIMPLE KPI UI ------------------ */
  const softPanel =
  "rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]";

const panelCard =
  "rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(14,22,40,0.96),rgba(7,12,24,0.98))] shadow-[0_14px_34px_rgba(0,0,0,0.34)] overflow-hidden";

const sectionTitle =
  "text-white font-black tracking-tight text-[30px] xl:text-[32px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]";

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
  "relative overflow-hidden text-white font-black uppercase tracking-[0.08em]";

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

function SlideOne({
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
      icon: <Shirt className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />,
    },
    back: {
      tone: "cyan",
      icon: <PanelTop className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />,
    },
    sleeve: {
      tone: "blue",
      icon: <Scissors className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />,
    },
    collar: {
      tone: "amber",
      icon: <BadgeCheck className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />,
    },
    hood: {
      tone: "violet",
      icon: <Layers3 className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />,
    },
  };

  const titleText =
    hourCount >= 9 ? "text-[29px]" : hourCount >= 8 ? "text-[31px]" : "text-[33px]";

const thPad =
  hourCount >= 10
    ? "px-3 py-2 text-[12px]"
    : hourCount >= 8
    ? "px-3 py-2.5 text-[13px]"
    : "px-4 py-3 text-[14px]";

const tdPad =
  hourCount >= 10
    ? "px-3 py-2"
    : hourCount >= 8
    ? "px-3 py-2.5"
    : "px-4 py-3";

const tdNum =
  hourCount >= 10
    ? "text-[16px]"
    : hourCount >= 8
    ? "text-[17px]"
    : "text-[18px]";

  return (
    <div className="h-full w-full p-2 text-white">
      <div className="grid h-full grid-rows-[200px_minmax(0,1fr)] gap-2">
        {/* TOP KPI */}
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
            value={<span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]">{efficiency.toFixed(1)}%</span>}
            subtitle="Today"
            cardClass="border-[#43a44b] bg-[linear-gradient(135deg,#58c15a_0%,#45a94d_100%)]"
            titleClass="bg-[linear-gradient(180deg,#4aa84b_0%,#3f9443_100%)] text-white border-b border-[#357c38]"
            valueClass="text-white"
            subClass="text-white/90"
          />

          <FlatInfoKpiCard
            title="DHU"
            value={<span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]">{dhu.toFixed(1)}%</span>}
            subtitle="Today"
            cardClass="border-[#8b48ef] bg-[linear-gradient(135deg,#a855f7_0%,#8b46ea_100%)]"
            titleClass="bg-[linear-gradient(180deg,#9a50f3_0%,#7d41d6_100%)] text-white border-b border-[#6b35b9]"
            valueClass="text-white"
            subClass="text-white/90"
          />

          <FlatInfoKpiCard
            title="Rework Qty"
            value={<span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]">{Math.round(reworkQty).toLocaleString()}</span>}
            subtitle={`${reworkPct.toFixed(1)}% • Today`}
            cardClass="border-[#e28a12] bg-[linear-gradient(135deg,#ffa200_0%,#f38b00_100%)]"
            titleClass="bg-[linear-gradient(180deg,#f19500_0%,#dd7d00_100%)] text-white border-b border-[#bf6800]"
            valueClass="text-white"
            subClass="text-white/90"
          />
        </div>

        {/* BOTTOM AREA */}
        <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-[1.15fr_0.85fr]">
          {/* TARGET VS ACTUAL */}
          <Card
            className={cn(
              panelCard,
              "h-full min-h-0 flex flex-col border-white/10",
              "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_24%),linear-gradient(180deg,#0b1425_0%,#09111f_55%,#08101b_100%)]"
            )}
          >
            <CardHeader className="relative pb-1 pt-1 shrink-0">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)]" />
              <div className="flex items-end justify-between">
                <div>
                  <CardTitle className="text-white font-black tracking-tight text-[26px] xl:text-[28px] leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                    Target vs Actual
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 pb-2 flex-1 min-h-0">
              <div className={cn(targetWrap, "h-full min-h-0 flex flex-col")}>
                <div className={cn("h-1 w-full shrink-0", targetTopStrip)} />

                {/* TABLE HEADER */}
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

                {/* TABLE BODY */}
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
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-[13px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                                  {r.serial}
                                </div>
                                <div className="text-[13px] font-extrabold tracking-[0.03em] text-white/90">
                                  Hour {r.serial}
                                </div>
                              </div>
                            </td>

                            <td className={cn(cellBase, tdTarget, tdPad, "text-right")}>
                              <span className={cn(tdNum, "font-black tabular-nums")}>{r.plan}</span>
                            </td>

                            <td className={cn(cellBase, tdCumTarget, tdPad, "text-right")}>
                              <span className={cn(tdNum, "font-black tabular-nums")}>{r.cumTarget}</span>
                            </td>

                            <td className={cn(cellBase, tdActual, tdPad, "text-right")}>
                              <div className="flex justify-end">
                                <span
                                  className={cn(
                                    "inline-flex min-w-[48px] justify-center rounded-full border px-2.5 py-1 text-[13px] font-black tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
                                    ok
                                      ? "border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
                                      : "border-rose-300/20 bg-rose-400/12 text-rose-100"
                                  )}
                                >
                                  {r.actual}
                                </span>
                              </div>
                            </td>

                            <td className={cn(cellBase, tdCumActual, tdPad, "text-right")}>
                              <span className={cn(tdNum, "font-black tabular-nums")}>{cum}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* TABLE FOOTER */}
                <div className="shrink-0 border-t border-white/10">
                  <table className="w-full table-fixed border-collapse text-white">
                    <tfoot>
                      <tr className="shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <td className={cn(tdTotalHours, hourCount >= 8 ? "px-3 py-3" : "px-4 py-3.5")}>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/80">
                              Total
                            </div>
                          </div>
                        </td>

                        <td className={cn(tdTotalTarget, hourCount >= 8 ? "px-3 py-3" : "px-4 py-3.5", "text-right")}>
                          <span className={cn(tdNum, "font-black tabular-nums")}>{computed.totalTarget}</span>
                        </td>

                        <td className={cn(tdTotalCumTarget, hourCount >= 8 ? "px-3 py-3" : "px-4 py-3.5", "text-right")}>
                          <span className={cn(tdNum, "font-black tabular-nums")}>{computed.totalTarget}</span>
                        </td>

                        <td className={cn(tdTotalActual, hourCount >= 8 ? "px-3 py-3" : "px-4 py-3.5", "text-right")}>
                          <span className={cn(tdNum, "font-black tabular-nums")}>{computed.totalActual}</span>
                        </td>

                        <td className={cn(tdTotalCumActual, hourCount >= 8 ? "px-3 py-3" : "px-4 py-3.5", "text-right")}>
                          <span className={cn(tdNum, "font-black tabular-nums")}>{computed.totalActual}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WIP SUMMARY */}
          <Card
            className={cn(
              panelCard,
              "h-full min-h-0 flex flex-col overflow-hidden border-white/10",
              "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,#0f172a_0%,#0a1220_50%,#09101d_100%)]"
            )}
          >
            <CardHeader className="relative pb-0 pt-1.5 shrink-0">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]" />
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white font-black tracking-tight text-[26px] xl:text-[28px] leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                    WIP Summary
                  </CardTitle>
                </div>

                <div className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-100">
                  Live
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-1 pb-2 flex-1 min-h-0">
              <div className="grid h-full content-start gap-2">
                <div className="grid gap-2">
                  <WipRow
                    label="Total Input"
                    value={wip.totalInput}
                    max={Math.max(1, wip.totalInput)}
                    tone="blue"
                    icon={<ArrowDownToLine className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />}
                    compact
                    showMeta={false}
                  />

                  <WipRow
                    label="Total Output"
                    value={wip.totalOutput}
                    max={Math.max(1, wip.totalInput)}
                    tone="emerald"
                    icon={<ArrowUpFromLine className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />}
                    compact
                    showMeta={false}
                  />

                  <WipRow
                    label="Line WIP"
                    value={wip.lineWip}
                    max={Math.max(1, wip.lineWip)}
                    tone="violet"
                    icon={<Layers3 className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />}
                    compact
                    showMeta={false}
                  />
                </div>

                <div className="relative py-1">
                  <div className="h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-slate-900/90 px-2 py-[2px] text-[8px] font-bold uppercase tracking-[0.13em] text-white/45">
                    Process WIP
                  </div>
                </div>

                <div className="grid gap-2">
                  {visibleWipRows.map((r, idx) => {
                    const partName = String(r.label)
                      .replace(/\s*wip\s*$/i, "")
                      .trim()
                      .toLowerCase();

                    const meta = wipMeta[partName] ?? {
                      tone: "slate" as WipTone,
                      icon: <Layers3 className={isCompactWip ? "h-3.5 w-3.5" : "h-4 w-4"} />,
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

/* ------------------ SLIDE 2 ------------------ */
/* ------------------ SLIDE 2 ------------------ */
function SlideTwo({
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

  const rowPad = compact ? "px-2 py-2" : "px-2.5 py-2.5";
  const headPad = compact ? "px-2 py-2.5" : "px-2.5 py-3";
  const cellText = compact ? "text-[15px]" : "text-[16px]";
  const headText = compact ? "text-[12px]" : "text-[13px]";

  const boxClass = (success: boolean) =>
    cn(
      "relative overflow-hidden rounded-xl border",
      compact ? "h-10" : "h-11",
      success
        ? "border-emerald-300/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.22),rgba(16,185,129,0.12))] shadow-[0_0_14px_rgba(16,185,129,0.10)]"
        : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))]"
    );

  const barClass = (success: boolean) =>
    cn(
      "absolute inset-y-0 left-0 transition-[width] duration-700 ease-out rounded-xl",
      success
        ? "bg-[linear-gradient(90deg,rgba(34,197,94,0.50),rgba(16,185,129,0.72))]"
        : "bg-[linear-gradient(90deg,rgba(96,165,250,0.24),rgba(168,85,247,0.24))]"
    );

  const textClass = (success: boolean) =>
    cn(
      "relative z-10 flex h-full items-center justify-center font-black tabular-nums",
      compact ? "text-[15px]" : "text-[17px]",
      success ? "text-emerald-50" : "text-white"
    );

  const getPct = (value: number, target: number) => {
    if (target <= 0) return 0;
    return Math.max(0, Math.min(100, (value / target) * 100));
  };

  return (
    <div className={cn("h-full w-full", compactH ? "p-2" : "p-2.5")}>
      <Card
        className={cn(
          panelCard,
          "h-full flex flex-col border-white/10",
          "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_24%),linear-gradient(180deg,#0b1425_0%,#09111f_55%,#08101b_100%)]"
        )}
      >
        <CardHeader className="relative shrink-0 pb-1 pt-2">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)]" />
          <div className="flex items-center justify-center">
            <CardTitle className="text-white font-black tracking-tight text-[28px] xl:text-[30px] leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
              Parts-wise Products WIP ({hourCount} Hours)
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 pt-1 pb-2">
          <div
            className={cn(
              "h-full min-h-0 overflow-hidden rounded-[24px] border border-white/10",
              "bg-[linear-gradient(180deg,rgba(8,15,30,0.94),rgba(9,18,36,0.98))] shadow-[0_14px_36px_rgba(0,0,0,0.28)]"
            )}
          >
            <div className="h-1 w-full shrink-0 bg-[linear-gradient(90deg,rgba(59,130,246,0.18),rgba(34,211,238,0.12),rgba(245,158,11,0.12),rgba(168,85,247,0.14))]" />

            <table className={cn("w-full table-fixed border-collapse text-white", cellText)}>
              <colgroup>
                <col style={{ width: compact ? "160px" : "180px" }} />
                <col style={{ width: compact ? "92px" : "102px" }} />
                {Array.from({ length: hourCount }).map((_, i) => (
                  <col key={i} style={{ width: compact ? "92px" : "102px" }} />
                ))}
                <col style={{ width: compact ? "110px" : "120px" }} />
              </colgroup>

              <thead>
                <tr>
                  <th
                    className={cn(
                      "text-left font-black uppercase tracking-[0.08em] text-white",
                      "bg-[linear-gradient(180deg,#245c7a,#1f4d66)]",
                      headPad,
                      headText
                    )}
                  >
                    Parts
                  </th>

                  <th
                    className={cn(
                      "text-right font-black uppercase tracking-[0.08em] text-white",
                      "bg-[linear-gradient(180deg,#3da8dc,#2c89b8)]",
                      headPad,
                      headText
                    )}
                  >
                    Target
                  </th>

                  {Array.from({ length: hourCount }).map((_, i) => (
                    <th
                      key={i}
                      className={cn(
                        "text-center font-black uppercase tracking-[0.08em] text-white",
                        "bg-[linear-gradient(180deg,#8b5cf6,#6d28d9)]",
                        headPad,
                        headText
                      )}
                    >
                      H{i + 1}
                    </th>
                  ))}

                  <th
                    className={cn(
                      "text-center font-black uppercase tracking-[0.08em] text-white",
                      "bg-[linear-gradient(180deg,#f59e0b,#d97706)]",
                      headPad,
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
                  const successGT = isSuccess(rowTotal, dayTarget);

                  const zebra = rowIdx % 2 === 0;

                  return (
                    <tr
                      key={p.part}
                      className={cn(
                        "transition-colors duration-200",
                        zebra ? "bg-white/[0.015]" : "bg-transparent",
                        "hover:bg-white/[0.03]"
                      )}
                    >
                      <td
                        className={cn(
                          "border-b border-white/8",
                          "bg-[linear-gradient(180deg,rgba(42,63,88,0.96),rgba(35,54,76,0.96))]",
                          rowPad
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-1.5 rounded-full bg-[linear-gradient(180deg,#60a5fa,#22d3ee)] opacity-90" />
                          <div className="truncate font-extrabold text-white tracking-[0.02em]">
                            {p.part}
                          </div>
                        </div>
                      </td>

                      <td
                        className={cn(
                          "border-b border-white/8 text-right",
                          "bg-[linear-gradient(180deg,rgba(84,134,168,0.52),rgba(67,108,139,0.52))]",
                          rowPad
                        )}
                      >
                        <span className="font-black tabular-nums text-white">
                          {p.target ?? "—"}
                        </span>
                      </td>

                      {Array.from({ length: hourCount }).map((_, i) => {
                        const value = Number(p.hours?.[i] ?? 0);
                        const target = Number(p.target) || 0;
                        const pct = getPct(value, target);
                        const success = isSuccess(value, target);

                        return (
                          <td key={i} className={cn("border-b border-white/8", compact ? "px-1.5 py-2" : "px-2 py-2.5")}>
                            <div className={boxClass(success)}>
                              <div className={barClass(success)} style={{ width: `${pct}%` }} />
                              <div className={textClass(success)}>{value}</div>
                            </div>
                          </td>
                        );
                      })}

                      <td className={cn("border-b border-white/8", compact ? "px-1.5 py-2" : "px-2 py-2.5")}>
                        <div className={boxClass(successGT)}>
                          <div className={barClass(successGT)} style={{ width: `${gtPct}%` }} />
                          <div className={textClass(successGT)}>{rowTotal}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Assemble Total */}
                <tr className="bg-white/[0.045]">
                  <td
                    className={cn(
                      "border-t border-white/10 font-black text-white",
                      "bg-[linear-gradient(180deg,#2a4362,#21354d)]",
                      compact ? "px-3 py-3" : "px-3.5 py-3.5"
                    )}
                  >
                    Assemble Total
                  </td>

                  <td
                    className={cn(
                      "border-t border-white/10 text-right font-black tabular-nums text-white",
                      "bg-[linear-gradient(180deg,#4e86ab,#3a6d90)]",
                      compact ? "px-3 py-3" : "px-3.5 py-3.5"
                    )}
                  >
                    {assembleTargetPerHour || "—"}
                  </td>

                  {assemble.map((t, i) => {
                    const pct = getPct(t, assembleTargetPerHour);
                    const success = isSuccess(t, assembleTargetPerHour);

                    return (
                      <td key={i} className={compact ? "px-1.5 py-2.5" : "px-2 py-3"}>
                        <div className={boxClass(success)}>
                          <div className={barClass(success)} style={{ width: `${pct}%` }} />
                          <div className={textClass(success)}>{t}</div>
                        </div>
                      </td>
                    );
                  })}

                  <td className={compact ? "px-1.5 py-2.5" : "px-2 py-3"}>
                    {(() => {
                      const total = assemble.reduce<number>((a, b) => a + Number(b ?? 0), 0);
                      const dayTarget = (Number(assembleTargetPerHour) || 0) * hourCount;
                      const pct = getPct(total, dayTarget);
                      const success = isSuccess(total, dayTarget);

                      return (
                        <div className={boxClass(success)}>
                          <div className={barClass(success)} style={{ width: `${pct}%` }} />
                          <div className={textClass(success)}>{total}</div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>

                {/* Output Total */}
                <tr className="bg-white/[0.045]">
                  <td
                    className={cn(
                      "border-t border-white/10 font-black text-white",
                      "bg-[linear-gradient(180deg,#324b67,#24384d)]",
                      compact ? "px-3 py-3" : "px-3.5 py-3.5"
                    )}
                  >
                    Output Total
                  </td>

                  <td
                    className={cn(
                      "border-t border-white/10 text-right font-black tabular-nums text-white",
                      "bg-[linear-gradient(180deg,#5b90b3,#3f7396)]",
                      compact ? "px-3 py-3" : "px-3.5 py-3.5"
                    )}
                  >
                    {outputTargetPerHour || "—"}
                  </td>

                  {output.map((t, i) => {
                    const pct = getPct(t, outputTargetPerHour);
                    const success = isSuccess(t, outputTargetPerHour);

                    return (
                      <td key={i} className={compact ? "px-1.5 py-2.5" : "px-2 py-3"}>
                        <div className={boxClass(success)}>
                          <div className={barClass(success)} style={{ width: `${pct}%` }} />
                          <div className={textClass(success)}>{t}</div>
                        </div>
                      </td>
                    );
                  })}

                  <td className={compact ? "px-1.5 py-2.5" : "px-2 py-3"}>
                    {(() => {
                      const total = output.reduce<number>((a, b) => a + Number(b ?? 0), 0);
                      const dayTarget = (Number(outputTargetPerHour) || 0) * hourCount;
                      const pct = getPct(total, dayTarget);
                      const success = isSuccess(total, dayTarget);

                      return (
                        <div className={boxClass(success)}>
                          <div className={barClass(success)} style={{ width: `${pct}%` }} />
                          <div className={textClass(success)}>{total}</div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function SlideThree({
  qualityRows,
}: {
  qualityRows: QualityRow[];
}) {
  const compactH = useMediaQuery("(max-height: 860px)");
  const [openHour, setOpenHour] = React.useState<QualityRow | null>(null);
  const close = React.useCallback(() => setOpenHour(null), []);
  const compact = compactH || qualityRows.length >= 9;

  const headPad = compact ? "px-3 py-2.5" : "px-4 py-3";
  const rowPad = compact ? "px-3 py-2.5" : "px-4 py-3";
  const headText = compact ? "text-[12px]" : "text-[13px]";
  const bodyText = compact ? "text-[14px]" : "text-[15px]";

  const dhuTone = (dhu: number) => {
    if (dhu <= 2) {
      return {
        chip: "border-emerald-300/20 bg-emerald-400/12 text-emerald-100",
        fill: "bg-[linear-gradient(90deg,#34d399_0%,#10b981_100%)]",
      };
    }
    if (dhu <= 5) {
      return {
        chip: "border-amber-300/20 bg-amber-400/12 text-amber-50",
        fill: "bg-[linear-gradient(90deg,#fcd34d_0%,#f59e0b_100%)]",
      };
    }
    return {
      chip: "border-rose-300/20 bg-rose-400/12 text-rose-100",
      fill: "bg-[linear-gradient(90deg,#fb7185_0%,#e11d48_100%)]",
    };
  };

  const defectTone = (qty: number) => {
    if (qty <= 0) {
      return "border-slate-300/15 bg-slate-400/10 text-slate-100";
    }
    if (qty <= 5) {
      return "border-amber-300/20 bg-amber-400/12 text-amber-50";
    }
    return "border-rose-300/20 bg-rose-400/12 text-rose-100";
  };

  return (
    <div className={cn("h-full w-full", compactH ? "p-2" : "p-2.5")}>
      <Card
        className={cn(
          panelCard,
          "h-full flex flex-col border-white/10",
          "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_24%),linear-gradient(180deg,#0b1425_0%,#09111f_55%,#08101b_100%)]"
        )}
      >
        <CardHeader className="relative shrink-0 pb-1 pt-2">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)]" />

          <div className="flex items-center justify-center">
            <CardTitle className="text-white font-black tracking-tight text-[28px] xl:text-[30px] leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
              Quality Monitoring
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 pt-1 pb-2">
          <div
            className={cn(
              "h-full min-h-0 overflow-hidden rounded-[24px] border border-white/10",
              "bg-[linear-gradient(180deg,rgba(8,15,30,0.94),rgba(9,18,36,0.98))] shadow-[0_14px_36px_rgba(0,0,0,0.28)]"
            )}
          >
            <div className="h-1 w-full shrink-0 bg-[linear-gradient(90deg,rgba(59,130,246,0.18),rgba(34,211,238,0.12),rgba(245,158,11,0.12),rgba(168,85,247,0.14))]" />

            <div className="min-h-0 h-full overflow-auto">
              <table className={cn("w-full table-fixed border-collapse text-white", bodyText)}>
               <colgroup>
                  <col style={{ width: compact ? "120px" : "140px" }} />
                  <col style={{ width: compact ? "120px" : "140px" }} />
                  <col style={{ width: compact ? "90px" : "110px" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: compact ? "110px" : "130px" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th
                      className={cn(
                        "text-left font-black uppercase tracking-[0.08em] text-white",
                        "bg-[linear-gradient(180deg,#245c7a,#1f4d66)]",
                        headPad,
                        headText
                      )}
                    >
                      Hours
                    </th>

                    <th
                      className={cn(
                        "text-right font-black uppercase tracking-[0.08em] text-white",
                        "bg-[linear-gradient(180deg,#8b5cf6,#6d28d9)]",
                        headPad,
                        headText
                      )}
                    >
                      DHU
                    </th>

                    <th
                      className={cn(
                        "text-right font-black uppercase tracking-[0.08em] text-white",
                        "bg-[linear-gradient(180deg,#f59e0b,#d97706)]",
                        headPad,
                        headText
                      )}
                    >
                      Defects
                    </th>

                    <th
                      className={cn(
                        "text-left font-black uppercase tracking-[0.08em] text-white",
                        "bg-[linear-gradient(180deg,#42a5d9,#2f89bb)]",
                        headPad,
                        headText
                      )}
                    >
                      Top 3 Defects
                    </th>

                    <th
                      className={cn(
                        "text-left font-black uppercase tracking-[0.08em] text-white",
                        "bg-[linear-gradient(180deg,#67c9bb,#43aea1)]",
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
                          zebra ? "bg-white/[0.015]" : "bg-transparent",
                          "hover:bg-white/[0.03]"
                        )}
                      >
                        <td
                          className={cn(
                            "border-b border-white/8",
                            "bg-[linear-gradient(180deg,rgba(42,63,88,0.96),rgba(35,54,76,0.96))]",
                            rowPad
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-[13px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                              {r.hour}
                            </div>
                            <div className="font-extrabold tracking-[0.02em] text-white/92 leading-none">
                              Hour {r.hour}
                            </div>
                          </div>
                        </td>

                        <td
                          className={cn(
                            "border-b border-white/8 text-right",
                            "bg-[linear-gradient(180deg,rgba(74,58,122,0.40),rgba(59,46,98,0.40))]",
                            rowPad
                          )}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2.5 w-20 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                              <div
                                className={cn("h-full rounded-full", dhuStyle.fill)}
                                style={{ width: `${Math.max(4, Math.min(100, dhu * 12))}%` }}
                              />
                            </div>

                            <span
                              className={cn(
                                "inline-flex min-w-[72px] justify-center rounded-full border px-2.5 py-1 text-[13px] font-black tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
                                dhuStyle.chip
                              )}
                            >
                              {dhu.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        <td
                          className={cn(
                            "border-b border-white/8 text-right",
                            "bg-[linear-gradient(180deg,rgba(97,79,36,0.34),rgba(80,65,28,0.34))]",
                            rowPad
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex min-w-[56px] justify-center rounded-full border px-2.5 py-1 text-[13px] font-black tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
                              defectTone(defects)
                            )}
                          >
                            {defects}
                          </span>
                        </td>

                        <td
                          className={cn(
                            "border-b border-white/8",
                            "bg-[linear-gradient(180deg,rgba(50,84,117,0.28),rgba(37,63,89,0.28))]",
                            rowPad
                          )}
                        >
                          {defects > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {(r.remarks ?? []).slice(0, 3).map((code: string, i2) => (
                                <span
                                  key={`${code}-${i2}`}
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-black tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
                                    i2 === 0 &&
                                      "border-rose-300/20 bg-rose-400/12 text-rose-100",
                                    i2 === 1 &&
                                      "border-amber-300/20 bg-amber-400/12 text-amber-50",
                                    i2 === 2 &&
                                      "border-cyan-300/20 bg-cyan-400/12 text-cyan-100"
                                  )}
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-white/55 font-semibold">—</span>
                          )}
                        </td>

                        <td
                          className={cn(
                            "border-b border-white/8",
                            "bg-[linear-gradient(180deg,rgba(73,108,104,0.26),rgba(55,83,79,0.26))]",
                            rowPad
                          )}
                        >
                          {defects > 0 ? (
                            <button
                              type="button"
                              onClick={() => setOpenHour(r)}
                              className="inline-flex items-center rounded-xl border border-cyan-300/20 bg-cyan-400/12 px-3 py-1.5 text-[13px] font-black text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.10)] transition hover:bg-cyan-400/18"
                              aria-label={`View defect details for hour ${r.hour}`}
                            >
                              Details
                            </button>
                          ) : (
                            <span className="text-white/55 font-semibold">—</span>
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
            className="absolute inset-0 bg-black/75"
          />

          <div className="relative w-[92vw] max-w-4xl max-h-[82vh] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(29,34,52,0.98),rgba(8,12,22,0.98))] shadow-2xl backdrop-blur-md">
            <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(59,130,246,0.10),rgba(168,85,247,0.10),rgba(34,211,238,0.08))] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[28px] font-black tracking-tight text-white">
                    Defect Details
                  </div>
                  <div className="mt-1 text-[14px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Hour {openHour.hour}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[14px] font-extrabold text-white transition hover:bg-white/[0.10]"
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
                      className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                    >
                      <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(59,130,246,0.10),rgba(34,211,238,0.08))] px-4 py-3">
                        <div className="text-[18px] font-extrabold text-white">
                          {ln.lineName}
                        </div>
                      </div>

                      <table className="w-full table-fixed text-[15px] text-white">
                        <colgroup>
                          <col style={{ width: "140px" }} />
                          <col />
                          <col style={{ width: "110px" }} />
                        </colgroup>

                        <thead>
                          <tr>
                            <th className="bg-[linear-gradient(180deg,#245c7a,#1f4d66)] px-4 py-3 text-left text-[12px] font-black uppercase tracking-[0.08em] text-white">
                              Code
                            </th>
                            <th className="bg-[linear-gradient(180deg,#3da8dc,#2c89b8)] px-4 py-3 text-left text-[12px] font-black uppercase tracking-[0.08em] text-white">
                              Defect
                            </th>
                            <th className="bg-[linear-gradient(180deg,#f59e0b,#d97706)] px-4 py-3 text-right text-[12px] font-black uppercase tracking-[0.08em] text-white">
                              Qty
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {ln.defects.map((d, idx) => (
                            <tr
                              key={`${ln.lineId}-${d.code}`}
                              className={cn(
                                "border-b border-white/8",
                                idx % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"
                              )}
                            >
                              <td className="px-4 py-3 font-bold text-white">{d.code}</td>
                              <td className="px-4 py-3 font-semibold text-white/90">
                                {d.name ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={cn(
                                    "inline-flex min-w-[56px] justify-center rounded-full border px-2.5 py-1 text-[13px] font-black tabular-nums",
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-[15px] font-semibold text-white/75">
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




/* ------------------ PAGE ------------------ */
export default function Page() {
  const sp = useSearchParams();
  const qpLineId = sp.get("production_line_id") ? Number(sp.get("production_line_id")) : undefined;

  const { filters } = useKioskFilters();

  const normalizedFilters = React.useMemo(() => {
  const toNumArr = (arr: any[] | undefined) =>
    (arr ?? []).map((x) => Number(x)).filter((x) => Number.isFinite(x));

  const production_line_ids = toNumArr(filters.production_line_ids as any);
  const order_ids = toNumArr(filters.order_ids as any);
  const style_ids = toNumArr(filters.style_ids as any);

  return {
    ...filters,
    production_line_ids,
    order_ids,
    style_ids,
    // ✅ multi select থাকলে single select ignore
    production_line_id: production_line_ids.length ? undefined : (filters.production_line_id as any),
    order_id: order_ids.length ? undefined : (filters.order_id as any),
    style_id: style_ids.length ? undefined : (filters.style_id as any),
  };
}, [filters]);

const apiDate =
  normalizedFilters.date_from || normalizedFilters.date_to
    ? undefined
    : (normalizedFilters as any).date || dhakaDate();

const { sewingLines, isLoading, error, isRefetching } = useSewingDashboardV2({
  buyer_id: normalizedFilters.buyer_id,
  colors: normalizedFilters.colors,
  date: apiDate,
  date_from: normalizedFilters.date_from,
  date_to: normalizedFilters.date_to,
  order_id: normalizedFilters.order_id,
  order_ids: normalizedFilters.order_ids,
  production_line_id: qpLineId ?? normalizedFilters.production_line_id,
  production_line_ids: normalizedFilters.production_line_ids,
  sizes: normalizedFilters.sizes,
  style_id: normalizedFilters.style_id,
  style_ids: normalizedFilters.style_ids,
  refetchInterval: 5000,
});

  const [showRefreshIndicator, setShowRefreshIndicator] = React.useState(false);
  React.useEffect(() => {
    if (isRefetching) setShowRefreshIndicator(true);
    else if (showRefreshIndicator) {
      const t = setTimeout(() => setShowRefreshIndicator(false), 1000);
      return () => clearTimeout(t);
    }
  }, [isRefetching, showRefreshIndicator]);

  // ✅ all lines returned from API
  const linesAll: any[] = React.useMemo(() => (Array.isArray(sewingLines) ? sewingLines : []), [sewingLines]);

  // ✅ lines selected by query/filters
const selectedLinesAll = React.useMemo(() => {
  if (qpLineId) return linesAll.filter((l) => toNum(l?.production_line_id) === qpLineId);

  if (normalizedFilters.production_line_id)
    return linesAll.filter((l) => toNum(l?.production_line_id) === normalizedFilters.production_line_id);

  if (normalizedFilters.production_line_ids?.length) {
    const set = new Set(normalizedFilters.production_line_ids.map(Number));
    return linesAll.filter((l) => set.has(toNum(l?.production_line_id)));
  }

  return linesAll;
}, [linesAll, qpLineId, normalizedFilters.production_line_id, normalizedFilters.production_line_ids]);


// Access token for download report

const getAccessToken = () => {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const token = parsed?.state?.tokens?.access;
    return typeof token === "string" && token.length > 20 ? token : null;
  } catch {
    return null;
  }
};

// Access token for download report


// Download Report start

const downloadQualityReport = React.useCallback(async (format: "xlsx") => {
  const params = new URLSearchParams();
  const date = apiDate || dhakaDate();
  params.set("date", date);
  params.set("format", format);

  // ✅ send lines like main report
  if (normalizedFilters.production_line_ids?.length) {
    normalizedFilters.production_line_ids.forEach((id: number) =>
      params.append("production_line_ids[]", String(id))
    );
  } else if (normalizedFilters.production_line_id) {
    params.append("production_line_ids[]", String(normalizedFilters.production_line_id));
  } else if (qpLineId) {
    params.append("production_line_ids[]", String(qpLineId));
  }
  // optional filters
  if (normalizedFilters.buyer_id) params.set("buyer_id", String(normalizedFilters.buyer_id));
  if (normalizedFilters.style_id) params.set("style_id", String(normalizedFilters.style_id));
  if (normalizedFilters.order_id) params.set("order_id", String(normalizedFilters.order_id));
  (normalizedFilters.sizes || []).forEach((s: string) => params.append("sizes[]", s));
  (normalizedFilters.colors || []).forEach((c: string) => params.append("colors[]", c));

  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const url =
    `${base}/api/tracking/reports/sewing-line-dashboard-v2/quality-export/?` +
    params.toString();

  const token = getAccessToken();
  if (!token) {
    alert("No auth token found. Please login again.");
    return;
  }

  console.log("QUALITY REPORT URL =>", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Quality report download failed:", res.status, text);
    alert(`Quality report download failed: ${res.status}`);
    return;
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = cd.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `sewing_quality_slide3_${date}.xlsx`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}, [apiDate, normalizedFilters, qpLineId]);

// Download Report end


  // ✅ TV mode if tv selected + multiple lines
  const isTvMode = Boolean((normalizedFilters as any).tv) && (normalizedFilters.production_line_ids?.length ?? 0) > 1;
  const isTv = Boolean((normalizedFilters as any).tv);

  const cycleLines = React.useMemo(() => {
    return selectedLinesAll.slice().sort((a, b) => toNum(a.production_line_id) - toNum(b.production_line_id));
  }, [selectedLinesAll]);

  const [lineIndex, setLineIndex] = React.useState(0);

  // ✅ switch line every 3 slides * 30s = 90s
  useInterval(() => setLineIndex((i) => (i + 1) % Math.max(1, cycleLines.length)), isTvMode ? 30000 * 3 : null);

  const currentLine = isTvMode ? (cycleLines[lineIndex] ?? cycleLines[0]) : null;

  // ✅ ONLY ONE activeLines (fixes your error)
  const activeLines: any[] = React.useMemo(() => {
    if (isTvMode) return currentLine ? [currentLine] : [];
    return selectedLinesAll;
  }, [isTvMode, currentLine, selectedLinesAll]);

  const sumField = React.useCallback(
    (field: string) => activeLines.reduce((acc, l) => acc + toNum((l as any)?.[field], 0), 0),
    [activeLines]
  );

  const workHours = React.useMemo(() => {
    const maxHours = activeLines.reduce((m, l) => {
      const fromHourly = Array.isArray((l as any)?.hourly_data) ? (l as any).hourly_data.length : 0;
      const wh = toNum((l as any)?.work_hours) || toNum((l as any)?.line_target?.work_hours) || fromHourly || 8;
      return Math.max(m, wh);
    }, 0);
    return clampHourCount(maxHours || 8);
  }, [activeLines]);

  const totalTarget = sumField("target_qty");
  const totalPass = sumField("pass_qty");

  const qualityAgg = React.useMemo(() => {
    const hourCount = clampHourCount(workHours);

    const byHour = Array.from({ length: hourCount }, (_, i) => ({
      hour: i + 1,
      defects: 0,
      units: 0,
      remarksCounts: new Map<string, number>(),
      lineDetails: new Map<number, { lineName: string; defects: Map<string, DefectBreakdownItem> }>(),
    }));

    for (const line of activeLines) {
      const rows = Array.isArray((line as any)?.hourly_quality_rows) ? ((line as any).hourly_quality_rows as any[]) : [];

      const lineId = toNum((line as any)?.production_line_id, 0);
      const lineName = String((line as any)?.production_line_name ?? `Line ${lineId || ""}`);

      if (rows.length) {
        for (const r of rows) {
          const hour = toNum(r?.hour, 0);
          if (hour < 1 || hour > hourCount) continue;

          const idx = hour - 1;
          const slot = byHour[idx];
          if (!slot) continue;

          const defects = toNum(r?.defects, 0);
          const units = toNum(r?.units, 0);

          slot.defects += defects;
          slot.units += units;

          // ✅ prefer defect_breakdown for accurate counts + names
          const breakdown = Array.isArray(r?.defect_breakdown) ? r.defect_breakdown : null;
          if (breakdown?.length) {
            for (const it of breakdown) {
              const code = String(it?.code ?? "").trim();
              if (!code) continue;
              const qty = toNum(it?.qty, 0);
              const name = String(it?.name ?? "").trim() || code;

              slot.remarksCounts.set(code, (slot.remarksCounts.get(code) ?? 0) + qty);

              if (!slot.lineDetails.has(lineId)) {
                slot.lineDetails.set(lineId, { lineName, defects: new Map() });
              }
              const bucket = slot.lineDetails.get(lineId)!;
              const existing = bucket.defects.get(code);
              bucket.defects.set(code, {
                code,
                name,
                qty: (existing?.qty ?? 0) + qty,
              });
            }
          } else {
            // fallback: remarks array (older backend)
            const remarks = Array.isArray(r?.remarks) ? r.remarks : [];
            for (const x of remarks) {
              const key = String(x ?? "").trim();
              if (!key) continue;
              slot.remarksCounts.set(key, (slot.remarksCounts.get(key) ?? 0) + 1);
            }
          }
        }
      }
    }

    let totalDefects = 0;
    let totalUnits = 0;

    const rowsOut: QualityRow[] = byHour.map((h) => {
      totalDefects += h.defects;
      totalUnits += h.units;

      const remarks = Array.from(h.remarksCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k);

      const details: QualityDetailLine[] = Array.from(h.lineDetails.entries())
        .map(([lineId, meta]) => {
          const defects = Array.from(meta.defects.values()).sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0));
          return { lineId, lineName: meta.lineName, defects };
        })
        .sort((a, b) => a.lineName.localeCompare(b.lineName));

      const dhu = h.units > 0 ? (h.defects / h.units) * 100 : 0;
      return { hour: h.hour, defects: h.defects, dhu, remarks, details };
    });

    const overallDhu = totalUnits > 0 ? (totalDefects / totalUnits) * 100 : 0;
    return { rows: rowsOut, overallDhu, totalUnits, totalDefects };
  }, [activeLines, workHours]);

  const totalReject = sumField("rejected_qty");
  const totalRework = sumField("rework_qty");
  const totalQc = totalPass + totalReject + totalRework;
  const reworkPct = totalQc > 0 ? (totalRework / totalQc) * 100 : 0;

  const efficiencyPct = totalTarget > 0 ? (totalPass / totalTarget) * 100 : 0;

  const dhuPct = React.useMemo(() => {
    // ✅ Primary: hourly-based DHU
    if (toNum((qualityAgg as any)?.totalUnits, 0) > 0) return toNum(qualityAgg.overallDhu, 0);

    // ✅ Fallback: weighted
    let units = 0;
    let defects = 0;

    for (const l of activeLines) {
      const lineUnits =
        toNum((l as any)?.qc_stats?.total_qc_completed, 0) ||
        (toNum((l as any)?.pass_qty, 0) + toNum((l as any)?.rework_qty, 0) + toNum((l as any)?.rejected_qty, 0));

      const lineDhuPct = toNum((l as any)?.dhu_percentage, 0);

      if (lineUnits <= 0) continue;
      units += lineUnits;
      defects += (lineDhuPct / 100) * lineUnits;
    }

    return units > 0 ? (defects / units) * 100 : 0;
  }, [activeLines, qualityAgg]);

    const kpi: KpiData = React.useMemo(
    () => ({
      target: totalTarget,
      actual: totalPass,
      efficiency: efficiencyPct,
      dhu: dhuPct,
      reworkQty: totalRework,
      reworkPct,
    }),
    [totalTarget, totalPass, efficiencyPct, dhuPct, totalRework, reworkPct]
  );

  const planVsActualRows: PlanVsActualRow[] = React.useMemo(() => {
    const rows: PlanVsActualRow[] = [];
    for (let i = 0; i < workHours; i++) {
      const plan = activeLines.reduce((acc, l) => {
        const hd = Array.isArray((l as any)?.hourly_data) ? (l as any).hourly_data : [];
        const lineWh = clampHourCount(hd.length || toNum((l as any)?.work_hours) || toNum((l as any)?.line_target?.work_hours) || 8);

        const apiTarget = hd?.[i]?.target;
        const computed = lineWh > 0 ? Math.ceil(toNum((l as any)?.target_qty) / lineWh) : 0;

        return acc + clamp20(apiTarget ?? computed);
      }, 0);

      const actual = activeLines.reduce((acc, l) => {
        const hd = Array.isArray((l as any)?.hourly_data) ? (l as any).hourly_data : [];
        return acc + toNum(hd?.[i]?.output, 0);
      }, 0);

      rows.push({ serial: i + 1, plan, actual });
    }
    return rows;
  }, [activeLines, workHours]);

  const outputsPerHour = React.useMemo(() => planVsActualRows.map((r) => r.actual), [planVsActualRows]);

  const perHourTarget = React.useMemo(() => {
    const fromTable = planVsActualRows?.[0]?.plan;
    if (typeof fromTable === "number" && fromTable > 0) return clamp20(fromTable);
    if (workHours > 0 && totalTarget > 0) return clamp20(Math.ceil(totalTarget / workHours));
    return 0;
  }, [planVsActualRows, totalTarget, workHours]);

  const wip: WipData = React.useMemo(() => {
    const totalInput = sumField("total_input") || sumField("todays_loading");
    const totalOutput = sumField("total_output") || totalPass;

    const lineWip =
      sumField("line_wip") ||
      Math.max(0, (sumField("total_input") || sumField("todays_loading")) - (totalOutput || totalPass));

    const partTotals = new Map<string, { name: string; wipQty: number }>();

    const PART_FIELD_MAP: Record<string, string[]> = {
      Front: ["front_wip", "frontWip"],
      Back: ["back_wip", "backWip"],
      Sleeve: ["sleeve_wip", "sleeveWip"],
      Collar: ["collar_wip", "collarWip"],
      Hood: ["hood_wip", "hoodWip"],
    };

    for (const l of activeLines) {
      for (const partName of DEFAULT_PARTS) {
        const keys = PART_FIELD_MAP[partName] ?? [];
        const val = keys.reduce((acc, k) => acc + toNum((l as any)?.[k], 0), 0);
        if (val > 0) {
          const key = normalizeKey(partName);
          const prev = partTotals.get(key);
          if (!prev) partTotals.set(key, { name: partName, wipQty: val });
          else prev.wipQty += val;
        }
      }

      const inv = Array.isArray((l as any)?.part_inventory) ? ((l as any).part_inventory as any[]) : [];
      for (const r of inv) {
        const name = String(r?.name ?? r?.part ?? "").trim();
        if (!name) continue;

        const wipQty = toNum(r?.wip_qty ?? r?.wip ?? r?.balance ?? r?.inhand ?? r?.qty ?? r?.issued, 0);
        if (wipQty <= 0) continue;

        const key = normalizeKey(name);
        const prev = partTotals.get(key);
        if (!prev) partTotals.set(key, { name, wipQty });
        else prev.wipQty += wipQty;
      }
    }

    for (const p of DEFAULT_PARTS) {
      const key = normalizeKey(p);
      if (!partTotals.has(key)) partTotals.set(key, { name: p, wipQty: 0 });
    }

    const partWipRows = Array.from(partTotals.values())
      .map(({ name, wipQty }) => ({
        label: `${name} WIP`,
        value: Math.max(0, wipQty),
        max: Math.max(1, wipQty),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { totalInput, totalOutput, lineWip, partWipRows };
  }, [activeLines, sumField, totalPass]);

  const hourCount = workHours;

  const partsWip: PartWipRow[] = React.useMemo(() => {
    const map = new Map<string, PartWipRow>();
    const partTarget = perHourTarget;

    for (const l of activeLines) {
      const apiParts = Array.isArray((l as any)?.parts_hourly_data) ? (l as any).parts_hourly_data : [];
      const invParts = Array.isArray((l as any)?.part_inventory) ? (l as any).part_inventory : [];

      if (apiParts.length) {
        for (const p of apiParts) {
          const name = String(p?.part ?? p?.name ?? "").trim();
          if (!name) continue;

          // ✅ prevent footer rows from appearing in tbody
          const lower = name.toLowerCase().replace(/\s+/g, " ").trim();
          if (lower === "assemble total" || lower === "output total") continue;

          const key = normalizeKey(name);
          const hours = padHours(p?.hours, hourCount);

          const existing = map.get(key);
          if (!existing) map.set(key, { part: name, target: partTarget, hours });
          else for (let i = 0; i < hourCount; i++) existing.hours[i] = toNum(existing.hours[i]) + toNum(hours[i]);
        }
        continue;
      }

      if (invParts.length) {
        for (const p of invParts) {
          const name = String(p?.name ?? p?.part ?? "").trim();
          if (!name) continue;
          const key = normalizeKey(name);
          if (!map.has(key)) map.set(key, { part: name, target: partTarget, hours: padHours([], hourCount) });
        }
      }
    }

    if (map.size === 0) {
      for (const name of DEFAULT_PARTS) map.set(normalizeKey(name), { part: name, target: partTarget, hours: padHours([], hourCount) });
    }

    return Array.from(map.values()).sort((a, b) => a.part.localeCompare(b.part));
  }, [activeLines, hourCount, perHourTarget]);

  
const assembleTotals = React.useMemo(() => {
  const hasAny =
    activeLines.some((l) => Array.isArray((l as any)?.assemble_hourly_totals)) ||
    activeLines.some(
      (l) =>
        Array.isArray((l as any)?.parts_hourly_data) &&
        (l as any).parts_hourly_data.some(
          (r: any) => String(r?.part ?? "").toLowerCase().trim() === "assemble total"
        )
    );

  if (!hasAny) return padHours([], hourCount);

  const totals: number[] = Array.from({ length: hourCount }, () => 0);

  for (const l of activeLines) {
    // 1) preferred: top-level field
    let src: unknown = (l as any)?.assemble_hourly_totals;

    // 2) fallback: find in parts_hourly_data
    if (!Array.isArray(src)) {
      const row =
        Array.isArray((l as any)?.parts_hourly_data)
          ? (l as any).parts_hourly_data.find(
              (r: any) =>
                String(r?.part ?? "").toLowerCase().trim() === "assemble total"
            )
          : undefined;

      src = Array.isArray(row?.hours) ? row!.hours : [];
    }

    const arr = padHours(src, hourCount);

    for (let i = 0; i < hourCount; i++) {
      totals[i] = (totals[i] ?? 0) + toNum(arr[i]);
    }
  }

  return totals;
}, [activeLines, hourCount]);

// const assemble = padHours(assembleTotals, hourCount);

  const outputTotals = React.useMemo(() => padHours(outputsPerHour, hourCount), [outputsPerHour, hourCount]);

  const assembleTargetPerHour = perHourTarget;
  // Output Total target should be per-hour target (do NOT multiply by parts count)
  const outputTargetPerHour = perHourTarget;


  const slides = React.useMemo(
    () => [
      { title: "Production Overview", node: <SlideOne kpi={kpi} planVsActualRows={planVsActualRows} wip={wip} /> },
      {
        title: "Parts-wise Products WIP",
        node: (
          <SlideTwo
            partsWip={partsWip}
            assembleTotals={assembleTotals}
            outputTotals={outputTotals}
            assembleTargetPerHour={assembleTargetPerHour}
            outputTargetPerHour={outputTargetPerHour}
            hourCount={hourCount}
          />
        ),
      },
      {
        title: "Quality Monitoring",
        node: (
          <SlideThree qualityRows={qualityAgg.rows} />
        ),
      },
    ],
    [kpi, planVsActualRows, wip, partsWip, assembleTotals, outputTotals, assembleTargetPerHour, outputTargetPerHour, hourCount, qualityAgg.rows, downloadQualityReport]);

  const [index, setIndex] = React.useState<number>(0);
  const [autoPlay, setAutoPlay] = React.useState(true);
  useInterval(() => setIndex((i) => (i + 1) % slides.length), autoPlay ? 30000 : null);

  const safeIndex = ((index % slides.length) + slides.length) % slides.length;
  const current = slides[safeIndex] ?? slides[0];

  const { ref, height } = useAvailableHeight();
  const compactH = useMediaQuery("(max-height: 860px)");

const uiVars = React.useMemo(() => {
  const scale = isTv ? 2.05 : compactH ? 1.45 : 1.7;

  const px = (n: number, minPx: number) =>
    `${Math.max(minPx, Math.round(n * scale))}px`;

  return {
    ["--fs-title" as any]: px(22, 20),
    ["--fs-sub" as any]: px(15, 14),
    ["--fs-kpi-label" as any]: px(15, 14),
    ["--fs-kpi-value" as any]: px(34, 30),
    ["--fs-th" as any]: px(17, 16),
    ["--fs-td" as any]: px(18, 17),
    ["--fs-chip" as any]: px(16, 15),
    ["--fs-gauge" as any]: px(24, 22),
  } as React.CSSProperties;
}, [isTv, compactH]);


  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading dashboard data</p>
          <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full">
      <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl border border-white/10",
            shellBg
          )}
          style={{ height: height ? `${height}px` : "calc(100vh - 160px)", ...uiVars }}
        >
        {/* background mood (same dark TV look) */}
       <div className="pointer-events-none absolute inset-0 opacity-80 hidden dark:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_70%_20%,rgba(34,197,94,0.14),transparent_45%),radial-gradient(circle_at_40%_80%,rgba(244,63,94,0.14),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_35%,rgba(255,255,255,0.03))]" />
        </div>


        <div className="relative z-10 flex h-full flex-col min-h-0">
          <div className={cn("px-4", compactH ? "pt-2" : "pt-3")}>
            <div className="flex items-end justify-between gap-3 relative">
              <div className="min-w-0">
               <div className="tracking-[0.25em] uppercase text-white/60 text-[var(--fs-sub)]">
                  Sewing Dashboard
                </div>
                <div className="font-extrabold text-white truncate text-[var(--fs-title)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                  {current?.title ?? ""}
                </div>
                <div className="text-white/65 truncate text-[var(--fs-sub)]">
                  {activeLines.length ? `${activeLines.length} line(s)` : isLoading ? "Loading..." : "No data"}
                </div>
              </div>

              {/* ✅ CENTER BIG HEADING */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
             <div className="font-extrabold tracking-[0.18em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] text-[calc(var(--fs-title)*1.35)]">
                {(() => {
                  // 1) TV cycle mode heading (same as before)
                  if (isTvMode) return String(currentLine?.production_line_name ?? "—").toUpperCase();

                  // 2) If user selected exactly 1 production line (via Production Line filter / query param)
                  if (activeLines.length === 1) {
                    const one = activeLines[0] as any;
                    return String(one?.production_line_name ?? one?.line_name ?? `LINE ${one?.production_line_id ?? ""}`)
                      .toUpperCase()
                      .trim();
                  }

                  // 3) Otherwise no big heading
                  return "";
                })()}
              </div>
            </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={cn(
                          "h-2.5 w-9 rounded-full transition-all",
                          i === safeIndex
                            ? "bg-white/80"
                            : "bg-white/20 hover:bg-white/35"
                        )}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setAutoPlay((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-md px-2.5 py-2 font-extrabold text-white hover:bg-white/[0.10] transition text-[var(--fs-sub)]"
                >
                  {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {autoPlay ? "Auto (30s)" : "Fixed"}
                </button>

               
              </div>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0">
              <div key={safeIndex} className="absolute inset-0 will-change-transform animate-[slideIn_650ms_ease-out]">
                {current?.node}
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes slideIn {
            0% {
              opacity: 0;
              transform: translateY(10px) scale(0.995);
            }
            100% {
              opacity: 1;
              transform: translateY(0px) scale(1);
            }
          }
        `}</style>

        {showRefreshIndicator && (
          <div className="fixed bottom-4 right-4 z-50">
            <RefreshCw className="h-5 w-5 animate-spin text-white/70" />
          </div>
        )}
      </div>
    </div>
  );
}

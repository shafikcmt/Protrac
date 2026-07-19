"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Pause, Play, RefreshCw, Palette } from "lucide-react";
import { useSewingDashboardV2 } from "@/hooks/api";
import { useKioskFilters } from "../../kiosk-context";

import SlideOne from "./slide1";
import SlideTwo from "./slide2";
import SlideThree from "./slide3";

/* ------------------ HELPERS ------------------ */
const toNum = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampHourCount = (n: number) => {
  const x = Math.floor(toNum(n, 0));
  return Math.max(1, Math.min(10, x || 0));
};

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

type SlideInterval = 0 | 15 | 30 | 45 | 60;
type KioskTheme = "dark" | "light" | "midnight" | "ocean";
const SLIDE_INTERVALS: SlideInterval[] = [15, 30, 45, 60, 0];
const INTERVAL_LABEL: Record<number, string> = {
  15: "Auto (15s)", 30: "Auto (30s)", 45: "Auto (45s)", 60: "Auto (60s)", 0: "Manual",
};
const THEMES: KioskTheme[] = ["dark", "light", "midnight", "ocean"];
const THEME_LABEL: Record<KioskTheme, string> = {
  dark: "Dark", light: "Light", midnight: "Midnight", ocean: "Ocean",
};

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

  const [clockStr, setClockStr] = React.useState("");
  const [colonOn, setColonOn] = React.useState(true);
  React.useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      return `${h}:${m}:${s}`;
    };
    setClockStr(fmt());
    const id = setInterval(() => {
      setClockStr(fmt());
      setColonOn((v) => !v);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const linesAll: any[] = React.useMemo(() => (Array.isArray(sewingLines) ? sewingLines : []), [sewingLines]);

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

  const isTvMode =
    Boolean((normalizedFilters as any).tv) &&
    (normalizedFilters.production_line_ids?.length ?? 0) > 1;
  const isTv = Boolean((normalizedFilters as any).tv);

  const cycleLines = React.useMemo(() => {
    return selectedLinesAll.slice().sort((a, b) => toNum(a.production_line_id) - toNum(b.production_line_id));
  }, [selectedLinesAll]);

  const [lineIndex, setLineIndex] = React.useState(0);

  useInterval(() => setLineIndex((i) => (i + 1) % Math.max(1, cycleLines.length)), isTvMode ? 30000 * 3 : null);

  const currentLine = isTvMode ? (cycleLines[lineIndex] ?? cycleLines[0]) : null;

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
    if (toNum((qualityAgg as any)?.totalUnits, 0) > 0) return toNum(qualityAgg.overallDhu, 0);

    let units = 0;
    let defects = 0;

    for (const l of activeLines) {
      const lineUnits =
        toNum((l as any)?.qc_stats?.total_qc_completed, 0) ||
        (toNum((l as any)?.pass_qty, 0) +
          toNum((l as any)?.rework_qty, 0) +
          toNum((l as any)?.rejected_qty, 0));

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
        const lineWh = clampHourCount(
          hd.length || toNum((l as any)?.work_hours) || toNum((l as any)?.line_target?.work_hours) || 8
        );

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
    const pendingOldStyleCount = sumField("pending_old_style_count");
    const pendingOldPendingQty = sumField("pending_old_pending_qty");

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

    return { totalInput, totalOutput, lineWip, partWipRows, pendingOldStyleCount, pendingOldPendingQty };
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
      for (const name of DEFAULT_PARTS) {
        map.set(normalizeKey(name), { part: name, target: partTarget, hours: padHours([], hourCount) });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.part.localeCompare(b.part));
  }, [activeLines, hourCount, perHourTarget]);

  const assembleTotals = React.useMemo(() => {
    const matchesAssemble = (r: any) => {
      const n = String(r?.part ?? r?.name ?? "").toLowerCase().trim();
      return n === "assemble total" || n === "assemble" || n === "assembly total" || n === "assembly";
    };

    const hasAny =
      activeLines.some((l) => {
        const f =
          (l as any)?.assemble_hourly_totals ??
          (l as any)?.assemble_totals ??
          (l as any)?.hourly_assemble_totals;
        return Array.isArray(f) && f.length > 0;
      }) ||
      activeLines.some(
        (l) =>
          Array.isArray((l as any)?.parts_hourly_data) &&
          (l as any).parts_hourly_data.some(matchesAssemble)
      );

    if (!hasAny) return padHours([], hourCount);

    const totals: number[] = Array.from({ length: hourCount }, () => 0);

    for (const l of activeLines) {
      let src: unknown =
        (l as any)?.assemble_hourly_totals ??
        (l as any)?.assemble_totals ??
        (l as any)?.hourly_assemble_totals;

      if (!Array.isArray(src)) {
        const row = Array.isArray((l as any)?.parts_hourly_data)
          ? (l as any).parts_hourly_data.find(matchesAssemble)
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

  const outputTotals = React.useMemo(() => padHours(outputsPerHour, hourCount), [outputsPerHour, hourCount]);
  const assembleTargetPerHour = perHourTarget;
  const outputTargetPerHour = perHourTarget;

  const slides = React.useMemo(
    () => [
      {
        title: "Production Overview",
        node: <SlideOne kpi={kpi} planVsActualRows={planVsActualRows} wip={wip} />,
      },
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
        node: <SlideThree qualityRows={qualityAgg.rows} />,
      },
    ],
    [
      kpi,
      planVsActualRows,
      wip,
      partsWip,
      assembleTotals,
      outputTotals,
      assembleTargetPerHour,
      outputTargetPerHour,
      hourCount,
      qualityAgg.rows,
    ]
  );

  const [index, setIndex] = React.useState<number>(0);

  const [slideInterval, setSlideInterval] = React.useState<SlideInterval>(() => {
    if (typeof window !== "undefined") {
      const n = Number(localStorage.getItem("kiosk-slide-interval") ?? "30");
      return ([0, 15, 30, 45, 60].includes(n) ? n : 30) as SlideInterval;
    }
    return 30;
  });

  const [kioskTheme, setKioskTheme] = React.useState<KioskTheme>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("kiosk-theme") ?? "";
      return (["dark", "light", "midnight", "ocean"].includes(s) ? s as KioskTheme : "dark");
    }
    return "dark";
  });

const cycleInterval = React.useCallback(() => {
    setSlideInterval((cur) => {
      const next = SLIDE_INTERVALS[(SLIDE_INTERVALS.indexOf(cur) + 1) % SLIDE_INTERVALS.length];
      if (typeof window !== "undefined") localStorage.setItem("kiosk-slide-interval", String(next));
      return next ?? cur;
    });
  }, []);

const cycleTheme = React.useCallback(() => {
    setKioskTheme((cur) => {
      const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      if (typeof window !== "undefined" && next) localStorage.setItem("kiosk-theme", next);
      return next ?? cur;
    });
  }, []);

  useInterval(() => setIndex((i) => (i + 1) % slides.length), slideInterval > 0 ? slideInterval * 1000 : null);

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
    <div ref={ref} className="dark w-full">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-white/10 kiosk-noscroll"
        data-theme={kioskTheme}
        style={{
          height: height ? `${height}px` : "calc(100vh - 160px)",
          ...uiVars,
          background: "var(--kiosk-bg, #0A0E1A)",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 z-20 rounded-t-xl overflow-hidden">
          <div
            key={`progress-${safeIndex}-${slideInterval}`}
            className="h-full bg-white/80"
            style={
              slideInterval > 0
                ? { animation: `progressFill ${slideInterval}s linear forwards` }
                : { width: "0%" }
            }
          />
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-80 hidden dark:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_70%_20%,rgba(34,197,94,0.14),transparent_45%),radial-gradient(circle_at_40%_80%,rgba(244,63,94,0.14),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_35%,rgba(255,255,255,0.03))]" />
        </div>

        <div className="relative z-10 flex h-full flex-col min-h-0">
          <div className={cn("px-4 kiosk-topbar", compactH ? "pt-2" : "pt-3")}>
            <div className="flex items-end justify-between gap-3 relative">
              <div className="min-w-0">
                <div className="kiosk-header tracking-[0.25em] uppercase text-white/45 text-[var(--fs-sub)]">
                  Sewing Dashboard
                </div>
                <div className="kiosk-header font-bold text-white truncate text-[var(--fs-title)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                  {current?.title ?? ""}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-white/55 truncate text-[var(--fs-sub)] bg-white/10 border border-white/15 px-2.5 py-1 rounded-full w-fit">
                    {activeLines.length ? `${activeLines.length} line(s)` : isLoading ? "Loading..." : "No data"}
                  </div>
                  {activeLines.length === 1
                    ? (() => {
                        const one = activeLines[0] as any;
                        // All live styles on the line; falls back to the
                        // back-compat scalar for older payloads.
                        const styles: string[] = Array.isArray(one?.active_style_names)
                          ? one.active_style_names.filter(Boolean)
                          : one?.active_style_name
                            ? [one.active_style_name]
                            : [];
                        if (!styles.length) return null;
                        return styles.map((name, i) => (
                          <div
                            key={name}
                            className="text-cyan-200/80 truncate text-[var(--fs-sub)] bg-cyan-500/10 border border-cyan-400/25 px-2.5 py-1 rounded-full w-fit"
                          >
                            {i === 0 ? `Style: ${name}` : name}
                          </div>
                        ));
                      })()
                    : null}
                </div>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
                <div className="kiosk-header font-bold tracking-[0.18em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] text-[calc(var(--fs-title)*1.35)]">
                  {(() => {
                    if (isTvMode) return String(currentLine?.production_line_name ?? "—").toUpperCase();

                    if (activeLines.length === 1) {
                      const one = activeLines[0] as any;
                      return String(
                        one?.production_line_name ??
                          one?.line_name ??
                          `LINE ${one?.production_line_id ?? ""}`
                      )
                        .toUpperCase()
                        .trim();
                    }

                    return "";
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {clockStr && (
                  <div className="hidden md:flex items-center gap-2 mr-1">
                    <span className="font-mono text-2xl font-bold tabular-nums text-white tracking-wider">
                      {clockStr.split(":").map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && (
                            <span style={{ opacity: colonOn ? 1 : 0.2, transition: "opacity 0.1s" }}>
                              :
                            </span>
                          )}
                          {part}
                        </React.Fragment>
                      ))}
                    </span>
                    <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300">
                      Auto Refresh
                    </span>
                  </div>
                )}

                <div className="hidden md:flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={cn(
                        "h-2.5 w-9 rounded-full transition-all",
                        i === safeIndex ? "bg-white/80" : "bg-white/20 hover:bg-white/35"
                      )}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={cycleInterval}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] backdrop-blur-md px-2.5 py-2 font-extrabold text-white hover:bg-white/[0.12] transition text-[var(--fs-sub)]"
                >
                  {slideInterval > 0 ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {INTERVAL_LABEL[slideInterval]}
                </button>
                <button
                  onClick={cycleTheme}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] backdrop-blur-md px-2.5 py-2 font-extrabold text-white hover:bg-white/[0.12] transition text-[var(--fs-sub)]"
                  title={`Theme: ${THEME_LABEL[kioskTheme]}`}
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden lg:inline">{THEME_LABEL[kioskTheme]}</span>
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
          @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');

          .kiosk-header { font-family: 'Barlow Condensed', 'Bebas Neue', ui-sans-serif, sans-serif; letter-spacing: 0.04em; }
          .kiosk-data   { font-family: 'DM Sans', ui-sans-serif, sans-serif; }

          /* ── Theme Variables ── */
          [data-theme="dark"], :root {
            --kiosk-bg: #0A0E1A;
            --kiosk-card: rgba(8,15,30,0.97);
            --kiosk-border: rgba(255,255,255,0.08);
            --kiosk-text: #CBD5E1;
            --kiosk-text-muted: rgba(255,255,255,0.45);
            --kiosk-row-odd: #0F1629;
            --kiosk-row-even: #151C35;
            --kiosk-row-hover: #1E2B45;
            --kiosk-panel-bg: rgba(255,255,255,0.025);
            --kiosk-panel-border: rgba(255,255,255,0.07);
            --kiosk-row-border: rgba(255,255,255,0.05);
            --kiosk-wip-row-active: rgba(255,255,255,0.04);
            --kiosk-wip-row-idle: rgba(255,255,255,0.018);
            --kiosk-wip-border: rgba(255,255,255,0.06);
            --kiosk-wip-label-active: rgba(255,255,255,0.85);
            --kiosk-wip-label-idle: rgba(255,255,255,0.3);
            --kiosk-seg-empty: rgba(255,255,255,0.07);
          }
          [data-theme="light"] {
            --kiosk-bg: #F1F5F9;
            --kiosk-card: rgba(255,255,255,0.98);
            --kiosk-border: rgba(0,0,0,0.10);
            --kiosk-text: #0F172A;
            --kiosk-text-muted: rgba(15,23,42,0.55);
            --kiosk-row-odd: #ffffff;
            --kiosk-row-even: #f8fafc;
            --kiosk-row-hover: #e2e8f0;
            --kiosk-panel-bg: rgba(255,255,255,0.98);
            --kiosk-panel-border: rgba(0,0,0,0.08);
            --kiosk-row-border: rgba(0,0,0,0.06);
            --kiosk-wip-row-active: rgba(0,0,0,0.025);
            --kiosk-wip-row-idle: rgba(0,0,0,0.015);
            --kiosk-wip-border: rgba(0,0,0,0.07);
            --kiosk-wip-label-active: #1e293b;
            --kiosk-wip-label-idle: #94a3b8;
            --kiosk-seg-empty: rgba(0,0,0,0.10);
          }

          /* Light theme — KPI cards: white bg with colored top border */
          [data-theme="light"] .kiosk-kpi-blue {
            background: linear-gradient(160deg,#EFF6FF,#DBEAFE) !important;
            border-color: #93C5FD !important;
            box-shadow: 0 0 0 1px #BFDBFE, 0 4px 18px rgba(59,130,246,0.12) !important;
          }
          [data-theme="light"] .kiosk-kpi-blue .kiosk-kpi-title { background: #1D4ED8 !important; }
          [data-theme="light"] .kiosk-kpi-blue .kiosk-kpi-value { color: #1E40AF !important; }

          [data-theme="light"] .kiosk-kpi-emerald {
            background: linear-gradient(160deg,#ECFDF5,#D1FAE5) !important;
            border-color: #6EE7B7 !important;
            box-shadow: 0 0 0 1px #A7F3D0, 0 4px 18px rgba(16,185,129,0.12) !important;
          }
          [data-theme="light"] .kiosk-kpi-emerald .kiosk-kpi-title { background: #047857 !important; }
          [data-theme="light"] .kiosk-kpi-emerald .kiosk-kpi-value { color: #065F46 !important; }

          [data-theme="light"] .kiosk-kpi-purple {
            background: linear-gradient(160deg,#F5F3FF,#EDE9FE) !important;
            border-color: #C4B5FD !important;
            box-shadow: 0 0 0 1px #DDD6FE, 0 4px 18px rgba(139,92,246,0.12) !important;
          }
          [data-theme="light"] .kiosk-kpi-purple .kiosk-kpi-title { background: #6D28D9 !important; }
          [data-theme="light"] .kiosk-kpi-purple .kiosk-kpi-value { color: #5B21B6 !important; }

          [data-theme="light"] .kiosk-kpi-amber {
            background: linear-gradient(160deg,#FFFBEB,#FEF3C7) !important;
            border-color: #FCD34D !important;
            box-shadow: 0 0 0 1px #FDE68A, 0 4px 18px rgba(245,158,11,0.12) !important;
          }
          [data-theme="light"] .kiosk-kpi-amber .kiosk-kpi-title { background: #B45309 !important; }
          [data-theme="light"] .kiosk-kpi-amber .kiosk-kpi-value { color: #92400E !important; }

          /* Light theme — card title text always white (dark bg title bar) */
          [data-theme="light"] .kiosk-kpi-title { color: #fff !important; }
          /* Light theme — card subtitle */
          [data-theme="light"] .kiosk-kpi-sub { opacity: 0.7 !important; }

          /* Light theme — actual/achievement badges: solid for readability */
          [data-theme="light"] .kiosk-badge-ok {
            background: #15803d !important;
            color: #ffffff !important;
            border-color: transparent !important;
          }
          [data-theme="light"] .kiosk-badge-fail {
            background: #dc2626 !important;
            color: #ffffff !important;
            border-color: transparent !important;
          }

          /* Light theme — header bar stays dark for readability */
          [data-theme="light"] .kiosk-topbar {
            background: #0f172a !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
            padding-bottom: 10px !important;
          }

          /* ── Unified table header band (premium, all themes) ── */
          .kiosk-th {
            background: linear-gradient(180deg, #243049, #161f33);
            color: #ffffff;
          }
          [data-theme="light"] .kiosk-th {
            background: linear-gradient(180deg, #f8fafc, #e9eef5);
            color: #0f172a;
          }
          [data-theme="midnight"] .kiosk-th { background: linear-gradient(180deg, #1c1c3e, #111028); }
          [data-theme="ocean"] .kiosk-th    { background: linear-gradient(180deg, #123047, #0c2235); }

          /* Slide 2/3 title subtitles */
          [data-theme="light"] .kiosk-s2-subtitle,
          [data-theme="light"] .kiosk-s3-subtitle { color: #64748b !important; }

          /* Slide 2 — elevated summary rows (Assemble/Output Total) */
          .kiosk-s2-sumrow {
            background: linear-gradient(90deg, rgba(99,102,241,0.16) 0%, rgba(34,211,238,0.05) 100%);
          }
          .kiosk-s2-sumrow:hover {
            background: linear-gradient(90deg, rgba(99,102,241,0.24) 0%, rgba(34,211,238,0.09) 100%);
          }
          [data-theme="light"] .kiosk-s2-sumrow {
            background: linear-gradient(90deg, #eef2ff 0%, #ecfeff 100%);
          }
          [data-theme="light"] .kiosk-s2-sumrow:hover {
            background: linear-gradient(90deg, #e0e7ff 0%, #cffafe 100%);
          }
          [data-theme="light"] .kiosk-s2-sum-tag {
            color: #475569 !important;
            background: #e2e8f0 !important;
            border-color: #cbd5e1 !important;
          }

          /* Light theme — slide 1 WIP Summary values: darkened accent colors for contrast */
          [data-theme="light"] .kiosk-s1-wipval      { color: #64748b !important; font-weight: 900 !important; }
          [data-theme="light"] .kiosk-s1-val-input   { color: #1d4ed8 !important; }
          [data-theme="light"] .kiosk-s1-val-output  { color: #059669 !important; }
          [data-theme="light"] .kiosk-s1-val-linewip { color: #7c3aed !important; }
          [data-theme="light"] .kiosk-s1-val-front   { color: #c2410c !important; }
          [data-theme="light"] .kiosk-s1-val-back    { color: #0e7490 !important; }
          [data-theme="light"] .kiosk-s1-val-sleeve  { color: #2563eb !important; }
          [data-theme="light"] .kiosk-s1-val-collar  { color: #b45309 !important; }
          [data-theme="light"] .kiosk-s1-val-hood    { color: #6d28d9 !important; }

          /* Light theme — slide 2 table and badges */
          [data-theme="light"] .kiosk-s2-card {
            background: #ffffff !important;
            border-color: rgba(0,0,0,0.08) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.10) !important;
          }
          [data-theme="light"] .kiosk-s2-cell-ok {
            background: #16a34a !important;
            border-color: transparent !important;
          }
          [data-theme="light"] .kiosk-s2-cell-fail {
            background: #4f46e5 !important;
            border-color: transparent !important;
          }
          [data-theme="light"] .kiosk-s2-total-td {
            background: rgba(249,115,22,0.07) !important;
          }
          [data-theme="light"] .kiosk-s2-total-box {
            background: #fff7ed !important;
            border-color: #f97316 !important;
          }
          [data-theme="light"] .kiosk-s2-total-value { color: #c2410c !important; }
          [data-theme="light"] .kiosk-s2-cell-zero   {
            color: #475569 !important;
            background: #e2e8f0 !important;
            border-color: #94a3b8 !important;
          }
          /* Light theme — slide 2 title heading */
          [data-theme="light"] .kiosk-s2-title { color: #0f172a !important; }
          /* Light theme — Parts row-label cells: light blue tint + dark blue text */
          [data-theme="light"] .kiosk-s2-part-td   { background: #eff6ff !important; }
          [data-theme="light"] .kiosk-s2-part-text { color: #1e3a8a !important; }
          /* Light theme — Target cells: light green tint + dark green text */
          [data-theme="light"] .kiosk-s2-tgt-td    { background: #ecfdf5 !important; }
          [data-theme="light"] .kiosk-s2-tgt-val   { color: #047857 !important; }

          /* Light theme — slide 3 quality monitoring */
          [data-theme="light"] .kiosk-s3-card {
            background: #ffffff !important;
            border-color: rgba(0,0,0,0.08) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.10) !important;
          }
          [data-theme="light"] .kiosk-s3-title   { color: #0f172a !important; }
          [data-theme="light"] .kiosk-s3-hour-text { color: #0f172a !important; }
          [data-theme="light"] .kiosk-s3-hour-badge {
            background: #334155 !important;
            border-color: transparent !important;
            color: #ffffff !important;
          }
          [data-theme="light"] .kiosk-s3-details-btn {
            background: #dcfce7 !important; border-color: #86efac !important; color: #15803d !important;
          }
          [data-theme="light"] .kiosk-s3-dhu-track  { background: #e2e8f0 !important; }
          [data-theme="light"] .kiosk-s3-dhu-text-ok  { color: #15803d !important; }
          [data-theme="light"] .kiosk-s3-dhu-text-bad { color: #dc2626 !important; }

          /* Light theme — slide 3 badges/chips: stronger contrast on white rows */
          [data-theme="light"] .kiosk-s3-defect-ok {
            background: #dcfce7 !important; border-color: #86efac !important; color: #15803d !important;
          }
          [data-theme="light"] .kiosk-s3-defect-bad {
            background: #fee2e2 !important; border-color: #fca5a5 !important; color: #b91c1c !important;
          }
          [data-theme="light"] .kiosk-s3-chip {
            background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #334155 !important;
          }
          [data-theme="light"] .kiosk-s3-empty {
            background: #f8fafc !important; border-color: #cbd5e1 !important; color: #64748b !important;
          }

          [data-theme="midnight"] {
            --kiosk-bg: #08081A;
            --kiosk-card: rgba(8,8,26,0.97);
            --kiosk-border: rgba(124,58,237,0.22);
            --kiosk-text: #C5CDD9;
            --kiosk-text-muted: rgba(197,205,217,0.48);
            --kiosk-row-odd: #0C0C24;
            --kiosk-row-even: #10102E;
            --kiosk-row-hover: #18183C;
            --kiosk-panel-bg: rgba(255,255,255,0.02);
            --kiosk-panel-border: rgba(255,255,255,0.06);
            --kiosk-row-border: rgba(255,255,255,0.04);
            --kiosk-wip-row-active: rgba(255,255,255,0.04);
            --kiosk-wip-row-idle: rgba(255,255,255,0.018);
            --kiosk-wip-border: rgba(255,255,255,0.05);
            --kiosk-wip-label-active: rgba(255,255,255,0.82);
            --kiosk-wip-label-idle: rgba(255,255,255,0.28);
            --kiosk-seg-empty: rgba(255,255,255,0.07);
          }
          [data-theme="ocean"] {
            --kiosk-bg: #091826;
            --kiosk-card: rgba(9,24,38,0.97);
            --kiosk-border: rgba(8,145,178,0.22);
            --kiosk-text: #DCE8F2;
            --kiosk-text-muted: rgba(220,232,242,0.48);
            --kiosk-row-odd: #0B1E2E;
            --kiosk-row-even: #0E2438;
            --kiosk-row-hover: #142E48;
            --kiosk-panel-bg: rgba(255,255,255,0.02);
            --kiosk-panel-border: rgba(255,255,255,0.06);
            --kiosk-row-border: rgba(255,255,255,0.04);
            --kiosk-wip-row-active: rgba(255,255,255,0.04);
            --kiosk-wip-row-idle: rgba(255,255,255,0.018);
            --kiosk-wip-border: rgba(255,255,255,0.05);
            --kiosk-wip-label-active: rgba(255,255,255,0.82);
            --kiosk-wip-label-idle: rgba(255,255,255,0.28);
            --kiosk-seg-empty: rgba(255,255,255,0.07);
          }

          /* ── Hide Scrollbars Globally ── */
          .kiosk-noscroll, .kiosk-noscroll * {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .kiosk-noscroll::-webkit-scrollbar,
          .kiosk-noscroll *::-webkit-scrollbar { display: none; }

          @keyframes slideIn {
            0%   { opacity: 0; transform: translateY(10px) scale(0.995); }
            100% { opacity: 1; transform: translateY(0px)  scale(1); }
          }
          @keyframes progressFill { from { width: 0%; } to { width: 100%; } }
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
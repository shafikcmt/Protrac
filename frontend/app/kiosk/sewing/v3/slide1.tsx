"use client";

import * as React from "react";
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
  String(s ?? "").toLowerCase().replace(/\s+/g, "");

function useCountUp(value: number, durationMs = 900) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return v;
}

/* Shared column widths across all three sub-tables (header / body / footer) */
const COL_WIDTHS = ["120px", "80px", "90px", "80px", "80px"] as const;
function TableColGroup() {
  return (
    <colgroup>
      {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
    </colgroup>
  );
}

/* ─────────────────────────────────────────────
   KPI CARD — solid filled background
   ───────────────────────────────────────────── */
function KpiCard({
  label,
  bgColor,
  textColor = "#ffffff",
  subTextColor,
  children,
}: {
  label: string;
  bgColor: string;
  textColor?: string;
  subTextColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
        background: bgColor,
        boxSizing: "border-box",
        height: "100%",
      }}
    >
      <div
        className="kiosk-header"
        style={{
          fontSize: "1.1rem",
          letterSpacing: "0.15em",
          color: subTextColor ?? textColor,
          opacity: 0.9,
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   8-CHUNK SEGMENTED WIP BAR
   ───────────────────────────────────────────── */
function WipSegBar({
  value,
  max,
  fillColor,
  glowColor,
}: {
  value: number;
  max: number;
  fillColor: string;
  glowColor: string;
}) {
  const SEGS = 8;
  const filled = Math.round(Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * SEGS);
  return (
    <div className="flex flex-1 items-center gap-[3px] min-w-0">
      {Array.from({ length: SEGS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px] transition-all duration-500"
          style={{
            height: 16,
            ...(i < filled
              ? { background: fillColor, boxShadow: `0 0 6px ${glowColor}` }
              : { background: "var(--kiosk-seg-empty, rgba(255,255,255,0.07))" }),
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WIP ROW — icon · label · segmented bar · value
   grow=true → flex:1 to share available height
   ───────────────────────────────────────────── */
function WipRow({
  label,
  value,
  max,
  fillColor,
  glowColor,
  icon,
  grow = false,
}: {
  label: string;
  value: number;
  max: number;
  fillColor: string;
  glowColor: string;
  icon?: React.ReactNode;
  grow?: boolean;
}) {
  const active = value > 0;
  return (
    <div
      className={cn("flex items-center gap-2 rounded-xl px-2.5", grow ? "flex-1" : "py-2")}
      style={{
        minHeight: grow ? 44 : undefined,
        background: active
          ? "var(--kiosk-wip-row-active, rgba(255,255,255,0.04))"
          : "var(--kiosk-wip-row-idle, rgba(255,255,255,0.018))",
        border: "1px solid var(--kiosk-wip-border, rgba(255,255,255,0.06))",
        borderLeft: `3px solid ${active ? fillColor : "var(--kiosk-row-border, rgba(255,255,255,0.1))"}`,
      }}
    >
      {icon && (
        <div
          className="shrink-0"
          style={{ color: active ? fillColor : "var(--kiosk-wip-label-idle, rgba(255,255,255,0.2))" }}
        >
          {icon}
        </div>
      )}
      <div
        className="shrink-0 kiosk-data truncate"
        style={{
          width: 90,
          minWidth: 90,
          fontSize: "1rem",
          fontWeight: 700,
          color: active
            ? "var(--kiosk-wip-label-active, rgba(255,255,255,0.85))"
            : "var(--kiosk-wip-label-idle, rgba(255,255,255,0.3))",
        }}
      >
        {label}
      </div>
      <WipSegBar value={value} max={max} fillColor={fillColor} glowColor={glowColor} />
      <div
        className="shrink-0 text-right tabular-nums kiosk-data"
        style={{
          minWidth: 56,
          fontSize: "1.15rem",
          fontWeight: 900,
          color: active ? fillColor : "var(--kiosk-wip-label-idle, rgba(255,255,255,0.2))",
        }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
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
  const dhu        = useCountUp(kpi.dhu,        700);
  const reworkQty  = useCountUp(kpi.reworkQty,  700);
  const reworkPct  = useCountUp(kpi.reworkPct,  700);

  const computed = React.useMemo(() => {
    let running = 0;
    const all = planVsActualRows.map((r) => {
      running += r.actual ?? 0;
      return { ...r, achievement: running };
    });
    const totalTarget = all.reduce((s, x) => s + (x.plan   ?? 0), 0);
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

  const wipParts: Record<string, { fill: string; glow: string; icon: React.ReactNode }> = {
    front:  { fill: "#F97316", glow: "rgba(249,115,22,0.7)",   icon: <Shirt      className="h-[15px] w-[15px]" /> },
    back:   { fill: "#06B6D4", glow: "rgba(6,182,212,0.7)",    icon: <PanelTop   className="h-[15px] w-[15px]" /> },
    sleeve: { fill: "#60A5FA", glow: "rgba(96,165,250,0.7)",   icon: <Scissors   className="h-[15px] w-[15px]" /> },
    collar: { fill: "#F59E0B", glow: "rgba(245,158,11,0.7)",   icon: <BadgeCheck className="h-[15px] w-[15px]" /> },
    hood:   { fill: "#A78BFA", glow: "rgba(167,139,250,0.7)",  icon: <Layers3    className="h-[15px] w-[15px]" /> },
  };

  /* KPI number style */
  const numStyle: React.CSSProperties = {
    fontSize: "clamp(3rem, 5vw, 4.5rem)",
    fontWeight: 900,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  };

  /* Sub-text style inside KPI cards */
  const subStyle: React.CSSProperties = {
    fontSize: "1rem",
    fontWeight: 500,
    opacity: 0.85,
    marginTop: 4,
  };

  /* Panel card style — uses CSS variables for light/dark theming */
  const panelStyle: React.CSSProperties = {
    background: "var(--kiosk-panel-bg, rgba(255,255,255,0.025))",
    border: "1px solid var(--kiosk-panel-border, rgba(255,255,255,0.07))",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  };

  return (
    /*
     * ROOT — height:100%, flex col, gap:8, padding:8,
     *        overflow:hidden, box-sizing:border-box
     * color uses --kiosk-text so it responds to all themes
     */
    <div
      className="w-full"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 8,
        overflow: "hidden",
        boxSizing: "border-box",
        fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
        color: "var(--kiosk-text, #ffffff)",
      }}
    >

      {/* ── KPI CARDS ROW ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          flexShrink: 0,
          height: 150,
        }}
      >

        {/* Card 1 — TARGET / ACTUAL */}
        <KpiCard
          label="TARGET / ACTUAL"
          bgColor="#1e293b"
          textColor="#ffffff"
          subTextColor="rgba(255,255,255,0.7)"
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="kiosk-data" style={{ ...numStyle, color: "#ffffff" }}>
              {Math.round(kpi.target).toLocaleString()}
            </span>
            <span
              className="kiosk-data"
              style={{
                fontSize: "clamp(1.5rem, 2.5vw, 2.2rem)",
                fontWeight: 900,
                lineHeight: 1,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              /
            </span>
            <span className="kiosk-data" style={{ ...numStyle, color: "#00E5FF" }}>
              {Math.round(kpi.actual).toLocaleString()}
            </span>
          </div>
          <div style={{ ...subStyle, color: "rgba(255,255,255,0.7)" }}>TODAY</div>
        </KpiCard>

        {/* Card 2 — EFFICIENCY */}
        <KpiCard
          label="EFFICIENCY"
          bgColor="#16a34a"
          textColor="#ffffff"
          subTextColor="rgba(255,255,255,0.85)"
        >
          <span className="kiosk-data" style={{ ...numStyle, color: "#ffffff" }}>
            {efficiency.toFixed(1)}%
          </span>
          <div style={{ ...subStyle, color: "rgba(255,255,255,0.8)" }}>
            A: {Math.round(kpi.actual)} · T: {Math.round(kpi.target)}
          </div>
        </KpiCard>

        {/* Card 3 — DHU */}
        <KpiCard
          label="DHU"
          bgColor="#9333ea"
          textColor="#ffffff"
          subTextColor="rgba(255,255,255,0.85)"
        >
          <span className="kiosk-data" style={{ ...numStyle, color: "#ffffff" }}>
            {dhu.toFixed(1)}%
          </span>
          <div style={{ ...subStyle, color: "rgba(255,255,255,0.8)" }}>
            Defects per 100 units
          </div>
        </KpiCard>

        {/* Card 4 — REWORK QTY */}
        <KpiCard
          label="REWORK QTY"
          bgColor="#d97706"
          textColor="#ffffff"
          subTextColor="rgba(255,255,255,0.85)"
        >
          <span className="kiosk-data" style={{ ...numStyle, color: "#ffffff" }}>
            {Math.round(reworkQty).toLocaleString()}
          </span>
          <div style={{ ...subStyle, color: "rgba(255,255,255,0.8)" }}>
            {reworkPct.toFixed(1)}% of output
          </div>
        </KpiCard>
      </div>

      {/* ── BOTTOM SECTION ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "57fr 43fr",
          gap: 16,
        }}
      >

        {/* ── LEFT PANEL: TARGET VS ACTUAL ── */}
        <div style={panelStyle}>

          {/* Panel header */}
          <div
            className="shrink-0 flex items-center justify-between px-4 py-2 border-b"
            style={{ borderColor: "var(--kiosk-panel-border, rgba(255,255,255,0.07))" }}
          >
            <h2
              className="kiosk-header font-extrabold uppercase tracking-[0.12em]"
              style={{ fontSize: 18, color: "var(--kiosk-text, #ffffff)" }}
            >
              Target vs Actual
            </h2>
            <div className="flex gap-1.5 kiosk-data font-black tabular-nums" style={{ fontSize: 11 }}>
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{
                  background: "rgba(30,58,138,0.55)",
                  color: "#93C5FD",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                {computed.totalTarget} TGT
              </span>
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{
                  background: "rgba(5,46,22,0.55)",
                  color: "#6EE7B7",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                {computed.totalActual} ACT
              </span>
            </div>
          </div>

          {/* Rainbow stripe */}
          <div
            className="h-[2px] w-full shrink-0"
            style={{
              background:
                "linear-gradient(90deg,#1E3A8A 0%,#065F46 25%,#6D28D9 50%,#92400E 75%,#0E4E6B 100%)",
            }}
          />

          {/* Sticky column headers */}
          <div className="shrink-0">
            <table className="w-full table-fixed border-collapse">
              <TableColGroup />
              <thead>
                <tr style={{ height: 42 }}>
                  <th
                    className="text-left uppercase px-3 border-r"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#ffffff",
                      background: "#1E3A8A",
                      borderColor: "rgba(255,255,255,0.1)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Hour
                  </th>
                  <th
                    className="text-right uppercase px-3 border-r"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#ffffff",
                      background: "#065F46",
                      borderColor: "rgba(255,255,255,0.1)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Target
                  </th>
                  <th
                    className="text-right uppercase px-3 border-r"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#ffffff",
                      background: "#6D28D9",
                      borderColor: "rgba(255,255,255,0.1)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Cum Tgt
                  </th>
                  <th
                    className="text-right uppercase px-3 border-r"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#ffffff",
                      background: "#92400E",
                      borderColor: "rgba(255,255,255,0.1)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Actual
                  </th>
                  <th
                    className="text-right uppercase px-3"
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#ffffff",
                      background: "#0E4E6B",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Cum Act
                  </th>
                </tr>
              </thead>
            </table>
          </div>

          {/*
           * Body — height:100% on the <table> distributes available flex space
           * evenly across tbody rows, eliminating dead space below last row.
           */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <table
              className="w-full table-fixed border-collapse kiosk-data"
              style={{ height: "100%", color: "var(--kiosk-text, #CBD5E1)" }}
            >
              <TableColGroup />
              <tbody>
                {tableRows.map((r, idx) => {
                  const ok  = (r.actual ?? 0) >= (r.plan ?? 0);
                  const cum = computed.all.find((x) => x.serial === r.serial)?.achievement ?? 0;
                  const bg  = idx % 2 === 0
                    ? "var(--kiosk-row-odd, #0B1020)"
                    : "var(--kiosk-row-even, #0F1629)";
                  return (
                    <tr
                      key={r.serial}
                      className="transition-colors duration-150"
                      style={{ background: bg }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--kiosk-row-hover, #1A2440)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = bg;
                      }}
                    >
                      {/* Hour */}
                      <td
                        className="border-b border-r px-3"
                        style={{
                          height: 48,
                          borderColor: "var(--kiosk-row-border, rgba(255,255,255,0.05))",
                          background: "rgba(30,58,138,0.28)",
                          borderLeft: "3px solid rgba(59,130,246,0.45)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="flex shrink-0 items-center justify-center rounded-full font-black"
                            style={{
                              height: 26,
                              width: 26,
                              minWidth: 26,
                              fontSize: 12,
                              color: "#ffffff",
                              background: "rgba(59,130,246,0.22)",
                              border: "1px solid rgba(59,130,246,0.38)",
                            }}
                          >
                            {r.serial}
                          </div>
                          <span
                            className="kiosk-data"
                            style={{
                              fontSize: "1.05rem",
                              fontWeight: 800,
                              color: "var(--kiosk-text, #ffffff)",
                            }}
                          >
                            H{r.serial}
                          </span>
                        </div>
                      </td>
                      {/* Target */}
                      <td
                        className="border-b border-r text-right px-3 tabular-nums kiosk-data"
                        style={{
                          fontSize: "1.15rem",
                          fontWeight: 800,
                          color: "var(--kiosk-text, #ffffff)",
                          borderColor: "var(--kiosk-row-border, rgba(255,255,255,0.05))",
                          background: "rgba(6,95,70,0.22)",
                        }}
                      >
                        {r.plan}
                      </td>
                      {/* Cum Target */}
                      <td
                        className="border-b border-r text-right px-3 tabular-nums kiosk-data"
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "var(--kiosk-text, #ffffff)",
                          borderColor: "var(--kiosk-row-border, rgba(255,255,255,0.05))",
                          background: "rgba(109,40,217,0.18)",
                        }}
                      >
                        {r.cumTarget}
                      </td>
                      {/* Actual — green/red badge */}
                      <td
                        className="border-b border-r text-right px-3"
                        style={{
                          borderColor: "var(--kiosk-row-border, rgba(255,255,255,0.05))",
                          background: "rgba(146,64,14,0.22)",
                        }}
                      >
                        <div className="flex justify-end">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded-full border tabular-nums kiosk-data",
                              ok ? "kiosk-badge-ok" : "kiosk-badge-fail"
                            )}
                            style={{
                              minWidth: 40,
                              height: 40,
                              paddingLeft: 8,
                              paddingRight: 8,
                              fontSize: "1.1rem",
                              fontWeight: 900,
                              ...(ok
                                ? {
                                    borderColor: "rgba(16,185,129,0.38)",
                                    background: "rgba(16,185,129,0.14)",
                                    color: "#6EE7B7",
                                  }
                                : {
                                    borderColor: "rgba(239,68,68,0.38)",
                                    background: "rgba(239,68,68,0.14)",
                                    color: "#FCA5A5",
                                  }),
                            }}
                          >
                            {r.actual}
                          </span>
                        </div>
                      </td>
                      {/* Cum Actual */}
                      <td
                        className="border-b text-right px-3 tabular-nums kiosk-data"
                        style={{
                          fontSize: "1.15rem",
                          fontWeight: 800,
                          color: "var(--kiosk-text, #ffffff)",
                          borderColor: "var(--kiosk-row-border, rgba(255,255,255,0.05))",
                          background: "rgba(14,78,107,0.22)",
                        }}
                      >
                        {cum}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pinned totals footer */}
          <div
            className="shrink-0 border-t-2"
            style={{ borderColor: "var(--kiosk-panel-border, rgba(255,255,255,0.12))" }}
          >
            <table className="w-full table-fixed border-collapse kiosk-data">
              <TableColGroup />
              <tfoot>
                <tr style={{ height: 48 }}>
                  <td className="px-3" style={{ background: "#1A2E5E" }}>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-black uppercase kiosk-data"
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.16em",
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      Total
                    </span>
                  </td>
                  <td
                    className="text-right px-3 tabular-nums kiosk-data"
                    style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff", background: "#064E3B" }}
                  >
                    {computed.totalTarget}
                  </td>
                  <td
                    className="text-right px-3 tabular-nums kiosk-data"
                    style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff", background: "#5B21B6" }}
                  >
                    {computed.totalTarget}
                  </td>
                  <td
                    className="text-right px-3 tabular-nums kiosk-data"
                    style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff", background: "#78350F" }}
                  >
                    {computed.totalActual}
                  </td>
                  <td
                    className="text-right px-3 tabular-nums kiosk-data"
                    style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff", background: "#0C4A6E" }}
                  >
                    {computed.totalActual}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── RIGHT PANEL: WIP SUMMARY ── */}
        <div style={panelStyle}>

          {/* Panel header */}
          <div
            className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: "var(--kiosk-panel-border, rgba(255,255,255,0.07))" }}
          >
            <h2
              className="kiosk-header uppercase tracking-[0.18em]"
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--kiosk-text, #ffffff)",
              }}
            >
              WIP Summary
            </h2>
            <div className="flex items-center gap-1.5">
              <div
                className="h-[7px] w-[7px] rounded-full bg-emerald-400"
                style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
              />
              <span
                className="kiosk-header font-black uppercase"
                style={{ fontSize: 9, letterSpacing: "0.2em", color: "#34D399" }}
              >
                LIVE
              </span>
            </div>
          </div>

          {/* Color stripe */}
          <div
            className="h-[2px] w-full shrink-0"
            style={{
              background:
                "linear-gradient(90deg,#06B6D4 0%,#3B82F6 33%,#A78BFA 66%,#F59E0B 100%)",
            }}
          />

          {/*
           * Rows container — flex:1, each WipRow has grow=true (flex:1)
           * so all 8 rows share the available height equally.
           */}
          <div
            className="flex flex-col px-2.5 py-2 gap-1.5"
            style={{ flex: 1, minHeight: 0 }}
          >
            <WipRow
              label="Total Input"
              value={wip.totalInput}
              max={Math.max(1, wip.totalInput)}
              fillColor="#3B82F6"
              glowColor="rgba(59,130,246,0.7)"
              icon={<ArrowDownToLine className="h-[15px] w-[15px]" />}
              grow
            />
            <WipRow
              label="Total Output"
              value={wip.totalOutput}
              max={Math.max(1, wip.totalInput)}
              fillColor="#00FF9D"
              glowColor="rgba(0,255,157,0.7)"
              icon={<ArrowUpFromLine className="h-[15px] w-[15px]" />}
              grow
            />
            <WipRow
              label="Line WIP"
              value={wip.lineWip}
              max={Math.max(1, wip.lineWip)}
              fillColor="#A855F7"
              glowColor="rgba(168,85,247,0.7)"
              icon={<Layers3 className="h-[15px] w-[15px]" />}
              grow
            />

            {/* Divider — shrink-0 so it never consumes row height */}
            <div className="relative flex shrink-0 items-center py-0.5">
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg,transparent,rgba(128,128,128,0.25),transparent)",
                }}
              />
              <span
                className="mx-2 kiosk-header uppercase rounded-full px-2 py-0.5"
                style={{
                  fontSize: "0.8rem",
                  letterSpacing: "0.15em",
                  fontWeight: 800,
                  opacity: 0.7,
                  background: "var(--kiosk-wip-row-idle, rgba(255,255,255,0.018))",
                  color: "var(--kiosk-text, rgba(255,255,255,0.5))",
                  border: "1px solid var(--kiosk-wip-border, rgba(255,255,255,0.07))",
                }}
              >
                Process WIP
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg,rgba(128,128,128,0.25),transparent)",
                }}
              />
            </div>

            {/* Per-part rows — each grows to share remaining height */}
            {visibleWipRows.map((r, idx) => {
              const partName = String(r.label)
                .replace(/\s*wip\s*$/i, "")
                .trim()
                .toLowerCase();
              const cfg = wipParts[partName] ?? {
                fill: "#64748B",
                glow: "rgba(100,116,139,0.5)",
                icon: <Layers3 className="h-[15px] w-[15px]" />,
              };
              return (
                <WipRow
                  key={`${r.label}-${idx}`}
                  label={r.label}
                  value={r.value}
                  max={Math.max(1, r.max)}
                  fillColor={cfg.fill}
                  glowColor={cfg.glow}
                  icon={cfg.icon}
                  grow
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

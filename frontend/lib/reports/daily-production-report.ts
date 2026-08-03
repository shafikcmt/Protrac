import { format } from "date-fns";
import { COMPANY_LOGO_BASE64 } from "./company-logo";

/* Shared visual language across every report export in this app — mirrors the
   constants in finishing-report.ts so all .xlsx files look like one family. */
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2563EB" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const BOLD_FONT = { bold: true, size: 11 };
const BORDER = {
  top: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
  left: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
  right: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
};
// Shaded fill for the per-buyer subtotal rows (light grey, same as the
// finishing report's TOTAL rows).
const SUBTOTAL_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE5E7EB" } };
// Light amber highlight for old-style-pending rows — mirrors the web view's
// Tailwind `bg-amber-50` (#FFFBEB) so the export flags the same transition rows.
const PENDING_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFBEB" } };

// Percentage number format: a pre-computed decimal (e.g. 85.34) shown as
// "85.34%". Applied to static values only — never an Excel formula — so the
// #DIV/0!/#REF! error classes seen in the manual demo template cannot occur.
const PCT_FMT = '0.00"%"';

// Em-dash for genuinely-blank values (e.g. a null working-hours), visually
// distinct from a real zero.
const EM_DASH = "–";

const num = (v: any) => Number(v) || 0;

/**
 * Build the exact same buyer-grouped structure the on-screen
 * production-report-table renders, so the exported numbers match the UI
 * one-for-one. Ported verbatim from production-report-table.tsx — including the
 * lining part metric. Buyer grouping is purely by the `buyer` string, so a
 * distinct buyer (e.g. "Sample") automatically gets its own group + subtotal.
 */
function buildDisplayByBuyer(reportData: any): Record<string, any[]> {
  const ordersByBuyer: Record<string, any[]> = {};
  const hiddenByBuyer: Record<string, any[]> = {};

  const ensureMetric = (obj: any, key: string) => {
    if (!obj[key]) obj[key] = { day: 0, cumulative: 0 };
  };

  (reportData.production_lines || []).forEach((line: any) => {
    (line.orders || []).forEach((order: any) => {
      const buyer = order.buyer || "UNKNOWN";
      const style = order.style || "UNKNOWN";
      const lineName = order.line || line?.production_line_name || "UNKNOWN";

      const isHidden = !!order.is_hidden;
      const targetByBuyer = isHidden ? hiddenByBuyer : ordersByBuyer;
      if (!targetByBuyer[buyer]) targetByBuyer[buyer] = [];

      const key = `${lineName}||${style}`;
      let acc = targetByBuyer[buyer]!.find((x) => x.__key === key);

      if (!acc) {
        acc = {
          __key: key,
          __items: [],
          line: lineName,
          buyer,
          style,
          is_hidden: isHidden,
          order_quantity: 0,
          input: 0,
          working_days: order.working_days ?? 1,
          working_hours: order.working_hours ?? null,
          front: { day: 0, cumulative: 0 },
          back: { day: 0, cumulative: 0 },
          sleeve: { day: 0, cumulative: 0 },
          hood: { day: 0, cumulative: 0 },
          collar: { day: 0, cumulative: 0 },
          lining: { day: 0, cumulative: 0 },
          assembly_input: { day: 0, cumulative: 0 },
          output: { day: 0, cumulative: 0 },
          inspection: { day: 0, cumulative: 0 },
          packed: { day: 0, cumulative: 0 },
          is_pending_transition: false,
          needs_manual_complete: false,
          pending_quantity: 0,
          remarks: "",
          __dhuDayNum: 0,
          __dhuDayDen: 0,
          __dhuAvgNum: 0,
          __dhuAvgDen: 0,
          dhu_day: 0,
          dhu_average: 0,
        };
        targetByBuyer[buyer]!.push(acc);
      }

      acc.__items.push(order);
      acc.order_quantity += num(order.order_quantity);
      acc.input += num(order.input);
      if (order.needs_manual_complete) acc.needs_manual_complete = true;
      if (order.is_pending_transition) {
        acc.is_pending_transition = true;
        acc.pending_quantity += num(order.pending_quantity);
        if (order.remarks && !acc.remarks) acc.remarks = order.remarks;
      }

      const addMetric = (keyName: string) => {
        ensureMetric(acc, keyName);
        const src = order[keyName] || {};
        acc[keyName].day += num(src.day);
        acc[keyName].cumulative += num(src.cumulative);
      };
      addMetric("front");
      addMetric("back");
      addMetric("sleeve");
      addMetric("hood");
      addMetric("collar");
      addMetric("lining");
      addMetric("assembly_input");
      addMetric("output");
      addMetric("inspection");
      addMetric("packed");

      const outDay = num(order.output?.day);
      const outCum = num(order.output?.cumulative);
      const dhuDay = num(order.dhu_day);
      const dhuAvg = num(order.dhu_average);
      if (outDay > 0) {
        acc.__dhuDayNum += dhuDay * outDay;
        acc.__dhuDayDen += outDay;
      }
      if (outCum > 0) {
        acc.__dhuAvgNum += dhuAvg * outCum;
        acc.__dhuAvgDen += outCum;
      }
      acc.dhu_day = acc.__dhuDayDen > 0 ? acc.__dhuDayNum / acc.__dhuDayDen : 0;
      acc.dhu_average = acc.__dhuAvgDen > 0 ? acc.__dhuAvgNum / acc.__dhuAvgDen : 0;
    });
  });

  const displayByBuyer: Record<string, any[]> = {};
  const allBuyers = Array.from(
    new Set([...Object.keys(ordersByBuyer), ...Object.keys(hiddenByBuyer)])
  );
  allBuyers.forEach((b) => {
    displayByBuyer[b] = [...(ordersByBuyer[b] || []), ...(hiddenByBuyer[b] || [])];
  });
  return displayByBuyer;
}

// Per-row efficiency %, exactly as the on-screen table computes it.
const efficiency = (outputPart: number, input: number) =>
  input > 0 ? (outputPart / input) * 100 : 0;

// Compact, single-line remarks for the exports so the Remarks column stays
// narrow and never forces a horizontal scrollbar. Built from structured fields
// (not by parsing the verbose backend string). Hidden rows keep the "Hidden"
// tag; pending-transition rows collapse to e.g. "Old:2266→2021, New:✓"
// (cumulative input → cumulative output, i.e. the two numbers the reported
// pending quantity is the difference of), with ", Mark" appended when manual
// completion is required. Non-transition rows stay blank. The full explanatory
// text still lives in the on-screen tooltip and the backend source string.
const remarksText = (order: any) => {
  if (order.is_hidden) return "Hidden";
  if (order.is_pending_transition) {
    const input = num(order.input);
    const output = num(order.output?.cumulative);
    let text = `Old:${input}→${output}, New:✓`;
    if (order.needs_manual_complete) text += ", Mark";
    return text;
  }
  return "";
};

/**
 * Generate and download a styled .xlsx of the Daily Production Report, laid out
 * to match the on-screen table: two-tier headers, buyer-grouped rows, per-buyer
 * subtotal rows, and a grand-total footer. Mirrors finishing-report.ts.
 *
 * Every cell holds a static value pre-computed from `reportData` — there are no
 * Excel formulas anywhere, so #REF!/#DIV/0! style errors are structurally
 * impossible (unlike the hand-maintained factory template this replaces).
 */
export async function generateDailyProductionExcel(reportData: any, filters: any) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ProTrac";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Daily Production");

  const reportDate = reportData?.report_date || filters?.report_date || "";

  // 30 columns: 7 single + 11 two-column part/metric groups + Remarks. Widths
  // tuned so no text truncates. Column order matches the on-screen table and the
  // real factory report: Front, Back, Sleeve, Hood/Collar, Lining, Assembly
  // Input, Output, Efficiency %, DHU %, Inspection, Packed.
  sheet.columns = [
    { width: 9 },  // 1  Line
    { width: 14 }, // 2  Buyer
    { width: 16 }, // 3  Style
    { width: 9 },  // 4  Order Qty
    { width: 7 },  // 5  W Days
    { width: 6 },  // 6  Hrs
    { width: 8 },  // 7  Input
    { width: 7 },  // 8  Front Day
    { width: 7 },  // 9  Front Cumm
    { width: 7 },  // 10 Back Day
    { width: 7 },  // 11 Back Cumm
    { width: 7 },  // 12 Sleeve Day
    { width: 7 },  // 13 Sleeve Cumm
    { width: 7 },  // 14 Hood/Collar Day
    { width: 7 },  // 15 Hood/Collar Cumm
    { width: 7 },  // 16 Lining Day
    { width: 7 },  // 17 Lining Cumm
    { width: 7 },  // 18 Assembly Input Day
    { width: 7 },  // 19 Assembly Input Cumm
    { width: 7 },  // 20 Output Day
    { width: 7 },  // 21 Output Cumm
    { width: 7 },  // 22 Efficiency Day
    { width: 7 },  // 23 Efficiency Avg
    { width: 7 },  // 24 DHU Day
    { width: 7 },  // 25 DHU Avg
    { width: 7 },  // 26 Inspection Day
    { width: 7 },  // 27 Inspection Cumm
    { width: 7 },  // 28 Packed Day
    { width: 7 },  // 29 Packed Cumm
    { width: 14 }, // 30 Remarks
  ];

  const LAST_COL = 30;

  /* ── Title block ──
     Each line is merged across the full table width and centered for a modern
     banner. An optional logo floats top-left; the centered text sits in the
     middle columns, so the two never overlap. */
  const NAVY = "FF1B3A5C"; // brand navy matching the logo wordmark
  if (COMPANY_LOGO_BASE64) {
    const imageId = workbook.addImage({ base64: COMPANY_LOGO_BASE64, extension: "png" });
    sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 160, height: 73 } });
  }
  const titleLines: Array<[string, any]> = [
    ["Humana Apparels Pvt. Ltd.", { bold: true, size: 17, color: { argb: NAVY } }],
    ["Daily Production Report", { bold: true, size: 13, color: { argb: NAVY } }],
    [`Report Date: ${reportDate}`, { size: 10, color: { argb: "FF6B7280" } }],
    [`Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`, { italic: true, size: 10, color: { argb: "FF9CA3AF" } }],
  ];
  let lastTitleRowNum = 0;
  titleLines.forEach(([text, font]) => {
    const row = sheet.addRow([]);
    sheet.mergeCells(row.number, 1, row.number, LAST_COL);
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = font;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    lastTitleRowNum = row.number;
  });
  // Thin gray bottom border across the last title row separates banner from table.
  const titleBorderRow = sheet.getRow(lastTitleRowNum);
  for (let c = 1; c <= LAST_COL; c++) {
    titleBorderRow.getCell(c).border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
  }

  /* ── Two-tier header ──
     Group-header row + sub-header row. Single columns are merged vertically
     across both rows; the eleven metric groups merge horizontally across their
     pair on the group row, with Day/Cumm (or Day/Avg) beneath on the sub row. */
  const groupHeaderRowIdx = sheet.rowCount + 1;
  const subHeaderRowIdx = groupHeaderRowIdx + 1;

  const groupRow = sheet.getRow(groupHeaderRowIdx);
  const subRow = sheet.getRow(subHeaderRowIdx);

  // Single columns: label on the group row, merged down into the sub row.
  const singleCols: Array<[number, string]> = [
    [1, "Line"],
    [2, "Buyer"],
    [3, "Style"],
    [4, "Order Qty"],
    [5, "W Days"],
    [6, "Hrs"],
    [7, "Input"],
    [30, "Remarks"],
  ];
  singleCols.forEach(([col, label]) => {
    sheet.mergeCells(groupHeaderRowIdx, col, subHeaderRowIdx, col);
    groupRow.getCell(col).value = label;
  });

  // Eleven metric groups: [group label, left col, Day-sub, right-sub]. Efficiency
  // and DHU use "Avg" for the right sub-header (matching the on-screen table);
  // every other part uses "Cumm".
  const groups: Array<[string, number, string, string]> = [
    ["Front", 8, "Day", "Cumm"],
    ["Back", 10, "Day", "Cumm"],
    ["Sleeve", 12, "Day", "Cumm"],
    ["Hood/Collar", 14, "Day", "Cumm"],
    ["Lining", 16, "Day", "Cumm"],
    ["Assembly Input", 18, "Day", "Cumm"],
    ["Output", 20, "Day", "Cumm"],
    ["Efficiency %", 22, "Day", "Avg"],
    ["DHU %", 24, "Day", "Avg"],
    ["Inspection", 26, "Day", "Cumm"],
    ["Packed", 28, "Day", "Cumm"],
  ];
  groups.forEach(([label, leftCol, subL, subR]) => {
    sheet.mergeCells(groupHeaderRowIdx, leftCol, groupHeaderRowIdx, leftCol + 1);
    groupRow.getCell(leftCol).value = label;
    subRow.getCell(leftCol).value = subL;
    subRow.getCell(leftCol + 1).value = subR;
  });

  // Style both header rows identically.
  [groupRow, subRow].forEach((row) => {
    for (let c = 1; c <= LAST_COL; c++) {
      const cell = row.getCell(c);
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = BORDER;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
  });

  // Freeze the header rows (ySplit) AND the first 7 identity columns
  // (Line…Input, xSplit) so they stay visible while scrolling right through
  // Front/Back/.../Packed/Remarks.
  sheet.views = [{ state: "frozen", xSplit: 7, ySplit: subHeaderRowIdx }];

  // Print/PDF-friendly: landscape A4, scaled to fit all columns on one page
  // wide (fitToHeight: 0 lets it flow onto multiple pages vertically).
  sheet.pageSetup = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
  };

  /* ── Data rows, grouped by buyer with a subtotal after each ── */
  const displayByBuyer = buildDisplayByBuyer(reportData);

  const writeDataRow = (order: any) => {
    const hoodDay = num(order.hood?.day) + num(order.collar?.day);
    const hoodCumm = num(order.hood?.cumulative) + num(order.collar?.cumulative);
    const input = num(order.input);

    const row = sheet.addRow([
      order.line,
      order.buyer,
      order.style,
      num(order.order_quantity),
      order.working_days,
      // Blank working-hours → em-dash, distinct from a genuine zero.
      order.working_hours == null ? EM_DASH : Number(Number(order.working_hours).toFixed(2)),
      input,
      num(order.front?.day),
      num(order.front?.cumulative),
      num(order.back?.day),
      num(order.back?.cumulative),
      num(order.sleeve?.day),
      num(order.sleeve?.cumulative),
      hoodDay,
      hoodCumm,
      num(order.lining?.day),
      num(order.lining?.cumulative),
      num(order.assembly_input?.day),
      num(order.assembly_input?.cumulative),
      num(order.output?.day),
      num(order.output?.cumulative),
      efficiency(num(order.output?.day), input),
      efficiency(num(order.output?.cumulative), input),
      num(order.dhu_day),
      num(order.dhu_average),
      num(order.inspection?.day),
      num(order.inspection?.cumulative),
      num(order.packed?.day),
      num(order.packed?.cumulative),
      remarksText(order),
    ]);

    // Light amber fill for old-style-pending rows (not hidden), mirroring the
    // web view's bg-amber-50 highlight — the same rows that get the compact
    // "Old:…→…, New:✓" remarks. Applied before per-cell styling so borders/
    // alignment/number formats still take effect on top.
    const isPending = !!order.is_pending_transition && !order.is_hidden;

    row.eachCell((cell, col) => {
      cell.border = BORDER;
      if (isPending) cell.fill = PENDING_FILL;
      if (col >= 4 && col <= 29) cell.alignment = { horizontal: "right" };
      // Percentage columns: Efficiency (22,23) + DHU (24,25), 2 decimals + %.
      if (col >= 22 && col <= 25) cell.numFmt = PCT_FMT;
    });
    // Greyed-out hidden rows, mirroring the muted UI treatment.
    if (order.is_hidden) {
      row.eachCell((cell) => { cell.font = { color: { argb: "FF9CA3AF" } }; });
    }
  };

  const writeSubtotalRow = (buyer: string, orders: any[]) => {
    const visible = orders.filter((o) => !o.is_hidden);
    const sum = (fn: (o: any) => number) => visible.reduce((s, o) => s + fn(o), 0);

    const row = sheet.getRow(sheet.rowCount + 1);
    row.getCell(1).value = `${buyer} Total`;
    sheet.mergeCells(row.number, 1, row.number, 3);
    row.getCell(4).value = sum((o) => num(o.order_quantity)); // Order Qty
    row.getCell(7).value = sum((o) => num(o.input)); // Input
    row.getCell(20).value = sum((o) => num(o.output?.day)); // Output Day
    row.getCell(21).value = sum((o) => num(o.output?.cumulative)); // Output Cumm

    for (let c = 1; c <= LAST_COL; c++) {
      const cell = row.getCell(c);
      cell.font = BOLD_FONT;
      cell.border = BORDER;
      cell.fill = SUBTOTAL_FILL;
      if (c >= 4 && c <= 29) cell.alignment = { horizontal: "right" };
    }
    row.getCell(1).alignment = { horizontal: "left" };
  };

  Object.entries(displayByBuyer).forEach(([buyer, orders]) => {
    orders.forEach((order) => writeDataRow(order));
    writeSubtotalRow(buyer, orders);
  });

  /* ── Grand-total footer — straight from reportData.summary, exactly like the
        on-screen summary strip. All static values, no formulas. ── */
  const summary = reportData?.summary;
  if (summary) {
    const footerHeaderRowIdx = sheet.rowCount + 1;
    const labels = [
      "Total Lines",
      "Total Orders",
      "Order Qty",
      "Total Input",
      "Daily Output",
      "Daily Inspection",
      "Daily Packed",
      "Efficiency %",
    ];
    const values = [
      num(summary.total_production_lines),
      num(summary.total_orders),
      num(summary.total_order_quantity),
      num(summary.daily_input),
      num(summary.daily_output),
      num(summary.daily_inspection),
      num(summary.daily_packed),
      num(summary.overall_efficiency),
    ];

    const fLabelRow = sheet.getRow(footerHeaderRowIdx);
    const fValueRow = sheet.getRow(footerHeaderRowIdx + 1);
    // Each label/value spans a merged block of 3 columns (A-C, D-F, …) so the
    // widest label ("Daily Inspection") fits on ONE line with wrapText off,
    // without touching the narrow data-column widths above.
    labels.forEach((label, i) => {
      const startCol = 1 + i * 3;
      const endCol = startCol + 2;
      sheet.mergeCells(fLabelRow.number, startCol, fLabelRow.number, endCol);
      sheet.mergeCells(fValueRow.number, startCol, fValueRow.number, endCol);
      for (let c = startCol; c <= endCol; c++) {
        const lc = fLabelRow.getCell(c);
        lc.fill = HEADER_FILL;
        lc.font = HEADER_FONT;
        lc.border = BORDER;
        const vc = fValueRow.getCell(c);
        vc.font = BOLD_FONT;
        vc.border = BORDER;
      }
      const labelCell = fLabelRow.getCell(startCol);
      labelCell.value = label;
      labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
      const valueCell = fValueRow.getCell(startCol);
      valueCell.value = values[i];
      valueCell.alignment = { horizontal: "center" };
      if (i === 7) valueCell.numFmt = PCT_FMT; // Efficiency %
    });
  }

  /* ── Download ── */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Daily_Production_Report_${reportDate || format(new Date(), "yyyy-MM-dd")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===========================================================================
// Shared flat (single-tier) row model — feeds both the CSV and PDF exports so
// their columns, subtotals and grand-total match the Excel version one-for-one.
// ===========================================================================
const FLAT_COLUMNS = [
  "Line", "Buyer", "Style", "Order Qty", "W Days", "Hrs", "Input",
  "Front Day", "Front Cumm", "Back Day", "Back Cumm", "Sleeve Day", "Sleeve Cumm",
  "Hood/Collar Day", "Hood/Collar Cumm", "Lining Day", "Lining Cumm",
  "Assembly Input Day", "Assembly Input Cumm", "Output Day", "Output Cumm",
  "Efficiency % Day", "Efficiency % Avg", "DHU % Day", "DHU % Avg",
  "Inspection Day", "Inspection Cumm", "Packed Day", "Packed Cumm", "Remarks",
];

type FlatRowKind = "data" | "subtotal" | "grand";
interface FlatRow {
  kind: FlatRowKind;
  cells: Array<string | number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildFlatRows(reportData: any): FlatRow[] {
  const displayByBuyer = buildDisplayByBuyer(reportData);
  const rows: FlatRow[] = [];

  Object.entries(displayByBuyer).forEach(([buyer, orders]) => {
    orders.forEach((order: any) => {
      const hoodDay = num(order.hood?.day) + num(order.collar?.day);
      const hoodCumm = num(order.hood?.cumulative) + num(order.collar?.cumulative);
      const input = num(order.input);
      rows.push({
        kind: "data",
        cells: [
          order.line ?? "",
          order.buyer ?? "",
          order.style ?? "",
          num(order.order_quantity),
          order.working_days ?? "",
          order.working_hours == null ? EM_DASH : round2(Number(order.working_hours)),
          input,
          num(order.front?.day), num(order.front?.cumulative),
          num(order.back?.day), num(order.back?.cumulative),
          num(order.sleeve?.day), num(order.sleeve?.cumulative),
          hoodDay, hoodCumm,
          num(order.lining?.day), num(order.lining?.cumulative),
          num(order.assembly_input?.day), num(order.assembly_input?.cumulative),
          num(order.output?.day), num(order.output?.cumulative),
          round2(efficiency(num(order.output?.day), input)),
          round2(efficiency(num(order.output?.cumulative), input)),
          round2(num(order.dhu_day)), round2(num(order.dhu_average)),
          num(order.inspection?.day), num(order.inspection?.cumulative),
          num(order.packed?.day), num(order.packed?.cumulative),
          remarksText(order),
        ],
      });
    });

    const visible = orders.filter((o: any) => !o.is_hidden);
    const sum = (fn: (o: any) => number) => visible.reduce((s: number, o: any) => s + fn(o), 0);
    const sub: Array<string | number> = new Array(FLAT_COLUMNS.length).fill("");
    sub[0] = `${buyer} Total`;
    sub[3] = sum((o) => num(o.order_quantity)); // Order Qty
    sub[6] = sum((o) => num(o.input)); // Input
    sub[19] = sum((o) => num(o.output?.day)); // Output Day
    sub[20] = sum((o) => num(o.output?.cumulative)); // Output Cumm
    rows.push({ kind: "subtotal", cells: sub });
  });

  const summary = reportData?.summary;
  if (summary) {
    const g: Array<string | number> = new Array(FLAT_COLUMNS.length).fill("");
    g[0] = "G. Total";
    g[3] = num(summary.total_order_quantity);
    g[6] = num(summary.daily_input);
    g[19] = num(summary.daily_output);
    g[21] = round2(num(summary.overall_efficiency)); // Efficiency % Day slot
    g[25] = num(summary.daily_inspection);
    g[27] = num(summary.daily_packed);
    rows.push({ kind: "grand", cells: g });
  }
  return rows;
}

/**
 * Export the Daily Production Report as an A3-landscape PDF via jspdf +
 * jspdf-autotable. A3 (not A4) because 30 columns at a readable 6-7pt would be
 * unusably cramped on A4 landscape; A3 fits them all on one page width.
 */
export async function generateDailyProductionPDF(reportData: any, filters: any) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const reportDate = reportData?.report_date || filters?.report_date || format(new Date(), "yyyy-MM-dd");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();

  /* ── Title block (mirrors the Excel banner: navy heading, optional logo) ── */
  if (COMPANY_LOGO_BASE64) {
    try {
      doc.addImage(COMPANY_LOGO_BASE64, "PNG", 40, 24, 90, 41);
    } catch {
      /* a bad/oversized logo must not break the export */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 58, 92); // navy #1B3A5C
  doc.setFontSize(16);
  doc.text("Humana Apparels Pvt. Ltd.", pageWidth / 2, 40, { align: "center" });
  doc.setFontSize(12);
  doc.text("Daily Production Report", pageWidth / 2, 58, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.text(`Report Date: ${reportDate}`, pageWidth / 2, 74, { align: "center" });

  const rows = buildFlatRows(reportData);
  const body = rows.map((r) => r.cells.map((c) => (typeof c === "number" ? String(c) : c)));

  // Right-align every numeric column (Order Qty … Packed Cumm); text stays left.
  const columnStyles: Record<number, any> = {};
  for (let i = 3; i <= 28; i++) columnStyles[i] = { halign: "right" };
  // Remarks (last column, index 29): fixed narrow width and single-line ellipsis
  // so the now-compact text can never wrap and inflate row height / total width.
  columnStyles[29] = { cellWidth: 58, overflow: "ellipsize" };

  autoTable(doc, {
    head: [FLAT_COLUMNS],
    body,
    startY: 88,
    theme: "grid",
    showHead: "everyPage", // repeat column headers on every page
    styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak", lineColor: [209, 213, 219], lineWidth: 0.3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles,
    didParseCell: (data: any) => {
      if (data.section !== "body") return;
      const kind = rows[data.row.index]?.kind;
      if (kind === "subtotal") {
        data.cell.styles.fillColor = [229, 231, 235];
        data.cell.styles.fontStyle = "bold";
      } else if (kind === "grand") {
        data.cell.styles.fillColor = [219, 234, 254];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.save(`Daily_Production_Report_${reportDate}.pdf`);
}

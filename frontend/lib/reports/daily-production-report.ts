import { format } from "date-fns";

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

// On-screen remarks cell shows a "Hidden" badge or the pending-transition text
// (with " | " normalised to " · "); mirror that as plain text.
const remarksText = (order: any) => {
  if (order.is_hidden) return "Hidden";
  if (order.is_pending_transition && order.remarks) {
    return String(order.remarks).replace(/\s*\|\s*/g, " · ");
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
    { width: 10 }, // 1  Line
    { width: 16 }, // 2  Buyer
    { width: 18 }, // 3  Style
    { width: 11 }, // 4  Order Qty
    { width: 8 },  // 5  W Days
    { width: 7 },  // 6  Hrs
    { width: 10 }, // 7  Input
    { width: 9 },  // 8  Front Day
    { width: 9 },  // 9  Front Cumm
    { width: 9 },  // 10 Back Day
    { width: 9 },  // 11 Back Cumm
    { width: 9 },  // 12 Sleeve Day
    { width: 9 },  // 13 Sleeve Cumm
    { width: 11 }, // 14 Hood/Collar Day
    { width: 11 }, // 15 Hood/Collar Cumm
    { width: 9 },  // 16 Lining Day
    { width: 9 },  // 17 Lining Cumm
    { width: 11 }, // 18 Assembly Input Day
    { width: 11 }, // 19 Assembly Input Cumm
    { width: 10 }, // 20 Output Day
    { width: 10 }, // 21 Output Cumm
    { width: 11 }, // 22 Efficiency Day
    { width: 11 }, // 23 Efficiency Avg
    { width: 9 },  // 24 DHU Day
    { width: 9 },  // 25 DHU Avg
    { width: 11 }, // 26 Inspection Day
    { width: 11 }, // 27 Inspection Cumm
    { width: 10 }, // 28 Packed Day
    { width: 10 }, // 29 Packed Cumm
    { width: 28 }, // 30 Remarks
  ];

  const LAST_COL = 30;

  /* ── Title block ── */
  sheet.addRow(["Humana Apparels Pvt. Ltd."]).getCell(1).font = { bold: true, size: 14 };
  sheet.addRow(["Daily Production Report"]).getCell(1).font = { bold: true, size: 12 };
  sheet.addRow([`Report Date: ${reportDate}`]).getCell(1).font = { size: 10, color: { argb: "FF374151" } };
  sheet.addRow([`Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`]).getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
  sheet.addRow([]); // spacer

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

  // Freeze everything down to and including the sub-header row.
  sheet.views = [{ state: "frozen", ySplit: subHeaderRowIdx }];

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

    row.eachCell((cell, col) => {
      cell.border = BORDER;
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
    sheet.addRow([]); // spacer
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
    labels.forEach((label, i) => {
      const cell = fLabelRow.getCell(i + 1);
      cell.value = label;
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = BORDER;
      cell.alignment = { horizontal: "center", wrapText: true };
    });
    values.forEach((value, i) => {
      const cell = fValueRow.getCell(i + 1);
      cell.value = value;
      cell.font = BOLD_FONT;
      cell.border = BORDER;
      cell.alignment = { horizontal: "center" };
      if (i === 7) cell.numFmt = PCT_FMT; // Efficiency %
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

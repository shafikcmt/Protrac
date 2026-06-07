import { format, parseISO } from "date-fns";
import {
  OrderGroup,
  StatusKind,
  getStatus,
  STATUS_LABEL,
} from "@/app/kiosk/finishing/finishing-types";

interface SummaryStats {
  totalInput: number;
  totalOutput: number;
  totalWip: number;
  avgCompletionRate: number;
  totalOrders: number;
}

const STATUS_BG: Record<StatusKind, string> = {
  expired: "FFFEE2E2",
  "due-today": "FFFEE2E2",
  "expiring-soon": "FFFEF3C7",
  "in-progress": "FFE0F2FE",
  done: "FFF0FDF4",
};

const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2563EB" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const BOLD_FONT = { bold: true, size: 11 };
const BORDER = {
  top: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
  left: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
  right: { style: "thin" as const, color: { argb: "FFD1D5DB" } },
};

export async function generateFinishingExcel(
  groups: OrderGroup[],
  summaryStats: SummaryStats,
  qcPassRate: number | null
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ProTrac";
  workbook.created = new Date();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { width: 30 },
    { width: 18 },
  ];

  summarySheet.addRow(["Humana Apparels Pvt. Ltd."]).getCell(1).font = { bold: true, size: 14 };
  summarySheet.addRow(["Finishing Production Report"]).getCell(1).font = { bold: true, size: 12 };
  summarySheet.addRow([`Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`]).getCell(1).font = { color: { argb: "FF6B7280" }, size: 10 };
  summarySheet.addRow([]);

  const summaryHeaderRow = summarySheet.addRow(["Metric", "Value"]);
  summaryHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER;
    cell.alignment = { horizontal: "left" };
  });

  const summaryData = [
    ["Total Orders", summaryStats.totalOrders],
    ["Total Input", summaryStats.totalInput.toLocaleString()],
    ["Total Output", summaryStats.totalOutput.toLocaleString()],
    ["Total WIP", summaryStats.totalWip.toLocaleString()],
    ["Avg Completion", `${(summaryStats.avgCompletionRate * 100).toFixed(1)}%`],
    ...(qcPassRate !== null ? [["QC Pass Rate", `${qcPassRate.toFixed(1)}%`]] : []),
  ];

  summaryData.forEach(([metric, value]) => {
    const row = summarySheet.addRow([metric, value]);
    row.eachCell((cell) => { cell.border = BORDER; });
    row.getCell(1).font = BOLD_FONT;
  });

  // ── Sheet 2: Order Details ─────────────────────────────────────────────
  const detailSheet = workbook.addWorksheet("Order Details");
  detailSheet.columns = [
    { header: "Order No", width: 16 },
    { header: "Style", width: 28 },
    { header: "Customer", width: 22 },
    { header: "Size", width: 10 },
    { header: "Input", width: 10 },
    { header: "Output", width: 10 },
    { header: "WIP", width: 10 },
    { header: "Done%", width: 10 },
    { header: "Delivery", width: 14 },
    { header: "Status", width: 14 },
  ];

  const headerRow = detailSheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER;
    cell.alignment = { horizontal: "center" };
  });
  detailSheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const order of groups) {
    const status = getStatus(order);
    const deliveryStr = order.delivery_date
      ? format(parseISO(order.delivery_date), "MMM dd, yyyy")
      : "—";
    const bg = STATUS_BG[status];

    for (const size of order.sizes) {
      const row = detailSheet.addRow([
        order.order_number,
        order.style_name,
        order.customer_name,
        size.size_name,
        size.input,
        size.output,
        size.wip,
        parseFloat(size.rate.toFixed(1)),
        deliveryStr,
        STATUS_LABEL[status],
      ]);

      row.eachCell((cell, col) => {
        cell.border = BORDER;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        if (col >= 5 && col <= 8) cell.alignment = { horizontal: "right" };
      });

      row.getCell(1).font = BOLD_FONT;
    }

    // Total row when multiple sizes
    if (order.sizes.length > 1) {
      const totalRow = detailSheet.addRow([
        order.order_number,
        order.style_name,
        order.customer_name,
        "TOTAL",
        order.total_input,
        order.total_output,
        order.total_wip,
        parseFloat((order.completion_rate * 100).toFixed(1)),
        deliveryStr,
        STATUS_LABEL[status],
      ]);
      totalRow.eachCell((cell, col) => {
        cell.font = BOLD_FONT;
        cell.border = BORDER;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
        if (col >= 5 && col <= 8) cell.alignment = { horizontal: "right" };
      });
    }
  }

  // ── Download ──────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Finishing_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

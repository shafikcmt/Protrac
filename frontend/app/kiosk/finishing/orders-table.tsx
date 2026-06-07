"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { useReactToPrint } from "react-to-print";
import { parseISO, format } from "date-fns";
import { Search, ChevronDown, FileSpreadsheet, Printer, X, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FinishingPrintableReport } from "@/components/kiosk/finishing-printable-report";
import { generateFinishingExcel } from "@/lib/reports/finishing-report";
import { ReportOptionsDialog } from "./report-options-dialog";
import {
  OrderGroup,
  StatusKind,
  getStatus,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_BORDER_CLASS,
  STATUS_DATE_CLASS,
  ALL_STATUSES,
} from "./finishing-types";

interface SummaryStats {
  totalLines: number;
  totalOrders: number;
  totalFifoViolations: number;
  avgCompletionRate: number;
  totalInput: number;
  totalOutput: number;
  totalWip: number;
}

interface OrdersTableProps {
  groups: OrderGroup[];
  isLoading: boolean;
  summaryStats: SummaryStats;
  qcPassRate: number | null;
}

export function OrdersTable({ groups, isLoading, summaryStats, qcPassRate }: OrdersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKind | "all">("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);

  // Print state
  const printRef = useRef<HTMLDivElement>(null);
  const [printScope, setPrintScope] = useState<"all" | "selected">("all");
  const [printStatusFilter, setPrintStatusFilter] = useState<StatusKind | "all">("all");
  const [shouldPrint, setShouldPrint] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Finishing Production Report",
  });

  const handlePrintRef = useRef(handlePrint);
  handlePrintRef.current = handlePrint;

  useEffect(() => {
    if (!shouldPrint) return;
    setShouldPrint(false);
    handlePrintRef.current();
  }, [shouldPrint]);

  // Groups shown in the printable report — recomputed when scope/filter changes
  const printGroups = useMemo(() => {
    if (printScope === "selected")
      return groups.filter((g) => selectedKeys.has(g.order_number));
    if (printStatusFilter === "all") return groups;
    return groups.filter((g) => getStatus(g) === printStatusFilter);
  }, [groups, printScope, printStatusFilter, selectedKeys]);

  // Groups shown in the table
  const filtered = useMemo(() => {
    let rows = groups;
    if (statusFilter !== "all") {
      rows = rows.filter((g) => getStatus(g) === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (g) =>
          g.order_number.toLowerCase().includes(q) ||
          g.style_name.toLowerCase().includes(q) ||
          g.customer_name.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [groups, search, statusFilter]);

  const toggleSelect = (orderNumber: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) next.delete(orderNumber);
      else next.add(orderNumber);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filtered.length > 0 && selectedKeys.size === filtered.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filtered.map((g) => g.order_number)));
    }
  };

  const allSelected = filtered.length > 0 && selectedKeys.size === filtered.length;
  const someSelected = selectedKeys.size > 0 && !allSelected;

  const handlePrintFromDialog = (
    scope: "all" | "selected",
    statusFlt: StatusKind | "all"
  ) => {
    setPrintScope(scope);
    setPrintStatusFilter(statusFlt);
    setShouldPrint(true);
  };

  const handleBulkExcel = () => {
    const sel = groups.filter((g) => selectedKeys.has(g.order_number));
    const selStats: SummaryStats = {
      ...summaryStats,
      totalOrders: sel.length,
      totalInput: sel.reduce((s, g) => s + g.total_input, 0),
      totalOutput: sel.reduce((s, g) => s + g.total_output, 0),
      totalWip: sel.reduce((s, g) => s + g.total_wip, 0),
      avgCompletionRate:
        sel.length > 0
          ? sel.reduce((s, g) => s + g.completion_rate, 0) / sel.length
          : 0,
    };
    generateFinishingExcel(sel, selStats, qcPassRate);
  };

  const handleBulkPrint = () => {
    setPrintScope("selected");
    setShouldPrint(true);
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Finishing Report
            </h2>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 pl-6">
            {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, style…"
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg w-52
                border border-gray-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusKind | "all")}
            className="px-3 py-1.5 text-sm rounded-lg
              border border-gray-200 dark:border-slate-700
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <Button
            onClick={() => setReportOpen(true)}
            className="gap-1.5"
            size="sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          {summaryStats.totalOrders} Orders
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Input: {summaryStats.totalInput.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Output: {summaryStats.totalOutput.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          WIP: {summaryStats.totalWip.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Completion: {(summaryStats.avgCompletionRate * 100).toFixed(1)}%
        </span>
      </div>

      {/* ── Accordion list ────────────────────────────────────────── */}
      {isLoading && groups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
            Loading…
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 dark:text-slate-500">
            <div className="text-xl font-bold mb-1">No orders match</div>
            <div className="text-sm">Adjust your search or filter</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {/* Column headers */}
          <div className="flex items-center shrink-0 px-0 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
            <div className="w-12 flex items-center justify-center">
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <span className="w-28 shrink-0">Order No</span>
            <span className="flex-1 min-w-0">Style</span>
            <span className="w-28 shrink-0 hidden md:block">Delivery</span>
            <span className="w-24 shrink-0">Status</span>
            <span className="w-16 shrink-0 text-right">Input</span>
            <span className="w-16 shrink-0 text-right">Output</span>
            <span className="w-16 shrink-0 text-right text-amber-500">WIP</span>
            <span className="w-16 shrink-0 text-right text-green-600">Done%</span>
            <span className="w-8 shrink-0" />
          </div>

          {/* Scrollable rows */}
          <div className="flex-1 overflow-y-auto">
            <AccordionPrimitive.Root type="multiple">
              {filtered.map((order) => {
                const status = getStatus(order);
                const ratePct = (order.completion_rate * 100).toFixed(1);
                const formattedDate = order.delivery_date
                  ? format(parseISO(order.delivery_date), "MMM d, yyyy")
                  : null;
                const isSelected = selectedKeys.has(order.order_number);

                return (
                  <AccordionPrimitive.Item
                    key={order.order_number}
                    value={order.order_number}
                    className={cn(
                      "border-b border-gray-100 dark:border-slate-800 last:border-b-0",
                      isSelected && "bg-blue-50/60 dark:bg-blue-950/30"
                    )}
                  >
                    <AccordionPrimitive.Header asChild>
                      <div
                        className={cn(
                          "flex items-stretch border-l-[3px] transition-colors",
                          "hover:bg-gray-50 dark:hover:bg-slate-800/50",
                          STATUS_BORDER_CLASS[status]
                        )}
                      >
                        {/* Checkbox — outside the trigger button */}
                        <div
                          className="w-12 flex items-center justify-center shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(order.order_number);
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(order.order_number)}
                            className="pointer-events-none"
                          />
                        </div>

                        {/* Trigger — its own button, separate from checkbox */}
                        <AccordionPrimitive.Trigger
                          className="flex flex-1 items-center py-3 pr-3 text-left gap-0
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                            [&[data-state=open]>svg:last-child]:rotate-180"
                        >
                          <span className="w-28 shrink-0 font-black text-sm text-gray-900 dark:text-white truncate">
                            {order.order_number}
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-gray-600 dark:text-slate-300 truncate pr-4">
                            {order.style_name}
                          </span>
                          <span
                            className={cn(
                              "w-28 shrink-0 text-xs font-medium hidden md:block",
                              STATUS_DATE_CLASS[status]
                            )}
                          >
                            {formattedDate ?? "No date"}
                          </span>
                          <span className="w-24 shrink-0">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap",
                                STATUS_BADGE_CLASS[status]
                              )}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </span>
                          <span className="w-16 shrink-0 text-right tabular-nums text-sm text-gray-700 dark:text-slate-200">
                            {order.total_input.toLocaleString()}
                          </span>
                          <span className="w-16 shrink-0 text-right tabular-nums text-sm text-gray-700 dark:text-slate-200">
                            {order.total_output.toLocaleString()}
                          </span>
                          <span className="w-16 shrink-0 text-right tabular-nums text-sm font-bold text-amber-500 dark:text-amber-400">
                            {order.total_wip.toLocaleString()}
                          </span>
                          <span className="w-16 shrink-0 text-right tabular-nums text-sm font-bold text-green-600 dark:text-green-400">
                            {ratePct}%
                          </span>
                          <ChevronDown className="w-4 h-4 shrink-0 ml-2 mr-1 transition-transform duration-200 text-muted-foreground" />
                        </AccordionPrimitive.Trigger>
                      </div>
                    </AccordionPrimitive.Header>

                    <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="pl-12 pr-4 pb-3 pt-1">
                        {/* Size breakdown table */}
                        <div className="rounded-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-slate-800 text-[11px] uppercase tracking-wide font-semibold text-gray-400 dark:text-slate-500">
                                <th className="px-3 py-1.5 text-left">Size</th>
                                <th className="px-3 py-1.5 text-right">Input</th>
                                <th className="px-3 py-1.5 text-right">Output</th>
                                <th className="px-3 py-1.5 text-right">WIP</th>
                                <th className="px-3 py-1.5 text-right">Done%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.sizes.map((s, i) => (
                                <tr
                                  key={i}
                                  className="border-t border-gray-100 dark:border-slate-700"
                                >
                                  <td className="px-3 py-1.5 font-semibold text-gray-900 dark:text-white">
                                    {s.size_name}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-slate-200">
                                    {s.input.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-700 dark:text-slate-200">
                                    {s.output.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums font-bold text-amber-500 dark:text-amber-400">
                                    {s.wip.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums font-bold text-green-600 dark:text-green-400">
                                    {s.rate.toFixed(0)}%
                                  </td>
                                </tr>
                              ))}
                              {order.sizes.length > 1 && (
                                <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 font-black">
                                  <td className="px-3 py-1.5 text-gray-900 dark:text-white">
                                    Total
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                                    {order.total_input.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                                    {order.total_output.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-amber-500 dark:text-amber-400">
                                    {order.total_wip.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-green-600 dark:text-green-400">
                                    {ratePct}%
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </AccordionPrimitive.Content>
                  </AccordionPrimitive.Item>
                );
              })}
            </AccordionPrimitive.Root>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ───────────────────────────────────────── */}
      {selectedKeys.size > 0 && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {selectedKeys.size} order{selectedKeys.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={handleBulkPrint}
            >
              <Printer className="h-3.5 w-3.5" />
              Print PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={handleBulkExcel}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedKeys(new Set())}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Report dialog ─────────────────────────────────────────── */}
      <ReportOptionsDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        groups={groups}
        selectedKeys={selectedKeys}
        summaryStats={{
          totalInput: summaryStats.totalInput,
          totalOutput: summaryStats.totalOutput,
          totalWip: summaryStats.totalWip,
          avgCompletionRate: summaryStats.avgCompletionRate,
          totalOrders: summaryStats.totalOrders,
        }}
        qcPassRate={qcPassRate}
        onPrint={handlePrintFromDialog}
      />

      {/* ── Hidden printable report (mounted at all times for react-to-print) ── */}
      <FinishingPrintableReport
        ref={printRef}
        groups={printGroups}
        summaryStats={{
          totalInput: summaryStats.totalInput,
          totalOutput: summaryStats.totalOutput,
          totalWip: summaryStats.totalWip,
          avgCompletionRate: summaryStats.avgCompletionRate,
          totalOrders: summaryStats.totalOrders,
        }}
        qcPassRate={qcPassRate}
      />
    </div>
  );
}

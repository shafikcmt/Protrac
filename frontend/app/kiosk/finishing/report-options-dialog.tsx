"use client";

import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  OrderGroup,
  StatusKind,
  getStatus,
  STATUS_LABEL,
  ALL_STATUSES,
} from "./finishing-types";
import { generateFinishingExcel } from "@/lib/reports/finishing-report";

interface SummaryStats {
  totalInput: number;
  totalOutput: number;
  totalWip: number;
  avgCompletionRate: number;
  totalOrders: number;
}

interface ReportOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  groups: OrderGroup[];
  selectedKeys: Set<string>;
  summaryStats: SummaryStats;
  qcPassRate: number | null;
  onPrint: (scope: "all" | "selected", statusFilter: StatusKind | "all") => void;
}

export function ReportOptionsDialog({
  open,
  onClose,
  groups,
  selectedKeys,
  summaryStats,
  qcPassRate,
  onPrint,
}: ReportOptionsDialogProps) {
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [statusFilter, setStatusFilter] = useState<StatusKind | "all">("all");
  const [isExporting, setIsExporting] = useState(false);

  const resolvedGroups =
    scope === "selected"
      ? groups.filter((g) => selectedKeys.has(g.order_number))
      : statusFilter === "all"
      ? groups
      : groups.filter((g) => getStatus(g) === statusFilter);

  const handleExcel = async () => {
    setIsExporting(true);
    try {
      await generateFinishingExcel(resolvedGroups, summaryStats, qcPassRate);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handlePdf = () => {
    onPrint(scope, statusFilter);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Scope */}
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-slate-300">
              Report Scope
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setScope("all")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                  scope === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                All Orders ({groups.length})
              </button>
              <button
                onClick={() => selectedKeys.size > 0 && setScope("selected")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                  scope === "selected"
                    ? "bg-blue-600 text-white border-blue-600"
                    : selectedKeys.size === 0
                    ? "border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                    : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                Selected Only ({selectedKeys.size})
              </button>
            </div>
          </div>

          {/* Status filter — only when scope=all */}
          {scope === "all" && (
            <div>
              <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-slate-300">
                Filter by Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                    statusFilter === "all"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  All ({groups.length})
                </button>
                {ALL_STATUSES.map((s) => {
                  const count = groups.filter((g) => getStatus(g) === s).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                        statusFilter === s
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {STATUS_LABEL[s]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview count */}
          <p className="text-xs text-muted-foreground">
            Report will include{" "}
            <span className="font-bold">{resolvedGroups.length}</span> order
            {resolvedGroups.length !== 1 ? "s" : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePdf} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print PDF
          </Button>
          <Button onClick={handleExcel} disabled={isExporting} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

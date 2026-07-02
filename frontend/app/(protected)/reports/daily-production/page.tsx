"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Undo2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader, AppContent, type BreadcrumbItem } from "@/components/app/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductionReportFilters } from "./production-report-filters";
import { ProductionReportTable } from "./production-report-table";
import { useDailyProductionReport, useLineStyleCompletions, undoStyleComplete, type LineStyleCompletionRecord } from "@/hooks/api";
import { cn } from "@/lib/utils";

interface FiltersState {
  buyer_id?: number;
  buyer_ids?: number[];
  colors?: string[];
  date_from?: string;
  date_to?: string;
  order_id?: number;
  order_ids?: number[];
  production_line_id?: number;
  production_line_ids?: number[];
  report_date?: string;
  sizes?: string[];
  style_id?: number;
  style_ids?: number[];
}

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function DailyProductionPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Reports", url: "/reports" },
    { title: "Daily Production Report" },
  ];

  const [filters, setFilters] = useState<FiltersState>({
    report_date: formatLocalDate(new Date()),
  });

  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showUndoPanel, setShowUndoPanel] = useState(false);
  const [undoTarget, setUndoTarget] = useState<LineStyleCompletionRecord | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const handleFiltersChange = (newFilters: FiltersState) => {
    setFilters((prev) => {
      const merged = { ...prev, ...newFilters };

      if (merged.production_line_id) merged.production_line_ids = undefined;
      if (merged.production_line_ids?.length) merged.production_line_id = undefined;

      if (merged.buyer_id) merged.buyer_ids = undefined;
      if (merged.buyer_ids?.length) merged.buyer_id = undefined;

      if (merged.style_id) merged.style_ids = undefined;
      if (merged.style_ids?.length) merged.style_id = undefined;

      if (merged.order_id) merged.order_ids = undefined;
      if (merged.order_ids?.length) merged.order_id = undefined;

      return merged;
    });
  };

  const { reportData, isLoading, error, isRefetching, refetch } = useDailyProductionReport({
    buyer_id: filters.buyer_id,
    buyer_ids: filters.buyer_ids,
    colors: filters.colors,
    date_from: filters.date_from,
    date_to: filters.date_to,
    order_id: filters.order_id,
    order_ids: filters.order_ids,
    production_line_id: filters.production_line_id,
    production_line_ids: filters.production_line_ids,
    report_date: filters.report_date,
    sizes: filters.sizes,
    style_id: filters.style_id,
    style_ids: filters.style_ids,
    include_hidden: showHidden,
  });

  const completionsQuery = useLineStyleCompletions();
  const completions: LineStyleCompletionRecord[] = completionsQuery.data ?? [];

  const handleUndo = async () => {
    if (!undoTarget) return;
    setIsUndoing(true);
    try {
      await undoStyleComplete(undoTarget.id);
      toast.success("Style completion undone");
      completionsQuery.refetch?.();
      refetch();
    } catch (e: any) {
      toast.error(`Undo failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsUndoing(false);
      setUndoTarget(null);
    }
  };

  useEffect(() => {
    if (isRefetching) setShowRefreshIndicator(true);
    else if (showRefreshIndicator) {
      const timer = setTimeout(() => setShowRefreshIndicator(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isRefetching, showRefreshIndicator]);

  const handleRefresh = () => refetch();

  const handleExport = () => {
    if (!reportData?.production_lines?.length) return;

    const safe = (v: any) => (v === null || v === undefined ? "" : String(v));

    const headers = [
      "Line",
      "Buyer",
      "Style",
      "Order Qty",
      "W Days",
      "Hrs",
      "Input",
      "Front Day",
      "Front Cumm",
      "Back Day",
      "Back Cumm",
      "Sleeve Day",
      "Sleeve Cumm",
      "Hood/Collar Day",
      "Hood/Collar Cumm",
      "Lining Day",
      "Lining Cumm",
      "Assembly Input Day",
      "Assembly Input Cumm",
      "Output Day",
      "Output Cumm",
      "DHU Day %",
      "DHU Avg %",
      "Inspection Day",
      "Inspection Cumm",
      "Packed Day",
      "Packed Cumm",
    ];

    const rows: string[][] = [];
    reportData.production_lines.forEach((pl: any) => {
      (pl.orders || []).forEach((o: any) => {
        const hoodDay = (o.hood?.day || 0) + (o.collar?.day || 0);
        const hoodCumm = (o.hood?.cumulative || 0) + (o.collar?.cumulative || 0);

        rows.push([
          safe(o.line),
          safe(o.buyer),
          safe(o.style),
          safe(o.order_quantity || 0),
          safe(o.working_days || 0),
          safe(o.working_hours?.toFixed?.(2) ?? o.working_hours ?? 0),
          safe(o.input || 0),
          safe(o.front?.day || 0),
          safe(o.front?.cumulative || 0),
          safe(o.back?.day || 0),
          safe(o.back?.cumulative || 0),
          safe(o.sleeve?.day || 0),
          safe(o.sleeve?.cumulative || 0),
          safe(hoodDay),
          safe(hoodCumm),
          safe(o.lining?.day || 0),
          safe(o.lining?.cumulative || 0),
          safe(o.assembly_input?.day || 0),
          safe(o.assembly_input?.cumulative || 0),
          safe(o.output?.day || 0),
          safe(o.output?.cumulative || 0),
          safe(o.dhu_day ?? 0),
          safe(o.dhu_average ?? 0),
          safe(o.inspection?.day || 0),
          safe(o.inspection?.cumulative || 0),
          safe(o.packed?.day || 0),
          safe(o.packed?.cumulative || 0),
        ]);
      });
    });

    const escapeCSV = (value: string) => {
      const needsQuotes = /[",\n]/.test(value);
      const v = value.replace(/"/g, '""');
      return needsQuotes ? `"${v}"` : v;
    };

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => escapeCSV(safe(c))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const d = reportData.report_date || filters.report_date || "report";
    a.download = `daily-production-${d}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <AppContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading report data</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </AppContent>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Daily Production Report</h1>
              <p className="text-muted-foreground">
                Comprehensive daily production efficiency report for all production lines
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showHidden ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowHidden((v) => !v)}
                className="gap-2"
                title="Show or hide manually-completed (hidden) line/style rows"
              >
                {showHidden ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {showHidden ? "Showing Hidden" : "Show Hidden"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefetching}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", (isLoading || isRefetching) && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isLoading || !reportData}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <ProductionReportFilters filters={filters} onFiltersChange={handleFiltersChange} />

          <ProductionReportTable reportData={reportData} isLoading={isLoading} refetch={refetch} />

          {completions.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer select-none py-3"
                onClick={() => setShowUndoPanel((p) => !p)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Manually Completed Styles
                    <Badge variant="secondary">{completions.length}</Badge>
                  </CardTitle>
                  {showUndoPanel ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              {showUndoPanel && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Line</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Style</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Completed By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{c.production_line_name}</TableCell>
                          <TableCell className="text-sm">{c.order_detail.buyer ?? "-"}</TableCell>
                          <TableCell className="text-sm">{c.order_detail.style ?? "-"}</TableCell>
                          <TableCell className="text-sm">{c.order_detail.size ?? "-"}</TableCell>
                          <TableCell className="text-sm">{c.order_detail.color ?? "-"}</TableCell>
                          <TableCell className="text-sm">{c.completed_by_name ?? "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => setUndoTarget(c)}
                            >
                              <Undo2 className="h-3 w-3" />
                              Undo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}

          {showRefreshIndicator && (
            <div className="fixed bottom-4 right-4 z-50">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </AppContent>

      <AlertDialog
        open={!!undoTarget}
        onOpenChange={(open) => {
          if (!open) setUndoTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Style Completion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore{" "}
              <strong>{undoTarget?.order_detail.style}</strong> on{" "}
              <strong>{undoTarget?.production_line_name}</strong> and show it
              again in today&apos;s report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUndoing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndo} disabled={isUndoing}>
              {isUndoing ? "Undoing…" : "Undo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
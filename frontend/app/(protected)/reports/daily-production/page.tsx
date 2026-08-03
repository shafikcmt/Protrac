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
import {
  generateDailyProductionExcel,
  generateDailyProductionPDF,
} from "@/lib/reports/daily-production-report";
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
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  // A completion only hides a style from the day AFTER it was recorded — the
  // backend counts completions created strictly before the report date
  // (line_visibility.get_completed_order_ids), so the day it was made still
  // reports the real scan data. Without this indicator a row recorded today
  // looks identical to one from last week while behaving completely differently.
  const isInForce = (createdAt: string) => {
    const recorded = new Date(createdAt);
    recorded.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recorded < today;
  };

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

  const handleExport = async () => {
    if (!reportData?.production_lines?.length) return;
    setIsExporting(true);
    try {
      await generateDailyProductionExcel(reportData, filters);
    } catch (e: any) {
      toast.error(`Export failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportData?.production_lines?.length) return;
    setIsExportingPdf(true);
    try {
      await generateDailyProductionPDF(reportData, filters);
    } catch (e: any) {
      toast.error(`PDF export failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsExportingPdf(false);
    }
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
                disabled={isLoading || !reportData || isExporting}
                className="gap-2"
              >
                <Download className={cn("h-4 w-4", isExporting && "animate-pulse")} />
                {isExporting ? "Exporting…" : "Export Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isLoading || !reportData || isExportingPdf}
                className="gap-2"
              >
                <Download className={cn("h-4 w-4", isExportingPdf && "animate-pulse")} />
                {isExportingPdf ? "Exporting…" : "Export PDF"}
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
                        <TableHead>Status</TableHead>
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
                            {isInForce(c.created_at) ? (
                              <Badge variant="secondary" className="text-xs">
                                Hidden
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs text-amber-600 border-amber-500/40 dark:text-amber-400"
                              >
                                Hides tomorrow
                              </Badge>
                            )}
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
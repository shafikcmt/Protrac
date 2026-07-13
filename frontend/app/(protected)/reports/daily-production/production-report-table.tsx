"use client";

import { Fragment, useState } from "react";
import {
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useMarkStyleComplete,
  useUndoStyleComplete,
} from "@/hooks/api/use-line-style-completion";

interface ProductionReportTableProps {
  reportData: any;
  isLoading: boolean;
  refetch?: () => void;
}

interface PendingCompletion {
  lineName: string;
  styleName: string;
  items: Array<{ order_id: number; production_line_id: number; size: string; color: string }>;
}

interface PendingUnhide {
  lineName: string;
  styleName: string;
  completionIds: number[];
}

type Metric = { day: number; cumulative: number };

export function ProductionReportTable({
  reportData,
  isLoading,
  refetch,
}: ProductionReportTableProps) {
  const [pendingCompletion, setPendingCompletion] = useState<PendingCompletion | null>(null);
  const [pendingUnhide, setPendingUnhide] = useState<PendingUnhide | null>(null);
  const markComplete = useMarkStyleComplete();
  const undoComplete = useUndoStyleComplete();
  const isCompleting = markComplete.isPending;
  const isUnhiding = undoComplete.isPending;

  const handleMarkComplete = async () => {
    if (!pendingCompletion) return;
    try {
      for (const item of pendingCompletion.items) {
        await markComplete.mutateAsync({
          production_line: item.production_line_id,
          order: item.order_id,
        });
      }
      toast.success(
        `${pendingCompletion.styleName} on ${pendingCompletion.lineName} marked complete`
      );
      refetch?.();
    } catch (e: any) {
      toast.error(`Failed to hide: ${e?.message ?? "Unknown error"}`);
    } finally {
      setPendingCompletion(null);
    }
  };

  const handleUnhide = async () => {
    if (!pendingUnhide) return;
    try {
      for (const id of pendingUnhide.completionIds) {
        await undoComplete.mutateAsync(id);
      }
      toast.success(
        `${pendingUnhide.styleName} on ${pendingUnhide.lineName} marked active`
      );
      refetch?.();
    } catch (e: any) {
      toast.error(`Failed to unhide: ${e?.message ?? "Unknown error"}`);
    } finally {
      setPendingUnhide(null);
    }
  };
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground">Loading report data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reportData?.production_lines?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground">No production data found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Visible (active) groups drive the numbers shown and the buyer subtotals —
  // they must exclude hidden rows so the table matches the backend summary.
  const ordersByBuyer: Record<string, any[]> = {};
  // Hidden (manually-completed) groups are only present when include_hidden was
  // requested; they are rendered greyed-out with an "Unhide" action and never
  // contribute to any subtotal.
  const hiddenByBuyer: Record<string, any[]> = {};

  const ensureMetric = (obj: any, key: string) => {
    if (!obj[key]) obj[key] = { day: 0, cumulative: 0 } satisfies Metric;
  };

  reportData.production_lines.forEach((line: any) => {
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
          __completionIds: [] as number[],
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
          needs_manual_complete: false,
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
      if (isHidden && order.completion_id != null) {
        acc.__completionIds.push(order.completion_id);
      }
      acc.order_quantity += Number(order.order_quantity || 0);
      acc.input += Number(order.input || 0);
      if (order.needs_manual_complete) acc.needs_manual_complete = true;
      if (order.is_pending_transition) {
        acc.is_pending_transition = true;
        acc.pending_quantity += Number(order.pending_quantity || 0);
        if (order.remarks && !acc.remarks) acc.remarks = order.remarks;
      }

      const addMetric = (keyName: string) => {
        ensureMetric(acc, keyName);
        const src = order[keyName] || {};
        acc[keyName].day += Number(src.day || 0);
        acc[keyName].cumulative += Number(src.cumulative || 0);
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

      const outDay = Number(order.output?.day || 0);
      const outCum = Number(order.output?.cumulative || 0);
      const dhuDay = Number(order.dhu_day || 0);
      const dhuAvg = Number(order.dhu_average || 0);

      if (outDay > 0) {
        acc.__dhuDayNum += dhuDay * outDay;
        acc.__dhuDayDen += outDay;
      }
      if (outCum > 0) {
        acc.__dhuAvgNum += dhuAvg * outCum;
        acc.__dhuAvgDen += outCum;
      }

      acc.dhu_day = acc.__dhuDayDen > 0 ? acc.__dhuDayNum / acc.__dhuDayDen : 0;
      acc.dhu_average =
        acc.__dhuAvgDen > 0 ? acc.__dhuAvgNum / acc.__dhuAvgDen : 0;
    });
  });

  // Combined render list per buyer: visible groups first, then hidden ones
  // (greyed). Buyer subtotals below still use the visible groups only.
  const displayByBuyer: Record<string, any[]> = {};
  const allBuyers = Array.from(
    new Set([...Object.keys(ordersByBuyer), ...Object.keys(hiddenByBuyer)])
  );
  allBuyers.forEach((b) => {
    displayByBuyer[b] = [
      ...(ordersByBuyer[b] || []),
      ...(hiddenByBuyer[b] || []),
    ];
  });

  const formatNumber = (num: number) => (Number(num) || 0).toLocaleString();
  const formatPercentage = (num: number) => `${(Number(num) || 0).toFixed(2)}%`;
  const getSizeValue = (item: any) => item?.size || "-";
  const getColorValue = (item: any) => item?.color || "-";

  return (
    <>
    <Card className="print:border-0 print:shadow-none">
      <CardHeader className="py-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {reportData.report_title || "DAILY PRODUCTION REPORT"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {reportData.company_name || "HUMANA APPARELS PVT. LTD"}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {reportData.report_date}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="w-full overflow-hidden print:overflow-visible">
          <Table className="[&_th]:px-1 [&_td]:px-1 [&_th]:text-[11px] [&_td]:text-[11px] print:[&_th]:text-[8px] print:[&_td]:text-[8px] print:[&_th]:px-0.5 print:[&_td]:px-0.5">
            <TableHeader>
              <TableRow>
                <TableHead>LINE</TableHead>
                <TableHead>BUYER</TableHead>
                <TableHead>STYLE</TableHead>
                <TableHead className="text-right">Order Qty</TableHead>
                <TableHead className="text-right">W Days</TableHead>
                <TableHead className="text-right">Hrs</TableHead>
                <TableHead className="text-right">Input</TableHead>

                <TableHead className="text-center" colSpan={2}>
                  Front
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Back
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Sleeve
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Hood/Collar
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Lining
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Assembly Input
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Output
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Efficiency %
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  DHU %
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Inspection
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Packed
                </TableHead>

                <TableHead>REMARKS</TableHead>
              </TableRow>

              <TableRow>
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />

                {/* Front */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Back */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Sleeve */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Hood/Collar */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Lining */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Assembly Input */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Output */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                {/* Efficiency % */}
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Avg</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Avg</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.entries(displayByBuyer).map(([buyer, orders]) => (
                <Fragment key={buyer}>
                  {orders.map((order, index) => {
                    const hasDetails = (order.__items?.length || 0) > 1;

                    return (
                      <Fragment key={`${buyer}-${order.__key}-${index}`}>
                        <TableRow
                          className={
                            order.is_hidden
                              ? "bg-muted/40 text-muted-foreground opacity-70"
                              : order.is_pending_transition
                              ? "bg-amber-50 dark:bg-amber-950/30"
                              : undefined
                          }
                        >
                          <TableCell className="font-medium">
                            {hasDetails ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="text-blue-600 underline font-bold">
                                    {order.line} ({order.__items.length})
                                  </button>
                                </DialogTrigger>

                               <DialogContent className="w-[1200px] max-w-[98vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-5">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {order.line} - {order.buyer} - {order.style}
                                    </DialogTitle>
                                  </DialogHeader>

                                  <div className="rounded-lg border border-border bg-card/40 p-3">
                                  <div className="text-sm font-extrabold mb-3">
                                    Details rows ({order.__items.length})
                                  </div>

  <div className="space-y-3">
    {order.__items.map((it: any, idx: number) => (
      <div
        key={idx}
        className="rounded-md border border-border/60 bg-background/70 p-3"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground font-medium">Order Qty</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.order_quantity || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Size</p>
            <p className="font-semibold">{getSizeValue(it)}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Color</p>
            <p className="font-semibold">{getColorValue(it)}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Front(C)</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.front?.cumulative || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Back(C)</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.back?.cumulative || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Assembly(C)</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.assembly_input?.cumulative || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Output(D)</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.output?.day || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Output(C)</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.output?.cumulative || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">DHU%</p>
            <p className="font-semibold tabular-nums">
              {formatPercentage(it.dhu_day || 0)}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Packed(C)</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(it.packed?.cumulative || 0)}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              order.line
                            )}
                          </TableCell>

                          <TableCell>{order.buyer}</TableCell>
                          <TableCell>{order.style}</TableCell>

                          <TableCell className="text-right">
                            {formatNumber(order.order_quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.working_days}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.working_hours == null
                              ? "-"
                              : Number(order.working_hours).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(order.input)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.front?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.front?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.back?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.back?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.sleeve?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.sleeve?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(
                              (order.hood?.day || 0) + (order.collar?.day || 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(
                              (order.hood?.cumulative || 0) +
                                (order.collar?.cumulative || 0)
                            )}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.lining?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.lining?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.assembly_input?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.assembly_input?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.output?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.output?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatPercentage(
                              Number(order.input) > 0
                                ? (Number(order.output?.day || 0) /
                                    Number(order.input)) *
                                    100
                                : 0
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatPercentage(
                              Number(order.input) > 0
                                ? (Number(order.output?.cumulative || 0) /
                                    Number(order.input)) *
                                    100
                                : 0
                            )}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatPercentage(order.dhu_day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatPercentage(order.dhu_average || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.inspection?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.inspection?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-right text-xs">
                            {formatNumber(order.packed?.day || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatNumber(order.packed?.cumulative || 0)}
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              {order.is_pending_transition && !order.is_hidden && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="mb-1 inline-flex w-fit cursor-default items-center text-amber-600 dark:text-amber-400">
                                      <AlertTriangle className="h-4 w-4 shrink-0" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[260px]">
                                    <div className="font-medium">
                                      Pending {formatNumber(order.pending_quantity || 0)} pcs
                                    </div>
                                    <div className="text-muted-foreground">
                                      {order.remarks
                                        ? order.remarks.replace(/\s*\|\s*/g, " · ")
                                        : "New style started on this line · Manual completion required"}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {order.is_hidden ? (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="border-muted-foreground/40 text-[10px] font-medium uppercase"
                                  >
                                    Hidden
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 px-2 text-xs"
                                    disabled={isUnhiding}
                                    onClick={() =>
                                      setPendingUnhide({
                                        lineName: order.line,
                                        styleName: order.style,
                                        completionIds: (order.__completionIds || []).filter(
                                          (id: number | null | undefined) => id != null
                                        ),
                                      })
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                    Mark as Active
                                  </Button>
                                </div>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setPendingCompletion({
                                          lineName: order.line,
                                          styleName: order.style,
                                          items: (order.__items || []).map((it: any) => ({
                                            order_id: it.order_id,
                                            production_line_id: it.production_line_id,
                                            size: it.size ?? "",
                                            color: it.color ?? "",
                                          })),
                                        })
                                      }
                                    >
                                      <EyeOff className="mr-2 h-4 w-4" />
                                      Mark Complete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}

                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={3}>
                      <Badge variant="secondary">{buyer} Total</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {formatNumber(
                        orders
                          .filter((o) => !o.is_hidden)
                          .reduce((sum, o) => sum + Number(o.order_quantity || 0), 0)
                      )}
                    </TableCell>

                    <TableCell colSpan={2} />

                    <TableCell className="text-right">
                      {formatNumber(
                        orders
                          .filter((o) => !o.is_hidden)
                          .reduce((sum, o) => sum + Number(o.input || 0), 0)
                      )}
                    </TableCell>

                    <TableCell colSpan={12} />

                    <TableCell className="text-right text-xs">
                      {formatNumber(
                        orders
                          .filter((o) => !o.is_hidden)
                          .reduce((sum, o) => sum + Number(o.output?.day || 0), 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(
                        orders
                          .filter((o) => !o.is_hidden)
                          .reduce((sum, o) => sum + Number(o.output?.cumulative || 0), 0)
                      )}
                    </TableCell>

                    <TableCell colSpan={2} />

                    <TableCell colSpan={7} />
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {reportData.summary && (
          <>
            <Separator className="my-2" />
            <div className="px-4 pb-3 pt-1">
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Total Lines</p>
                  <p className="text-lg font-bold">
                    {reportData.summary.total_production_lines}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-lg font-bold">
                    {reportData.summary.total_orders}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Order Qty</p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.total_order_quantity)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Total Input</p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_input)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Daily Output</p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_output)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Daily Inspection</p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_inspection)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Daily Packed</p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_packed)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">Efficiency</p>
                  <p className="text-lg font-bold">
                    {formatPercentage(reportData.summary.overall_efficiency)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    <AlertDialog
      open={!!pendingCompletion}
      onOpenChange={(open) => {
        if (!open) setPendingCompletion(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this line / style as complete?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>
                This will mark{" "}
                <strong>{pendingCompletion?.styleName}</strong> on{" "}
                <strong>{pendingCompletion?.lineName}</strong> as complete. It
                will be excluded from Daily Report, Assembly Tracking, and
                Sewing Dashboard totals, but will remain visible on Heatmap and
                Finishing Dashboard until its delivery date passes. This can be
                undone anytime.
              </p>
              {(pendingCompletion?.items?.length ?? 0) > 1 && (
                <ul className="mt-2 list-disc pl-4 text-sm space-y-1">
                  {pendingCompletion?.items.map((it, i) => (
                    <li key={i}>
                      {it.size} / {it.color}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleMarkComplete} disabled={isCompleting}>
            {isCompleting ? "Marking…" : "Mark Complete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={!!pendingUnhide}
      onOpenChange={(open) => {
        if (!open) setPendingUnhide(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this line / style as active?</AlertDialogTitle>
          <AlertDialogDescription>
            This will bring{" "}
            <strong>{pendingUnhide?.styleName}</strong> on{" "}
            <strong>{pendingUnhide?.lineName}</strong> back into Daily Report,
            Assembly Tracking, and Sewing Dashboard totals.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUnhiding}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUnhide} disabled={isUnhiding}>
            {isUnhiding ? "Updating…" : "Mark as Active"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
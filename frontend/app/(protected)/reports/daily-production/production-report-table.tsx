"use client";

import { Fragment, useState } from "react";
import { MoreHorizontal, CheckCircle2 } from "lucide-react";
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
import { markStyleComplete } from "@/hooks/api/use-line-style-completion";

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

type Metric = { day: number; cumulative: number };

export function ProductionReportTable({
  reportData,
  isLoading,
  refetch,
}: ProductionReportTableProps) {
  const [pendingCompletion, setPendingCompletion] = useState<PendingCompletion | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleMarkComplete = async () => {
    if (!pendingCompletion) return;
    setIsCompleting(true);
    try {
      for (const item of pendingCompletion.items) {
        await markStyleComplete(item.production_line_id, item.order_id);
      }
      toast.success(
        `${pendingCompletion.styleName} on ${pendingCompletion.lineName} marked as complete`
      );
      refetch?.();
    } catch (e: any) {
      toast.error(`Failed to mark complete: ${e?.message ?? "Unknown error"}`);
    } finally {
      setIsCompleting(false);
      setPendingCompletion(null);
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

  const ordersByBuyer: Record<string, any[]> = {};

  const ensureMetric = (obj: any, key: string) => {
    if (!obj[key]) obj[key] = { day: 0, cumulative: 0 } satisfies Metric;
  };

  reportData.production_lines.forEach((line: any) => {
    (line.orders || []).forEach((order: any) => {
      const buyer = order.buyer || "UNKNOWN";
      const style = order.style || "UNKNOWN";
      const lineName = order.line || line?.production_line_name || "UNKNOWN";

      if (!ordersByBuyer[buyer]) ordersByBuyer[buyer] = [];

      const key = `${lineName}||${style}`;
      let acc = ordersByBuyer[buyer]!.find((x) => x.__key === key);

      if (!acc) {
        acc = {
          __key: key,
          __items: [],
          line: lineName,
          buyer,
          style,
          order_quantity: 0,
          input: 0,
          working_days: order.working_days ?? 1,
          working_hours: order.working_hours ?? 8,
          front: { day: 0, cumulative: 0 },
          back: { day: 0, cumulative: 0 },
          sleeve: { day: 0, cumulative: 0 },
          hood: { day: 0, cumulative: 0 },
          collar: { day: 0, cumulative: 0 },
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

        ordersByBuyer[buyer]!.push(acc);
      }

      acc.__items.push(order);
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

  const formatNumber = (num: number) => (Number(num) || 0).toLocaleString();
  const formatPercentage = (num: number) => `${(Number(num) || 0).toFixed(2)}%`;
  const getSizeValue = (item: any) => item?.size || "-";
  const getColorValue = (item: any) => item?.color || "-";

  return (
    <>
    <Card>
      <CardHeader>
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
        <div className="w-full overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">LINE</TableHead>
                <TableHead className="w-20">BUYER</TableHead>
                <TableHead className="w-24">STYLE</TableHead>
                <TableHead className="w-20 text-right">Order Qty</TableHead>
                <TableHead className="w-20 text-right">W Days</TableHead>
                <TableHead className="w-16 text-right">Hrs</TableHead>
                <TableHead className="w-16 text-right">Input</TableHead>

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
                  Assembly Input
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  Output
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

                <TableHead className="w-32">REMARKS</TableHead>
              </TableRow>

              <TableRow>
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>

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
              {Object.entries(ordersByBuyer).map(([buyer, orders]) => (
                <Fragment key={buyer}>
                  {orders.map((order, index) => {
                    const hasDetails = (order.__items?.length || 0) > 1;

                    return (
                      <Fragment key={`${buyer}-${order.__key}-${index}`}>
                        <TableRow
                          className={
                            order.is_pending_transition
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
                            {Number(order.working_hours || 0).toFixed(2)}
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
                            {order.is_pending_transition && (
                              <div className="mb-1 space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className="border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                >
                                  Pending: {formatNumber(order.pending_quantity || 0)} pcs
                                </Badge>
                                <p className="text-[11px] leading-tight text-amber-700 dark:text-amber-400">
                                  {order.remarks || "New style started on this line"}
                                </p>
                              </div>
                            )}
                            {order.needs_manual_complete && (
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
                                        items: (order.__items || [])
                                          .filter((it: any) => it.needs_manual_complete)
                                          .map((it: any) => ({
                                            order_id: it.order_id,
                                            production_line_id: it.production_line_id,
                                            size: it.size ?? "",
                                            color: it.color ?? "",
                                          })),
                                      })
                                    }
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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
                        orders.reduce((sum, o) => sum + Number(o.order_quantity || 0), 0)
                      )}
                    </TableCell>

                    <TableCell colSpan={2} />

                    <TableCell className="text-right">
                      {formatNumber(
                        orders.reduce((sum, o) => sum + Number(o.input || 0), 0)
                      )}
                    </TableCell>

                    <TableCell colSpan={10} />

                    <TableCell className="text-right text-xs">
                      {formatNumber(
                        orders.reduce((sum, o) => sum + Number(o.output?.day || 0), 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(
                        orders.reduce(
                          (sum, o) => sum + Number(o.output?.cumulative || 0),
                          0
                        )
                      )}
                    </TableCell>

                    <TableCell colSpan={7} />
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {reportData.summary && (
          <>
            <Separator className="my-4" />
            <div className="px-6 pb-4">
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
                  <p className="font-medium text-muted-foreground">Daily Input</p>
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
          <AlertDialogTitle>Mark Style as Complete?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>
                This will hide{" "}
                <strong>{pendingCompletion?.styleName}</strong> on{" "}
                <strong>{pendingCompletion?.lineName}</strong> from
                today&apos;s report.
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
            {isCompleting ? "Saving…" : "Mark Complete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
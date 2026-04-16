"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ProductionReportTableProps {
  reportData: any;
  isLoading: boolean;
}

export function ProductionReportTable({
  reportData,
  isLoading,
}: ProductionReportTableProps) {
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

  // Group orders by buyer for better organization
// ✅ Merge: single row per (LINE + BUYER + STYLE)
const ordersByBuyer: Record<string, any[]> = {};

const ensureMetric = (obj: any, key: string) => {
  if (!obj[key]) obj[key] = { day: 0, cumulative: 0 };
};



reportData.production_lines.forEach((line: any) => {
  line.orders.forEach((order: any) => {
    const buyer = order.buyer || "UNKNOWN";
    const style = order.style || "UNKNOWN";
    const lineName = order.line || line?.production_line_name || "UNKNOWN";

    if (!ordersByBuyer[buyer]) ordersByBuyer[buyer] = [];

    // key = one row per style per line (inside same buyer)
    const key = `${lineName}||${style}`;

    // find existing merged row
    let acc = ordersByBuyer[buyer]!.find((x) => x.__key === key);

    if (!acc) {
      acc = {
        __key: key,
        line: lineName,
        buyer,
        style,

        order_quantity: 0,
        input: 0,

        working_days: order.working_days ?? 1,
        working_hours: order.working_hours ?? 8,

        // all metrics in same shape
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

        // weighted DHU accumulators
        __dhuDayNum: 0,
        __dhuDayDen: 0,
        __dhuAvgNum: 0,
        __dhuAvgDen: 0,

        dhu_day: 0,
        dhu_average: 0,
      };

      ordersByBuyer[buyer]!.push(acc);
    }

    // ---- SUM BASIC ----
    acc.order_quantity += Number(order.order_quantity || 0);
    acc.input += Number(order.input || 0);

    // ---- SUM METRICS (day + cumulative) ----
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

    // ---- DHU weighted average ----
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
    acc.dhu_average = acc.__dhuAvgDen > 0 ? acc.__dhuAvgNum / acc.__dhuAvgDen : 0;
  });
});

  const formatNumber = (num: number) => num?.toLocaleString() || "0";
  const formatPercentage = (num: number) => `${num?.toFixed(2)}%` || "0.00%";

  return (
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
          <Badge
            variant="outline"
            className="text-sm">
            {reportData.report_date}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Front
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Back
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Sleeve
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Hood/Collar
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Lining
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Assembly Input
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Output
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  DHU %
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Inspection
                </TableHead>
                <TableHead
                  className="text-center"
                  colSpan={2}>
                  Packed
                </TableHead>
                <TableHead className="w-32">REMARKS</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
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
                <TableHead className="text-xs text-right">Cumm</TableHead>
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Avg</TableHead>
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>
                <TableHead className="text-xs text-right">Day</TableHead>
                <TableHead className="text-xs text-right">Cumm</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ordersByBuyer).map(([buyer, orders]) => (
                <Fragment key={buyer}>
                  {orders.map((order, index) => (
                    <TableRow key={`${buyer}-${index}`}>
                      <TableCell className="font-medium">
                        {order.line}
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
                        {order.working_hours?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(order.input)}
                      </TableCell>

                      {/* Front */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.front?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.front?.cumulative || 0)}
                      </TableCell>

                      {/* Back */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.back?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.back?.cumulative || 0)}
                      </TableCell>

                      {/* Sleeve */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.sleeve?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.sleeve?.cumulative || 0)}
                      </TableCell>

                      {/* Hood/Collar */}
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

                      {/* Lining */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.lining?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.lining?.cumulative || 0)}
                      </TableCell>

                      {/* Assembly Input */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.assembly_input?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.assembly_input?.cumulative || 0)}
                      </TableCell>

                      {/* Output */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.output?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.output?.cumulative || 0)}
                      </TableCell>

                      {/* DHU % */}
                      <TableCell className="text-right text-xs">
                        {formatPercentage(order.dhu_day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatPercentage(order.dhu_average || 0)}
                      </TableCell>

                      {/* Inspection */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.inspection?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.inspection?.cumulative || 0)}
                      </TableCell>

                      {/* Packed */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.packed?.day || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(order.packed?.cumulative || 0)}
                      </TableCell>

                      {/* Remarks */}
                      <TableCell className="text-xs"></TableCell>
                    </TableRow>
                  ))}

                  {/* Buyer Total Row */}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={3}>
                      <Badge variant="secondary">{buyer} Total</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(
                        orders.reduce(
                          (sum, order) => sum + order.order_quantity,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-right">
                      {formatNumber(
                        orders.reduce((sum, order) => sum + order.input, 0)
                      )}
                    </TableCell>
                    <TableCell colSpan={14}></TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(
                        orders.reduce(
                          (sum, order) => sum + (order.output?.day || 0),
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(
                        orders.reduce(
                          (sum, order) => sum + (order.output?.cumulative || 0),
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell colSpan={6}></TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {reportData.summary && (
          <>
            <Separator className="my-4" />
            <div className="px-6 pb-4">
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Total Lines
                  </p>
                  <p className="text-lg font-bold">
                    {reportData.summary.total_production_lines}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Total Orders
                  </p>
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
                  <p className="font-medium text-muted-foreground">
                    Daily Input
                  </p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_input)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Daily Output
                  </p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_output)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Daily Inspection
                  </p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_inspection)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Daily Packed
                  </p>
                  <p className="text-lg font-bold">
                    {formatNumber(reportData.summary.daily_packed)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Efficiency
                  </p>
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
  );
}

"use client";

import {
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type SewingLineDashboard = z.infer<typeof schemas.SewingLineDashboard>;

interface SewingStatsCardsProps {
  data?: SewingLineDashboard[];
  isLoading: boolean;
}

export function SewingStatsCards({ data, isLoading }: SewingStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card
            key={i}
            className="animate-pulse">
            <CardHeader>
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-6 bg-muted rounded w-3/4" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="gap-1 px-2 py-4">
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              No Data Available
            </CardTitle>
            <div className="text-lg font-semibold">-</div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate aggregate stats
  const totalInput = data.reduce(
    (sum, line) =>
      sum + line.orders.reduce((orderSum, order) => orderSum + order.input, 0),
    0
  );

  const totalOutput = data.reduce(
    (sum, line) =>
      sum + line.orders.reduce((orderSum, order) => orderSum + order.output, 0),
    0
  );

  const readyForAssembly = data.reduce(
    (sum, line) =>
      sum +
      line.orders.reduce(
        (orderSum, order) => orderSum + order.assembly_ready_count,
        0
      ),
    0
  );

  const currentlyInAssembly = data.reduce(
    (sum, line) =>
      sum +
      line.orders.reduce(
        (orderSum, order) => orderSum + order.garment_assembly_wip,
        0
      ),
    0
  );
  const totalQcPass = data.reduce(
    (sum, line) =>
      sum +
      line.orders.reduce(
        (orderSum, order) => orderSum + order.qc_stats.qc_pass,
        0
      ),
    0
  );

  const totalQcFail = data.reduce(
    (sum, line) =>
      sum +
      line.orders.reduce(
        (orderSum, order) => orderSum + order.qc_stats.qc_fail,
        0
      ),
    0
  );

  const totalQcRework = data.reduce(
    (sum, line) =>
      sum +
      line.orders.reduce(
        (orderSum, order) => orderSum + order.qc_stats.qc_rework,
        0
      ),
    0
  );

  const totalFifoViolations = data.reduce(
    (sum, line) => sum + line.fifo_summary.total_fifo_violations,
    0
  );

  const overallCompletionRate =
    totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;
  const qcPassRate =
    totalQcPass + totalQcFail + totalQcRework > 0
      ? (totalQcPass / (totalQcPass + totalQcFail + totalQcRework)) * 100
      : 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* Total Input */}
      <Card className="gap-1 px-2 py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium">Input</CardTitle>
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{totalInput.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">In production</p>
        </CardContent>
      </Card>

      {/* Total Output */}
      <Card className="gap-1 px-2 py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium">Output</CardTitle>
          <Package className="h-3 w-3 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {totalOutput.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {overallCompletionRate.toFixed(1)}% rate
          </p>
        </CardContent>
      </Card>

      {/* Ready for Assembly */}
      <Card className="gap-1 px-2 py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium">Ready</CardTitle>
          <CheckCircle className="h-3 w-3 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {readyForAssembly.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">For assembly</p>
        </CardContent>
      </Card>

      {/* Currently in Assembly */}
      <Card className="gap-1 px-2 py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium">In Assembly</CardTitle>
          <TrendingUp className="h-3 w-3 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {currentlyInAssembly.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Work in progress</p>
        </CardContent>
      </Card>

      {/* QC Performance */}
      <Card className="gap-1 px-2 py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium">QC Pass Rate</CardTitle>
          {qcPassRate >= 95 ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : qcPassRate >= 85 ? (
            <AlertTriangle className="h-3 w-3 text-yellow-600" />
          ) : (
            <XCircle className="h-3 w-3 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{qcPassRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {totalQcPass.toLocaleString()} pass /{" "}
            {(totalQcPass + totalQcFail + totalQcRework).toLocaleString()} total
          </p>
        </CardContent>
      </Card>

      {/* FIFO Violations */}
      <Card className="gap-1 px-2 py-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium">FIFO Violations</CardTitle>
          {totalFifoViolations === 0 ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{totalFifoViolations}</div>
          <p className="text-xs text-muted-foreground">
            {totalFifoViolations === 0 ? "All compliant" : "Violations found"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

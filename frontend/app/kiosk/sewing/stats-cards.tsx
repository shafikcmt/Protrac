import {
  Loader,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsCardsProps {
  chartData: {
    inputOutput: Array<{ line: string; input: number; output: number }>;
    qualityCheck: Array<{
      line: string;
      qc_pass: number;
      qc_fail: number;
      qc_rework: number;
    }>;
  };
  summaryStats: {
    totalLines: number;
    totalOrders: number;
    totalFifoViolations: number;
    avgCompletionRate: number;
  };
}

export function StatsCards({ chartData, summaryStats }: StatsCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @container/main">
      {/* Total Input */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Input</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {chartData.inputOutput
              .reduce((sum, item) => sum + item.input, 0)
              .toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <BarChart3 className="h-4 w-4 mr-1" />
              Input
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Total Output */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Output</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {chartData.inputOutput
              .reduce((sum, item) => sum + item.output, 0)
              .toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <Target className="h-4 w-4 mr-1" />
              Output
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Completion */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Completion Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summaryStats.avgCompletionRate >= 0
              ? `${(summaryStats.avgCompletionRate * 100).toFixed(1)}%`
              : "N/A"}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <Loader className="h-4 w-4 mr-1" />
              Progress
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* QC Pass Rate */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>QC Pass Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {(() => {
              const totalQcChecks = chartData.qualityCheck.reduce(
                (sum, item) =>
                  sum + item.qc_pass + item.qc_fail + item.qc_rework,
                0
              );

              if (totalQcChecks === 0) return "N/A";

              const passRate =
                (chartData.qualityCheck.reduce(
                  (sum, item) => sum + item.qc_pass,
                  0
                ) /
                  totalQcChecks) *
                100;

              return `${passRate.toFixed(1)}%`;
            })()}
          </CardTitle>
          <CardAction>
            {(() => {
              const totalQcChecks = chartData.qualityCheck.reduce(
                (sum, item) =>
                  sum + item.qc_pass + item.qc_fail + item.qc_rework,
                0
              );

              if (totalQcChecks === 0) {
                return (
                  <Badge variant="secondary">
                    <Activity className="h-4 w-4 mr-1" />
                    Pending
                  </Badge>
                );
              }

              const passRate =
                (chartData.qualityCheck.reduce(
                  (sum, item) => sum + item.qc_pass,
                  0
                ) /
                  totalQcChecks) *
                100;

              return (
                <Badge variant={passRate >= 95 ? "default" : "destructive"}>
                  {passRate >= 95 ? (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  {passRate >= 95 ? "Excellent" : "Review"}
                </Badge>
              );
            })()}
          </CardAction>
        </CardHeader>
      </Card>

      {/* Active Lines */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Lines</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summaryStats.totalLines}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <Activity className="h-4 w-4 mr-1" />
              Running
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* FIFO Violations */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>FIFO Issues</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summaryStats.totalFifoViolations}
          </CardTitle>
          <CardAction>
            <Badge
              variant={
                summaryStats.totalFifoViolations === 0
                  ? "default"
                  : "destructive"
              }>
              {summaryStats.totalFifoViolations === 0 ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-1" />
              )}
              {summaryStats.totalFifoViolations === 0 ? "Clean" : "Issues"}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

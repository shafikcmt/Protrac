import { RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, LabelList } from "recharts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

const inputOutputChartConfig = {
  input: {
    label: "Input",
    color: "var(--chart-1)",
  },
  output: {
    label: "Output",
    color: "var(--chart-2)",
  },
  wip: {
    label: "WIP",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const qualityCheckChartConfig = {
  qc_pass: {
    label: "Pass",
    color: "var(--chart-2)",
  },
  qc_fail: {
    label: "Fail",
    color: "var(--chart-5)",
  },
  qc_rework: {
    label: "Rework",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface ChartsGridProps {
  chartData: {
    inputOutput: Array<{
      order: string;
      size: string;
      input: number;
      output: number;
      wip: number;
    }>;
    qualityCheck: Array<{
      order: string;
      qc_pass: number;
      qc_fail: number;
      qc_rework: number;
    }>;
  };
  isLoading: boolean;
}

export function ChartsGrid({ chartData, isLoading }: ChartsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Input vs Output by Order</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={inputOutputChartConfig}>
            <BarChart
              accessibilityLayer
              margin={{ top: 20 }}
              data={chartData.inputOutput}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="order"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;

                  const data = payload[0]?.payload;

                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-sm text-sm min-w-[140px]">
                    <div className="font-medium">{data.orderNumber || data.order}</div>
                      <div className="text-muted-foreground mb-2">
                        Size: {data.size || "-"}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span>Input</span>
                          <span className="font-medium">{data.input}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Output</span>
                          <span className="font-medium">{data.output}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>WIP</span>
                          <span className="font-medium">{data.wip}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="input" fill="var(--color-input)" radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar dataKey="output" fill="var(--color-output)" radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar dataKey="wip" fill="var(--color-wip)" radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ChartContainer>

          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 flex-wrap">
          <Badge
            style={{
              background: "var(--chart-1)",
              color: "var(--card-foreground)",
            }}>
            {chartData.inputOutput.reduce((sum, item) => sum + item.input, 0)}{" "}
            Total Input
          </Badge>

          <Badge
            style={{
              background: "var(--chart-2)",
              color: "var(--card-foreground)",
            }}>
            {chartData.inputOutput.reduce((sum, item) => sum + item.output, 0)}{" "}
            Total Output
          </Badge>

          <Badge
            style={{
              background: "var(--chart-3)",
              color: "var(--card-foreground)",
            }}>
            {chartData.inputOutput.reduce((sum, item) => sum + item.wip, 0)}{" "}
            Total WIP
          </Badge>

          <Badge variant="secondary">
            {chartData.inputOutput.length} Total Orders
          </Badge>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Control Results</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={qualityCheckChartConfig}>
            <BarChart
              accessibilityLayer
              margin={{ top: 20 }}
              data={chartData.qualityCheck}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="order"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;

                  const data = payload[0]?.payload;

                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-sm text-sm min-w-[140px]">
                      <div className="font-medium">{data.order}</div>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between gap-4">
                          <span>Pass</span>
                          <span className="font-medium">{data.qc_pass}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Fail</span>
                          <span className="font-medium">{data.qc_fail}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Rework</span>
                          <span className="font-medium">{data.qc_rework}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="qc_pass" fill="var(--color-qc_pass)" radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar dataKey="qc_fail" fill="var(--color-qc_fail)" radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar
                dataKey="qc_rework"
                fill="var(--color-qc_rework)"
                radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ChartContainer>

          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 flex-wrap">
          <Badge
            style={{
              background: "var(--chart-2)",
              color: "var(--card-foreground)",
            }}>
            {chartData.qualityCheck.reduce((sum, item) => sum + item.qc_pass, 0)}{" "}
            Pass
          </Badge>

          <Badge
            style={{
              background: "var(--chart-5)",
              color: "var(--card-foreground)",
            }}>
            {chartData.qualityCheck.reduce((sum, item) => sum + item.qc_fail, 0)}{" "}
            Fail
          </Badge>

          <Badge
            style={{
              background: "var(--chart-3)",
              color: "var(--card-foreground)",
            }}>
            {chartData.qualityCheck.reduce(
              (sum, item) => sum + item.qc_rework,
              0
            )}{" "}
            Rework
          </Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
import { RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
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
  ChartTooltipContent,
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

const partsYieldChartConfig = {
  total_produced: {
    label: "Produced",
    color: "var(--chart-2)",
  },
  max_possible: {
    label: "Max Possible",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface ChartsGridProps {
  chartData: {
    inputOutput: Array<{ line: string; input: number; output: number }>;
    qualityCheck: Array<{
      line: string;
      qc_pass: number;
      qc_fail: number;
      qc_rework: number;
    }>;
    partsYield: Array<{
      part: string;
      total_produced: number;
      max_possible: number;
    }>;
  };
  isLoading: boolean;
}

export function ChartsGrid({ chartData, isLoading }: ChartsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Input vs Output Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Input vs Output by Line</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={inputOutputChartConfig}>
            <BarChart
              accessibilityLayer
              margin={{ top: 20 }}
              data={chartData.inputOutput}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="line"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar
                dataKey="input"
                fill="var(--color-input)"
                radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar
                dataKey="output"
                fill="var(--color-output)"
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
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Badge variant="outline">
            {
              chartData.inputOutput.filter(
                (item) => item.output >= item.input * 0.9
              ).length
            }{" "}
            High Efficiency Lines
          </Badge>
          <Badge
            style={{
              background: "var(--chart-1)",
              color: "var(--card-foreground)",
            }}>
            {chartData.inputOutput.length} Total Lines
          </Badge>
        </CardFooter>
      </Card>

      {/* Quality Control Chart */}
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
                dataKey="line"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar
                dataKey="qc_pass"
                fill="var(--color-qc_pass)"
                radius={4}>
                <LabelList
                  position="top"
                  offset={10}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar
                dataKey="qc_fail"
                fill="var(--color-qc_fail)"
                radius={4}>
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
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Badge
            style={{
              background: "var(--chart-2)",
              color: "var(--card-foreground)",
            }}>
            {chartData.qualityCheck.reduce(
              (sum, item) => sum + item.qc_pass,
              0
            )}{" "}
            Pass
          </Badge>
          <Badge
            style={{
              background: "var(--chart-5)",
              color: "var(--card-foreground)",
            }}>
            {chartData.qualityCheck.reduce(
              (sum, item) => sum + item.qc_fail,
              0
            )}{" "}
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

      {/* Parts Production Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Parts Production Status</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={partsYieldChartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData.partsYield}
              layout="vertical"
              margin={{ right: 30 }}>
              <XAxis
                type="number"
                dataKey="total_produced"
                hide
              />
              <YAxis
                dataKey="part"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="total_produced"
                fill="var(--color-total_produced)"
                radius={5}>
                <LabelList
                  dataKey="total_produced"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
              <Bar
                dataKey="max_possible"
                fill="var(--color-max_possible)"
                radius={5}>
                <LabelList
                  dataKey="max_possible"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {chartData.partsYield.filter(
            (part) => part.total_produced < part.max_possible * 0.8
          ).length > 0 ? (
            <Badge
              style={{
                background: "var(--chart-5)",
                color: "var(--card-foreground)",
              }}>
              ⚠️{" "}
              {
                chartData.partsYield.filter(
                  (part) => part.total_produced < part.max_possible * 0.8
                ).length
              }{" "}
              Low Efficiency
            </Badge>
          ) : (
            <Badge
              style={{
                background: "var(--chart-2)",
                color: "var(--card-foreground)",
              }}>
              ✓ All Efficient
            </Badge>
          )}
          <Badge
            style={{
              background: "var(--chart-1)",
              color: "var(--card-foreground)",
            }}>
            {chartData.partsYield.length} Parts Tracked
          </Badge>
          <Badge
            style={{
              background: "var(--chart-2)",
              color: "var(--card-foreground)",
            }}>
            {(
              (chartData.partsYield.reduce(
                (sum, item) => sum + item.total_produced,
                0
              ) /
                chartData.partsYield.reduce(
                  (sum, item) => sum + item.max_possible,
                  0
                )) *
              100
            ).toFixed(1)}
            % Overall
          </Badge>
        </CardFooter>
      </Card>
    </div>
  );
}

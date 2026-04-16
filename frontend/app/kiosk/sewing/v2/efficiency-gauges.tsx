import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface EfficiencyGaugesProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function EfficiencyGauges({
  lineData,
  isLoading,
}: EfficiencyGaugesProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const efficiencyValue = parseFloat(lineData?.efficiency_percentage ?? "0");
  const rejectionValue = parseFloat(lineData?.rejection_percentage ?? "0");
  const dhuValue = parseFloat(lineData?.dhu_percentage ?? "0");

  const efficiencyData = [{ value: efficiencyValue }];
  const rejectionData = [{ value: rejectionValue }];
  const dhuData = [{ value: dhuValue }];

  const efficiencyConfig = {
    value: { label: "Efficiency", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const rejectionConfig = {
    value: { label: "Rejection", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  const dhuConfig = {
    value: { label: "DHU", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Efficiency Gauge */}
      <Card>
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            EFFICIENCY
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center pb-0">
          <ChartContainer
            config={efficiencyConfig}
            className="mx-auto aspect-square w-full max-w-[200px]">
            <RadialBarChart
              data={efficiencyData}
              startAngle={90}
              endAngle={450}
              innerRadius={60}
              outerRadius={90}>
              <PolarRadiusAxis
                tick={false}
                tickLine={false}
                axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="fill-foreground text-2xl font-bold">
                            {efficiencyValue.toFixed(1)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 12}
                            className="fill-muted-foreground text-sm">
                            %
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
              <RadialBar
                dataKey="value"
                fill="var(--color-value)"
                cornerRadius={10}
                className="stroke-transparent stroke-2"
              />
            </RadialBarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Rejection Gauge */}
      <Card>
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            REJECTION
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center pb-0">
          <ChartContainer
            config={rejectionConfig}
            className="mx-auto aspect-square w-full max-w-[200px]">
            <RadialBarChart
              data={rejectionData}
              startAngle={90}
              endAngle={450}
              innerRadius={60}
              outerRadius={90}>
              <PolarRadiusAxis
                tick={false}
                tickLine={false}
                axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="fill-foreground text-2xl font-bold">
                            {rejectionValue.toFixed(1)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 12}
                            className="fill-muted-foreground text-sm">
                            %
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
              <RadialBar
                dataKey="value"
                fill="var(--color-value)"
                cornerRadius={10}
                className="stroke-transparent stroke-2"
              />
            </RadialBarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* DHU Gauge */}
      <Card>
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            DHU
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center pb-0">
          <ChartContainer
            config={dhuConfig}
            className="mx-auto aspect-square w-full max-w-[200px]">
            <RadialBarChart
              data={dhuData}
              startAngle={90}
              endAngle={450}
              innerRadius={60}
              outerRadius={90}>
              <PolarRadiusAxis
                tick={false}
                tickLine={false}
                axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="fill-foreground text-2xl font-bold">
                            {dhuValue.toFixed(1)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 12}
                            className="fill-muted-foreground text-sm">
                            %
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
              <RadialBar
                dataKey="value"
                fill="var(--color-value)"
                cornerRadius={10}
                className="stroke-transparent stroke-2"
              />
            </RadialBarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig } from "@/components/ui/chart";

const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

interface SingleGaugeProps {
  title: string;
  value: number;
  colorConfig: ChartConfig;
  isLoading: boolean;
}

export function SingleGauge({
  title,
  value,
  colorConfig,
  isLoading,
}: SingleGaugeProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <Skeleton className="h-3 w-16 mx-auto" />
        </CardHeader>
        <CardContent className="flex-1 p-3 flex items-center justify-center">
          <Skeleton className="aspect-[2/1] w-full max-w-[200px] mx-auto rounded-lg" />
          <Skeleton className="h-4 w-12 mx-auto mt-1" />
        </CardContent>
      </Card>
    );
  }

  // Determine color scheme based on metric type
  const getColorArray = (metricTitle: string) => {
    switch (metricTitle.toUpperCase()) {
      case "EFFICIENCY":
        return ["#EA4228", "#F2FF00", "#5BE12C"]; // Red to Yellow to Green
      case "REJECTION":
        return ["#5BE12C", "#F2FF00", "#EA4228"]; // Green to Yellow to Red (inverted for rejection)
      case "DHU":
        return ["#5BE12C", "#F2FF00", "#EA4228"]; // Green to Yellow to Red (inverted for DHU)
      default:
        return ["#5BE12C", "#F2FF00", "#EA4228"];
    }
  };

  // Set the min/max values and ticks based on the metric
  const getGaugeConfig = (metricTitle: string, value: number) => {
    const baseConfig = {
      minValue: 0,
      maxValue: 100,
      ticks: [{ value: 33 }, { value: 67 }, { value: 100 }],
    };

    // For DHU, we might want different ranges
    if (metricTitle.toUpperCase() === "DHU") {
      const maxVal = Math.max(value * 1.5, 15);
      return {
        minValue: 0,
        maxValue: maxVal,
        ticks: [
          { value: maxVal * 0.33 },
          { value: maxVal * 0.67 },
          { value: maxVal },
        ],
      };
    }

    return baseConfig;
  };

  const gaugeConfig = getGaugeConfig(title, value);
  const colorArray = getColorArray(title);

  // Get gradient classes based on metric type - muted styling
  const getGradientClasses = (metricTitle: string) => {
    return "bg-gradient-to-br from-slate-600 via-slate-700 to-gray-800 dark:from-slate-700 dark:via-slate-800 dark:to-gray-900";
  };

  return (
    <Card
      className={`h-full flex flex-col border-0 relative overflow-hidden ${getGradientClasses(
        title
      )}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <div className="flex-1 flex flex-col justify-center p-4 relative z-10">
        <h3 className="text-center text-sm font-semibold text-white mb-2">
          {title}
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <div className="aspect-[2/1] w-full max-w-[350px]">
            <GaugeComponent
              value={Math.min(value, gaugeConfig.maxValue)}
              minValue={gaugeConfig.minValue}
              maxValue={gaugeConfig.maxValue}
              type="semicircle"
              marginInPercent={{
                top: 0.05,
                bottom: 0.05,
                left: 0.05,
                right: 0.05,
              }}
              labels={{
                valueLabel: { hide: true },
                tickLabels: {
                  type: "inner",
                  ticks: gaugeConfig.ticks,
                  defaultTickValueConfig: {
                    style: {
                      fill: "rgba(255, 255, 255, 0.9)",
                      fontSize: "10px",
                      fontWeight: "600",
                    },
                  },
                },
              }}
              arc={{
                colorArray,
                subArcs: [
                  { limit: gaugeConfig.maxValue * 0.33 },
                  { limit: gaugeConfig.maxValue * 0.67 },
                  { limit: gaugeConfig.maxValue },
                ],
                padding: 0.005,
                width: 0.35,
              }}
              pointer={{
                elastic: true,
                animationDelay: 0,
                color: "rgba(255, 255, 255, 0.9)",
                length: 0.8,
                width: 5,
              }}
            />
          </div>
        </div>
        <div className="text-center -mt-5">
          <span className="font-bold text-2xl text-white drop-shadow-lg">
            {value.toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  );
}

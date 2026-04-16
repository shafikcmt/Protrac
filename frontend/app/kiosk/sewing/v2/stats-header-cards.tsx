import { Target, CheckCircle, RotateCcw, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface StatsHeaderCardsProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function StatsHeaderCards({
  lineData,
  isLoading,
}: StatsHeaderCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "TARGET QTY",
      value: lineData?.target_qty ?? 0,
      icon: Target,
      gradient:
        "bg-gradient-to-br from-slate-500 via-slate-600 to-gray-700 dark:from-slate-600 dark:via-slate-700 dark:to-gray-800",
    },
    {
      title: "PASS QTY",
      value: lineData?.pass_qty ?? 0,
      icon: CheckCircle,
      gradient:
        "bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 dark:from-green-600 dark:via-green-700 dark:to-emerald-800",
    },
    {
      title: "REWORK QTY",
      value: lineData?.rework_qty ?? 0,
      icon: RotateCcw,
      gradient:
        "bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 dark:from-orange-600 dark:via-orange-700 dark:to-red-700",
    },
    {
      title: "REJECTED QTY",
      value: lineData?.rejected_qty ?? 0,
      icon: XCircle,
      gradient:
        "bg-gradient-to-br from-red-500 via-red-600 to-rose-700 dark:from-red-600 dark:via-red-700 dark:to-rose-800",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className={`${stat.gradient} border-0 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardHeader className="pb-1 relative z-10">
              <CardTitle className="text-xs font-semibold text-white">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0 relative z-10">
              <div className="text-2xl font-bold tabular-nums text-white drop-shadow-lg">
                {stat.value.toLocaleString()}
              </div>
              <Icon className="h-6 w-6 text-white" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface HourlyDataTableProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function HourlyDataTable({ lineData, isLoading }: HourlyDataTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-10 w-full"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hourlyData = lineData?.hourly_data ?? [];

  // Calculate totals
  const totals = hourlyData.reduce(
    (acc, hour) => ({
      target: acc.target + hour.target,
      output: acc.output + hour.output,
      rework: acc.rework + hour.rework,
    }),
    { target: 0, output: 0, rework: 0 }
  );

  // Helper function to get output badge colors with gradients
  const getOutputBadgeColors = (output: number, target: number) => {
    if (output >= target) {
      return "bg-gradient-to-br from-green-500 to-lime-500 text-white font-semibold shadow-lg hover:from-green-600 hover:to-lime-600 dark:from-green-600 dark:to-lime-600 dark:text-white dark:hover:from-green-700 dark:hover:to-lime-700";
    }
    return "bg-gradient-to-br from-red-500 to-orange-500 text-white font-semibold shadow-lg hover:from-red-600 hover:to-orange-600 dark:from-red-600 dark:to-orange-600 dark:text-white dark:hover:from-red-700 dark:hover:to-orange-700";
  };

  // Helper function to get rework badge colors with gradients
  const getReworkBadgeColors = (rework: number) => {
    if (rework === 0) {
      return "bg-gradient-to-br from-green-500 to-lime-500 text-white font-semibold shadow-lg hover:from-green-600 hover:to-lime-600 dark:from-green-600 dark:to-lime-600 dark:text-white dark:hover:from-green-700 dark:hover:to-lime-700";
    }
    return "bg-gradient-to-br from-orange-500 to-yellow-500 text-white font-semibold shadow-lg hover:from-orange-600 hover:to-yellow-600 dark:from-orange-600 dark:to-yellow-600 dark:text-white dark:hover:from-orange-700 dark:hover:to-yellow-700";
  };

  return (
    <Card className="h-full flex flex-col border-0 relative overflow-hidden bg-gradient-to-br from-slate-600 via-slate-700 to-gray-800 dark:from-slate-700 dark:via-slate-800 dark:to-gray-900 gap-0 py-0">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <CardHeader className="pb-2 flex-shrink-0 relative z-10 px-4 pt-4">
        <CardTitle className="text-sm font-semibold text-white">
          Hourly Production Data
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-3 relative z-10 px-4 pb-4">
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <tr className="border-b border-white/20">
                <th className="text-left py-2 px-1.5 font-semibold text-white">
                  Hour
                </th>
                <th className="text-right py-2 px-1.5 font-semibold text-white">
                  Target
                </th>
                <th className="text-right py-2 px-1.5 font-semibold text-white">
                  Output
                </th>
                <th className="text-right py-2 px-1.5 font-semibold text-white">
                  Rework
                </th>
              </tr>
            </thead>
            <tbody>
              {hourlyData.map((hour) => (
                <tr
                  key={hour.hour}
                  className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="py-2 px-1.5 font-semibold text-white">
                    {hour.hour} Hour
                  </td>
                  <td className="py-2 px-1.5 text-right tabular-nums font-semibold text-white">
                    {hour.target}
                  </td>
                  <td className="py-2 px-1.5 text-right">
                    <Badge
                      variant="default"
                      className={`text-sm px-2 py-1 w-full justify-center border-0 ${getOutputBadgeColors(
                        hour.output,
                        hour.target
                      )}`}>
                      {hour.output}
                    </Badge>
                  </td>
                  <td className="py-2 px-1.5 text-right">
                    <Badge
                      variant="default"
                      className={`text-sm px-2 py-1 w-full justify-center border-0 ${getReworkBadgeColors(
                        hour.rework
                      )}`}>
                      {hour.rework}
                    </Badge>
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="border-t-2 border-white/30 bg-white/10 font-semibold backdrop-blur-sm">
                <td className="py-2 px-1.5 text-white font-bold">Total</td>
                <td className="py-2 px-1.5 text-right tabular-nums text-white font-semibold">
                  {totals.target}
                </td>
                <td className="py-2 px-1.5 text-right">
                  <Badge
                    variant="default"
                    className={`text-sm px-2 py-1 font-semibold w-full justify-center border-0 ${getOutputBadgeColors(
                      totals.output,
                      totals.target
                    )}`}>
                    {totals.output}
                  </Badge>
                </td>
                <td className="py-2 px-1.5 text-right">
                  <Badge
                    variant="default"
                    className={`text-sm px-2 py-1 font-semibold w-full justify-center border-0 ${getReworkBadgeColors(
                      totals.rework
                    )}`}>
                    {totals.rework}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface EndLineDefectsProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function EndLineDefects({ lineData, isLoading }: EndLineDefectsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-8 w-full"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const endLineDefects = lineData?.end_line_defects ?? [];

  return (
    <Card className="h-full flex flex-col border-0 relative overflow-hidden bg-gradient-to-br from-slate-600 via-slate-700 to-gray-800 dark:from-slate-700 dark:via-slate-800 dark:to-gray-900 gap-0 py-0">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <CardHeader className="pb-2 flex-shrink-0 relative z-10 px-4 pt-4">
        <CardTitle className="text-sm font-semibold text-white">
          Defects
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden relative z-10 px-4 pb-4">
        {endLineDefects.length > 0 ? (
          <div className="flex flex-col h-full">
            {/* Scrollable defects container - flex-1 to fill available space */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
              {endLineDefects.map((defect, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5 px-2 rounded text-xs bg-white/10 hover:bg-white/15 transition-colors backdrop-blur-sm">
                  <span className="font-semibold truncate text-white">
                    {defect.name}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <Badge
                      variant="secondary"
                      className="text-xs px-1 py-0 bg-white/25 text-white border-0 font-semibold">
                      {defect.count}
                    </Badge>
                    <span className="text-white min-w-[2.5rem] text-right font-semibold">
                      {defect.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Total row - always visible at bottom */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded border border-white/30 bg-white/15 font-semibold mt-2 text-xs backdrop-blur-sm">
              <span className="text-white font-bold">Total</span>
              <div className="flex items-center space-x-1.5">
                <Badge
                  variant="default"
                  className="text-xs px-1 py-0 bg-white/30 text-white border-0 font-semibold">
                  {endLineDefects.reduce(
                    (sum, defect) => sum + defect.count,
                    0
                  )}
                </Badge>
                <span className="min-w-[2.5rem] text-right text-white font-semibold">
                  {endLineDefects
                    .reduce(
                      (sum, defect) => sum + parseFloat(defect.percentage),
                      0
                    )
                    .toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-white/70 text-center">
              No defects recorded
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

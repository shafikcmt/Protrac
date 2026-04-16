import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, TruckIcon } from "lucide-react";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface WipAndLoadingCardsProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function WipAndLoadingCards({
  lineData,
  isLoading,
}: WipAndLoadingCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
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

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Line WIP Card */}
      <Card className="border-0 flex-1 relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-sm font-semibold text-white">
            LINE WIP
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0 h-full relative z-10">
          <div className="text-3xl font-bold tabular-nums text-white drop-shadow-lg">
            {lineData?.line_wip?.toLocaleString() ?? 0}
          </div>
          <Package className="h-8 w-8 text-white" />
        </CardContent>
      </Card>

      {/* Today's Loading Card */}
      <Card className="border-0 flex-1 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 dark:from-orange-600 dark:via-orange-700 dark:to-red-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-sm font-semibold text-white">
            TODAYS LOADING
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0 h-full relative z-10">
          <div className="text-3xl font-bold tabular-nums text-white drop-shadow-lg">
            {lineData?.todays_loading?.toLocaleString() ?? 0}
          </div>
          <TruckIcon className="h-8 w-8 text-white" />
        </CardContent>
      </Card>
    </div>
  );
}

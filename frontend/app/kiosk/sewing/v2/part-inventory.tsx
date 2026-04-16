import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface PartInventoryProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function PartInventory({ lineData, isLoading }: PartInventoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
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

  const partInventory = lineData?.part_inventory ?? [];

  return (
    <Card className="h-full flex flex-col border-0 relative overflow-hidden bg-gradient-to-br from-slate-600 via-slate-700 to-gray-800 dark:from-slate-700 dark:via-slate-800 dark:to-gray-900 gap-0 py-0">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <CardHeader className="pb-2 flex-shrink-0 relative z-10 px-4 pt-4">
        <CardTitle className="text-sm font-semibold text-white">
          Part Inventory
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden relative z-10 px-4 pb-4">
        {partInventory.length > 0 ? (
          <div className="h-full overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <tr className="border-b border-white/20">
                  <th className="text-left p-1.5 font-semibold text-white">
                    Part
                  </th>
                  <th className="text-right p-1.5 font-semibold text-white">
                    Exp
                  </th>
                  <th className="text-right p-1.5 font-semibold text-white">
                    Prod
                  </th>
                  <th className="text-right p-1.5 font-semibold text-white">
                    Iss
                  </th>
                </tr>
              </thead>
              <tbody>
                {partInventory.map((part, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-1.5 font-semibold truncate text-white">
                      {part.name}
                    </td>
                    <td className="p-1.5 text-right tabular-nums font-semibold text-white">
                      {part.expected}
                    </td>
                    <td className="p-1.5 text-right tabular-nums font-semibold text-white">
                      {part.total_produced}
                    </td>
                    <td className="p-1.5 text-right tabular-nums font-semibold text-white">
                      {part.issued}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-white/70 text-center py-4">
            No inventory data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}

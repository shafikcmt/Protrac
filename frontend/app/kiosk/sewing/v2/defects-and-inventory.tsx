import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type SewingLineDashboardV2 = z.infer<typeof schemas.SewingLineDashboardV2>;

interface DefectsAndInventoryProps {
  lineData?: SewingLineDashboardV2;
  isLoading: boolean;
}

export function DefectsAndInventory({
  lineData,
  isLoading,
}: DefectsAndInventoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-full"
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
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
      </div>
    );
  }

  const endLineDefects = lineData?.end_line_defects ?? [];
  const partInventory = lineData?.part_inventory ?? [];

  return (
    <div className="space-y-4">
      {/* End Line Defects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">End Line Defects</CardTitle>
        </CardHeader>
        <CardContent>
          {endLineDefects.length > 0 ? (
            <div className="space-y-2">
              {endLineDefects.map((defect, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded border bg-card hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium">{defect.name}</span>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant="secondary"
                      className="tabular-nums px-2 py-1">
                      {defect.count}
                    </Badge>
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                      {defect.percentage}%
                    </span>
                  </div>
                </div>
              ))}
              {/* Total row */}
              <div className="flex items-center justify-between p-3 rounded border-2 border-primary bg-muted/20 font-semibold mt-2">
                <span className="text-sm">Total</span>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant="default"
                    className="tabular-nums px-2 py-1">
                    {endLineDefects.reduce(
                      (sum, defect) => sum + defect.count,
                      0
                    )}
                  </Badge>
                  <span className="text-sm min-w-[3rem] text-right">
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No defects recorded
            </p>
          )}
        </CardContent>
      </Card>

      {/* Part Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Part Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {partInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-muted">
                    <th className="text-left p-2 font-medium text-muted-foreground">
                      Part
                    </th>
                    <th className="text-right p-2 font-medium text-muted-foreground">
                      Expected
                    </th>
                    <th className="text-right p-2 font-medium text-muted-foreground">
                      Produced
                    </th>
                    <th className="text-right p-2 font-medium text-muted-foreground">
                      Issued
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {partInventory.map((part, index) => (
                    <tr
                      key={index}
                      className="border-b border-muted/50">
                      <td className="p-2 font-medium">{part.name}</td>
                      <td className="p-2 text-right tabular-nums">
                        {part.expected}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {part.total_produced}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {part.issued}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No inventory data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

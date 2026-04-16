"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Package, Shirt, Clock } from "lucide-react";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type PartReceiveInfoResponse = z.infer<typeof schemas.PartReceiveInfoResponse>;
type AssemblyTrackingIssueInfoResponse = z.infer<
  typeof schemas.AssemblyTrackingIssueInfoResponse
>;

interface AssemblyTrackingInfoProps {
  assemblyPartReceiveData?: PartReceiveInfoResponse;
  garmentIssueData?: AssemblyTrackingIssueInfoResponse;
  isLoadingAssemblyInfo: boolean;
  isLoadingGarmentInfo: boolean;
}

export function AssemblyTrackingInfo({
  assemblyPartReceiveData,
  garmentIssueData,
  isLoadingAssemblyInfo,
  isLoadingGarmentInfo,
}: AssemblyTrackingInfoProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
          {i < 4 && <Separator />}
        </div>
      ))}
    </div>
  );

  const EmptyState = ({
    icon: Icon,
    message,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    message: string;
  }) => (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );

  // ✅ KEEP BEFORE UI DATA SOURCE (inventory cards)
  const inventoryItems = (assemblyPartReceiveData as any)?.inventory_items || [];
  const inventoryCount =
    (assemblyPartReceiveData as any)?.inventory_count ?? inventoryItems.length;

  // ✅ recent_scans used only for "Update" line
  const recentScans = (assemblyPartReceiveData as any)?.recent_scans || [];

  // ✅ Latest scan per (order_id + part_name), DESC by created_at
  const latestScanByOrderPart = React.useMemo(() => {
    const m = new Map<string, any>();

    const sorted = [...recentScans].sort((a: any, b: any) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta; // ✅ DESC (latest first)
    });

    for (const s of sorted) {
      const b = s?.bundle;
      const o = b?.order;
      if (!b || !o) continue;

      const key = `${o.id}-${String(b.part_name || "")}`;
      if (!m.has(key)) m.set(key, s); // first one is latest (DESC)
    }

    return m;
  }, [recentScans]);

  const garmentIssues = garmentIssueData?.results || [];
  const garmentIssueCount = (garmentIssueData as any)?.count ?? garmentIssues.length;

  const safePct = (issued: number, total: number) => {
    if (!Number.isFinite(issued) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.round((issued / total) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Assembly Tracking History
          {(assemblyPartReceiveData as any)?.scanner_info && (
            <Badge variant="outline" className="ml-auto">
              {(assemblyPartReceiveData as any).scanner_info.scanner_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="assembly-parts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assembly-parts" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Assembly Parts
              {inventoryCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {inventoryCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="garment-issues" className="flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Garment Issues
              {garmentIssueCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {garmentIssueCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ✅ SAME UI AS BEFORE */}
          <TabsContent value="assembly-parts">
            <ScrollArea className="h-[400px]">
              {isLoadingAssemblyInfo ? (
                <LoadingSkeleton />
              ) : inventoryItems.length === 0 ? (
                <EmptyState icon={Package} message="No assembly part receives" />
              ) : (
                <div className="space-y-3">
                  {inventoryItems.map((part: any, index: number) => {
                    const totalQty = Number(part.total_quantity ?? 0);
                    const issuedQty = Number(part.issued_quantity ?? 0);
                    const availableQty = Number(part.available_quantity ?? 0);

                    const pct = safePct(issuedQty, totalQty);

                    // ✅ Match recent_scans bundle.part_name with inventory part.part
                    const scanKey = `${part.order_id}-${String(part.part || "")}`;
                    const lastScan = latestScanByOrderPart.get(scanKey);

                    return (
                      <div key={`assembly-${index}`}>
                        <div className="space-y-2">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              {/* Left */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {part.part}
                                  </Badge>
                                </div>

                                <p className="text-sm font-medium">
                                  {part.style} • {part.color} / {part.size}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Order: {part.order_number} • Season: {part.season}
                                </p>

                                {/* ✅ Added ONLY one text line (layout unchanged) */}
                                {lastScan?.created_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Update:{" "}
                                    {String(lastScan.event_type || "").replaceAll("_", " ")} •{" "}
                                    {formatTime(lastScan.created_at)} • {formatDate(lastScan.created_at)}
                                  </p>
                                )}
                              </div>

                              {/* Center */}
                              <div className="bg-muted/50 border rounded-lg px-4 py-2">
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <div className="text-xs text-blue-600 font-medium">Available</div>
                                    <div className="text-sm font-bold text-blue-700">{availableQty}</div>
                                  </div>

                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 font-medium">Total</div>
                                    <div className="text-sm font-bold text-gray-700">{totalQty}</div>
                                  </div>

                                  <div className="text-center">
                                    <div className="text-xs text-green-600 font-medium">Issued</div>
                                    <div className="text-sm font-bold text-green-700">{issuedQty}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Right */}
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Progress</div>

                                <div className="flex items-center gap-2 justify-end">
                                  <div className="text-xs">
                                    <span className="font-medium">{issuedQty}</span>
                                    <span className="text-muted-foreground">/{totalQty}</span>
                                  </div>

                                  <Badge
                                    variant={pct >= 80 ? "default" : pct >= 50 ? "secondary" : "outline"}
                                    className="text-xs px-2"
                                  >
                                    {pct}%
                                  </Badge>
                                </div>

                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {availableQty} remaining
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {index < inventoryItems.length - 1 && <Separator className="mt-3" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Garment issues tab unchanged */}
          <TabsContent value="garment-issues">
            <ScrollArea className="h-[400px]">
              {isLoadingGarmentInfo ? (
                <LoadingSkeleton />
              ) : garmentIssues.length === 0 ? (
                <EmptyState icon={Shirt} message="No garment issues for assembly" />
              ) : (
                <div className="space-y-3">
                  {garmentIssues.map((garment: any, index: number) => (
                    <div key={`garment-${index}`}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {garment.tracking_code}
                              </Badge>
                            </div>

                            <p className="text-sm font-medium">Garment from {garment.sewing_line}</p>
                            <p className="text-xs text-muted-foreground">Issued for assembly</p>
                          </div>

                          <div className="text-right">
                            {garment.created_at && (
                              <>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(garment.created_at)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(garment.created_at)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {index < garmentIssues.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
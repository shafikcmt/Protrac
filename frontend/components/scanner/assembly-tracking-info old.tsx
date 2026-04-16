"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Package, Shirt, Clock } from "lucide-react";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type PartReceiveInfoResponse = z.infer<
  typeof schemas.PartReceiveInfoResponse
>;
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
        <div
          key={i}
          className="space-y-2">
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

  const assemblyParts = assemblyPartReceiveData?.inventory_items || [];
  const garmentIssues = garmentIssueData?.results || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Assembly Tracking History
          {assemblyPartReceiveData?.scanner_info && (
            <Badge
              variant="outline"
              className="ml-auto">
              {assemblyPartReceiveData.scanner_info.scanner_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="assembly-parts"
          className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="assembly-parts"
              className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Assembly Parts
              {assemblyParts.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs">
                  {assemblyParts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="garment-issues"
              className="flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Garment Issues
              {garmentIssues.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs">
                  {garmentIssues.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assembly-parts">
            <ScrollArea className="h-[400px]">
              {isLoadingAssemblyInfo ? (
                <LoadingSkeleton />
              ) : assemblyParts.length === 0 ? (
                <EmptyState
                  icon={Package}
                  message="No assembly part receives"
                />
              ) : (
                <div className="space-y-3">
                  {assemblyParts.map((part, index) => (
                    <div key={`assembly-${index}`}>
                      <div className="space-y-2">
                        {/* Assembly Part Info */}
                        <div className="space-y-3">
                          {/* Main Info Row with Three Sections */}
                          <div className="flex items-center justify-between">
                            {/* Left: Assembly Part Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="font-mono text-xs">
                                  {part.part}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">
                                {part.style} • {part.color} / {part.size}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Order: {part.order_number} • Season: {part.season}
                              </p>
                            </div>
                            {/* Center: Compact Inventory */}
                            <div className="bg-muted/50 border rounded-lg px-4 py-2">
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className="text-xs text-blue-600 font-medium">
                                    Available
                                  </div>
                                  <div className="text-sm font-bold text-blue-700">
                                    {part.available_quantity}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-600 font-medium">
                                    Total
                                  </div>
                                  <div className="text-sm font-bold text-gray-700">
                                    {part.total_quantity}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-green-600 font-medium">
                                    Issued
                                  </div>
                                  <div className="text-sm font-bold text-green-700">
                                    {part.issued_quantity}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Right: Completion Progress */}
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">
                                Progress
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs">
                                  <span className="font-medium">
                                    {part.issued_quantity}
                                  </span>
                                  <span className="text-muted-foreground">
                                    /{part.total_quantity}
                                  </span>
                                </div>
                                <Badge
                                  variant={
                                    ((part.issued_quantity / part.total_quantity) * 100) >= 80
                                      ? "default"
                                      : ((part.issued_quantity / part.total_quantity) * 100) >= 50
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs px-2">
                                  {Math.round((part.issued_quantity / part.total_quantity) * 100)}%
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {part.available_quantity} remaining
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {index < assemblyParts.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="garment-issues">
            <ScrollArea className="h-[400px]">
              {isLoadingGarmentInfo ? (
                <LoadingSkeleton />
              ) : garmentIssues.length === 0 ? (
                <EmptyState
                  icon={Shirt}
                  message="No garment issues for assembly"
                />
              ) : (
                <div className="space-y-3">
                  {" "}
                  {garmentIssues.map((garment, index) => (
                    <div key={`garment-${index}`}>
                      <div className="space-y-2">
                        {/* Garment Info */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs">
                                {garment.tracking_code}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">
                              Garment from {garment.sewing_line}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Issued for assembly
                            </p>
                          </div>

                          {/* Timestamp */}
                          <div className="text-right">
                            {garment.created_at && (
                              <>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
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

                      {index < garmentIssues.length - 1 && (
                        <Separator className="mt-3" />
                      )}
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

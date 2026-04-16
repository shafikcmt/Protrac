"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { History, Package, Clock } from "lucide-react";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type BundleIssueInfoResponse = z.infer<typeof schemas.BundleIssueInfoResponse>;

interface BundleIssueInfoProps {
  data?: BundleIssueInfoResponse;
  isLoading: boolean;
}

export function BundleIssueInfo({ data, isLoading }: BundleIssueInfoProps) {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Bundle Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                {i < 4 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const bundles = data?.results || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Bundle Issues
          {data?.scanner_info && (
            <Badge variant="outline" className="ml-auto">
              {data.scanner_info.scanner_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {bundles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2" />
              <p className="text-sm">No recent bundle issues</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bundles.map((bundle, index) => (
                <div key={bundle.id || index}>
                  <div className="space-y-2">
                    {/* Bundle Info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {bundle.tracking_code}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {bundle.order_number} • {bundle.cut_part_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Issued to: {bundle.issued_to_sewing_line}
                        </p>
                      </div>
                      
                      {/* Timestamp */}                      <div className="text-right">
                        {bundle.created_at && (
                          <>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(bundle.created_at)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(bundle.created_at)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Qty: {bundle.quantity}</span>
                      <span>•</span>
                      <span>Style: {bundle.style_name}</span>
                      <span>•</span>
                      <span>{bundle.color_name} / {bundle.size_name}</span>
                    </div>
                  </div>
                  
                  {index < bundles.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

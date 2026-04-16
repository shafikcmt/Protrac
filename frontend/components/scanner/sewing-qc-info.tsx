"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  History,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type SewingQCInfoResponse = z.infer<typeof schemas.SewingQCInfoResponse>;

interface SewingQCInfoProps {
  data?: SewingQCInfoResponse;
  isLoading: boolean;
}

export function SewingQCInfo({ data, isLoading }: SewingQCInfoProps) {
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

  const getQCStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "rework":
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getQCStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pass":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Pass
          </Badge>
        );
      case "fail":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">Fail</Badge>
        );
      case "rework":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            Rework
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent QC Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  const qcChecks = data?.results || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent QC Checks
          {data?.scanner_info && (
            <Badge
              variant="outline"
              className="ml-auto">
              {data.scanner_info.scanner_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {qcChecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">No recent QC checks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {qcChecks.map((qc, index) => (
                <div key={qc.id || index}>
                  <div className="space-y-2">
                    {/* QC Check Info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs">
                            {qc.tracking_code}
                          </Badge>
                          {qc.latest_qc_status &&
                            getQCStatusBadge(qc.latest_qc_status)}
                        </div>
                        <p className="text-sm font-medium">
                          From {qc.sewing_line}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {qc.garment_status}
                        </p>
                      </div>

                      {/* Defects & Timestamp */}
                      <div className="text-right">
                        {qc.defect_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            {qc.defect_count} defect
                            {qc.defect_count !== 1 ? "s" : ""}
                          </div>
                        )}
                        {qc.created_at && (
                          <>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(qc.created_at)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(qc.created_at)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < qcChecks.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

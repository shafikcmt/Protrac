"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type SewingQCScanResponse = z.infer<typeof schemas.SewingQCScanResponse>;
type FinishingQCScanResponse = z.infer<typeof schemas.FinishingQCScanResponse>;

interface QCScanFeedbackProps {
  result?: SewingQCScanResponse | FinishingQCScanResponse;
  error?: any;
  onClear?: () => void;
}

export function QCScanFeedback({
  result,
  error,
  onClear,
}: QCScanFeedbackProps) {
  // Auto-clear feedback after 5 seconds
  useEffect(() => {
    if (result || error) {
      const timer = setTimeout(() => {
        onClear?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [result, error, onClear]);

  if (!result && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Scan Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Scan a tracking code to see feedback
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-600">
            Scan Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || "An error occurred during scanning"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    const getStatusIcon = () => {
      switch (result.qc_status) {
        case "pass":
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case "fail":
          return <XCircle className="h-5 w-5 text-red-600" />;
        case "rework":
          return <RotateCcw className="h-5 w-5 text-yellow-600" />;
        default:
          return <AlertCircle className="h-5 w-5 text-gray-600" />;
      }
    };

    const getStatusColor = () => {
      switch (result.qc_status) {
        case "pass":
          return "text-green-700 bg-green-50 border-green-200";
        case "fail":
          return "text-red-700 bg-red-50 border-red-200";
        case "rework":
          return "text-yellow-700 bg-yellow-50 border-yellow-200";
        default:
          return "text-gray-700 bg-gray-50 border-gray-200";
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-green-600">
            QC Check Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {result.message}
            </AlertDescription>
          </Alert>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tracking Code:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {result.garment_tracking_code}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">QC Status:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <Badge
                  variant="outline"
                  className={getStatusColor()}>
                  {result.qc_status.charAt(0).toUpperCase() +
                    result.qc_status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Garment Status:</span>
              <Badge variant="outline">
                {result.garment_status
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </Badge>
            </div>

            {result.defect_count > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Defects Found:</span>
                <Badge variant="destructive">
                  {result.defect_count} defect
                  {result.defect_count !== 1 ? "s" : ""}
                </Badge>
              </div>
            )}

            {result.is_reevaluation && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Re-evaluation:</span>
                <Badge variant="secondary">Yes</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

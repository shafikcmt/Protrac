"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type AssemblyPartReceiveScanResponse = z.infer<
  typeof schemas.AssemblyPartReceiveScanResponse
>;
type AssemblyTrackingIssueScanResponse = z.infer<
  typeof schemas.AssemblyTrackingIssueScanResponse
>;

interface AssemblyTrackingScanFeedbackProps {
  result?: AssemblyPartReceiveScanResponse | AssemblyTrackingIssueScanResponse;
  error?: unknown;
  onClear?: () => void;
}

export function AssemblyTrackingScanFeedback({
  result,
  error,
  onClear,
}: AssemblyTrackingScanFeedbackProps) {
  // Auto-clear feedback after 5 seconds
  useEffect(() => {
    if (result || error) {
      const timer = setTimeout(() => {
        onClear?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [result, error, onClear]);

  // Helper function to determine if result is assembly part receive
  const isAssemblyPartReceive = (
    result: AssemblyPartReceiveScanResponse | AssemblyTrackingIssueScanResponse
  ): result is AssemblyPartReceiveScanResponse => {
    return result && "part" in result;
  };

  // Helper function to get error message
  const getErrorMessage = (error: unknown): string => {
    if (!error) return "An unexpected error occurred";
    if (typeof error === "string") return error;
    if (error instanceof Error) {
      // Check if it's an API error with response data
      const apiError = error as Error & {
        response?: { data?: { detail?: string; message?: string } };
      };
      return (
        apiError?.response?.data?.detail ||
        apiError?.response?.data?.message ||
        error.message ||
        "An unexpected error occurred"
      );
    }
    // Handle any other type of error
    if (typeof error === "object" && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (errorObj.message && typeof errorObj.message === "string") {
        return errorObj.message;
      }
    }
    return "An unexpected error occurred";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Scan Result</CardTitle>
      </CardHeader>
      <CardContent>
        {result && result.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-medium">{result.message}</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {" "}
                  {isAssemblyPartReceive(result) ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-green-700">
                        Part: {result.part}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-green-700">
                        Completed: {result.quantity_completed}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-green-700">
                        Total Inventory: {result.total_inventory}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        className="text-green-700">
                        Garment: {result.garment_tracking_code}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-green-700">
                        From: {result.sewing_line}
                      </Badge>
                    </>
                  )}
                </div>
                {/* Additional info for assembly part receive */}
                {isAssemblyPartReceive(result) && (
                  <div className="text-xs text-green-700 mt-2">
                    <div>
                      Bundle ID: {result.bundle_id} • Scan ID: {result.scan_id}
                    </div>
                    {result.processing_time_minutes && (
                      <div>
                        Processing time: {result.processing_time_minutes}{" "}
                        minutes
                      </div>
                    )}
                    {result.fifo_compliance && (
                      <div>
                        FIFO Compliant: {result.fifo_compliance.is_compliant ? 'Yes' : 'No'}
                        {result.fifo_compliance.violation_count > 0 && (
                          <span> • Violations: {result.fifo_compliance.violation_count}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        {result && !result.success && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <p className="font-medium">{result.message}</p>
            </AlertDescription>
          </Alert>
        )}
        {error != null && (
          <Alert
            className="border-red-200 bg-red-50"
            variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Scan Failed</p>
              <p className="text-sm mt-1">
                {getErrorMessage(error)}
              </p>
            </AlertDescription>
          </Alert>
        )}{" "}
        {!result && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="rounded-full border-2 border-dashed border-muted-foreground/30 p-6 mb-3">
              <CheckCircle className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">Ready to scan</p>
            <p className="text-xs text-center mt-1">
              Scan a tracking code to process assembly tracking
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

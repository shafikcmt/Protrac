"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type BundleIssueScanResponse = z.infer<typeof schemas.BundleIssueScanResponse>;

interface ScanFeedbackProps {
  result?: BundleIssueScanResponse;
  error?: any;
  onClear?: () => void;
}

export function ScanFeedback({ result, error, onClear }: ScanFeedbackProps) {
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
          <CardTitle className="text-sm font-medium">Scan Result</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="rounded-full border-2 border-dashed border-muted-foreground/30 p-6 mb-3">
              <CheckCircle className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">Ready to scan</p>
            <p className="text-xs text-center mt-1">
              Scan or enter a tracking code to see results here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                  <Badge
                    variant="outline"
                    className="text-green-700">
                    Bundle: {result.bundle_tracking_code}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-green-700">
                    Line: {result.assigned_sewing_line}
                  </Badge>
                </div>
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

        {error && (
          <Alert
            className="border-red-200 bg-red-50"
            variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Scan Failed</p>
              <p className="text-sm mt-1">
                {error?.response?.data?.detail ||
                  error?.response?.data?.message ||
                  error?.message ||
                  "An unexpected error occurred"}
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

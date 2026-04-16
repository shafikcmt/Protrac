"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiHooks } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function ScannerPage() {
  const router = useRouter();

  // Get user profile to determine scanner type
  const {
    data: userProfile,
    isLoading,
    error,
  } = apiHooks.useGet("/api/accounts/profile/", undefined, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (userProfile?.assigned_scanner) {
      const scannerType = userProfile.assigned_scanner.scanner_type;

      // Redirect to appropriate scanner interface
      switch (scannerType) {
        case "bundle_issue":
          router.replace("/scan/bundle-issue");
          break;
        case "assembly_tracking":
          router.replace("/scan/assembly-tracking");
          break;
        case "sewing_qc_check":
          router.replace("/scan/sewing-qc");
          break;
        case "finishing_qc_check":
          router.replace("/scan/finishing-qc");
          break;
        default:
          router.replace("/");
          break;
      }
    } else if (!isLoading && !error) {
      // No scanner assigned, redirect to main app
      router.replace("/");
    }
  }, [userProfile, isLoading, error, router]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading scanner interface...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to load scanner information</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please check your connection and try again
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[400px] items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Redirecting to scanner interface...</span>
      </div>
    </div>
  );
}

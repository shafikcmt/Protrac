"use client";

import { AssemblyTrackingScanForm } from "@/components/scanner/assembly-tracking-scan-form";
import { AssemblyTrackingScanFeedback } from "@/components/scanner/assembly-tracking-scan-feedback";
import { AssemblyTrackingInfo } from "@/components/scanner/assembly-tracking-info";
import { AssemblyDailySummary } from "@/components/scan/AssemblyDailySummary";
import { useAssemblyTrackingScanner } from "./use-assembly-tracking-scanner";

export default function AssemblyTrackingScannerPage() {
  const {
    // Queries
    assemblyPartReceiveInfo,
    garmentIssueInfo,
    isLoadingAssemblyInfo,
    isLoadingGarmentInfo,
    
    // Mutation
    submitScan,
    isScanning,
    lastScanResult,
    scanError,
    
    // Helper functions
    getEndpointInfo,
    
    // Actions
    resetScanResult,
  } = useAssemblyTrackingScanner();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1.2fr] lg:items-start">
      {/* Zone 1 — Scanner + Scan Result, natural (compact) heights */}
      <div className="space-y-4">
        <AssemblyTrackingScanForm
          onSubmit={submitScan}
          isLoading={isScanning}
          getEndpointInfo={getEndpointInfo}
        />

        <AssemblyTrackingScanFeedback
          result={lastScanResult}
          error={scanError}
          onClear={resetScanResult}
        />
      </div>

      {/* Zone 2 — Assembly Tracking History (internal scroll list) */}
      <div>
        <AssemblyTrackingInfo
          assemblyPartReceiveData={assemblyPartReceiveInfo}
          garmentIssueData={garmentIssueInfo}
          isLoadingAssemblyInfo={isLoadingAssemblyInfo}
          isLoadingGarmentInfo={isLoadingGarmentInfo}
        />
      </div>

      {/* Zone 3 — Today's summary, split into 2 equal-height stacked cards
          (top section + hourly table). ALWAYS visible for a valid
          assembly-tracking user; the component renders its own loading
          skeleton, data, or a visible error/empty message. */}
      <div className="space-y-4">
        <AssemblyDailySummary />
      </div>
    </div>
  );
}

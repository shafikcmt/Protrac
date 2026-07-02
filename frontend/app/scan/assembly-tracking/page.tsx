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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Scan Input and Feedback (1/3) */}
      <div className="space-y-6">
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

        {/* Today's summary — ALWAYS visible for a valid assembly-tracking user.
            The component renders its own loading skeleton, data, or a visible
            error/empty message, so it must never be gated behind a scan. */}
        <AssemblyDailySummary />
      </div>

      {/* Right Column - Assembly Tracking Info (2/3) */}
      <div className="lg:col-span-2">
        <AssemblyTrackingInfo
          assemblyPartReceiveData={assemblyPartReceiveInfo}
          garmentIssueData={garmentIssueInfo}
          isLoadingAssemblyInfo={isLoadingAssemblyInfo}
          isLoadingGarmentInfo={isLoadingGarmentInfo}
        />
      </div>
    </div>
  );
}

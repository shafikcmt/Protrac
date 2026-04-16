"use client";

import { BundleIssueScanForm } from "@/components/scanner/bundle-issue-scan-form";
import { ScanFeedback } from "@/components/scanner/scan-feedback";
import { BundleIssueInfo } from "@/components/scanner/bundle-issue-info";
import { useBundleIssueScanner } from "./use-bundle-issue-scanner";

export default function BundleIssueScannerPage() {
  const {
    // Queries
    bundleIssueInfo,
    sewingLines,
    isLoadingInfo,
    isLoadingLines,

    // Mutation
    submitScan,
    isScanning,
    lastScanResult,
    scanError,

    // Actions
    resetScanResult,
  } = useBundleIssueScanner();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Scan Input and Feedback (1/3) */}
      <div className="space-y-6">
        <BundleIssueScanForm
          onSubmit={submitScan}
          isLoading={isScanning}
          sewingLines={sewingLines}
          isLoadingLines={isLoadingLines}
        />

        <ScanFeedback
          result={lastScanResult}
          error={scanError}
          onClear={resetScanResult}
        />
      </div>

      {/* Right Column - Bundle Issue Info (2/3) */}
      <div className="lg:col-span-2">
        <BundleIssueInfo
          data={bundleIssueInfo}
          isLoading={isLoadingInfo}
        />
      </div>
    </div>
  );
}

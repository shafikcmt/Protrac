"use client";

import { useState } from "react";
import { BundleIssueScanForm } from "@/components/scanner/bundle-issue-scan-form";
import { ScanFeedback } from "@/components/scanner/scan-feedback";
import { BundleIssuePanel } from "@/components/scanner/bundle-issue-panel";
import { useBundleIssueScanner } from "./use-bundle-issue-scanner";

export default function BundleIssueScannerPage() {
  const {
    // Queries
    bundleIssueInfo,
    sewingLines,
    isLoadingInfo,
    isLoadingLines,

    // Created bundles worklist
    createdBundles,
    isLoadingCreated,
    isErrorCreated,

    // Mutation
    submitScan,
    isScanning,
    lastScanResult,
    scanError,

    // Transfer
    transferBundles,
    isTransferring,

    // Actions
    resetScanResult,
  } = useBundleIssueScanner();

  // Bridge: clicking a created-bundle row fills the scan form's Tracking Code
  // field. A fresh object per click means re-clicking the same code re-applies.
  const [prefill, setPrefill] = useState<{ trackingCode: string } | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
      {/* Left Column - Scan Input and Feedback (1/3) */}
      <div className="space-y-6">
        <BundleIssueScanForm
          onSubmit={submitScan}
          isLoading={isScanning}
          sewingLines={sewingLines}
          isLoadingLines={isLoadingLines}
          prefill={prefill}
        />

        <ScanFeedback
          result={lastScanResult}
          error={scanError}
          onClear={resetScanResult}
        />
      </div>

      {/* Right Column - Bundle Issues (tabbed: Ready to Issue / Recent) (2/3) */}
      <div className="lg:col-span-2">
        <BundleIssuePanel
          recentData={bundleIssueInfo}
          isLoadingRecent={isLoadingInfo}
          createdData={createdBundles}
          isLoadingCreated={isLoadingCreated}
          isErrorCreated={isErrorCreated}
          onSelect={(trackingCode) => setPrefill({ trackingCode })}
          sewingLines={sewingLines}
          onTransfer={transferBundles}
          isTransferring={isTransferring}
        />
      </div>
    </div>
  );
}

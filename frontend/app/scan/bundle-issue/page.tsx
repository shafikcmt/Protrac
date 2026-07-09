"use client";

import { useState } from "react";
import { BundleIssueScanForm } from "@/components/scanner/bundle-issue-scan-form";
import { ScanFeedback } from "@/components/scanner/scan-feedback";
import { BundleIssueInfo } from "@/components/scanner/bundle-issue-info";
import { CreatedBundlesList } from "@/components/scanner/created-bundles-list";
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

    // Actions
    resetScanResult,
  } = useBundleIssueScanner();

  // Bridge: clicking a created-bundle row fills the scan form's Tracking Code
  // field. A fresh object per click means re-clicking the same code re-applies.
  const [prefill, setPrefill] = useState<{ trackingCode: string } | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      {/* Right Column - Bundle Issue Info + Created bundles worklist (2/3) */}
      <div className="lg:col-span-2 space-y-6">
        <BundleIssueInfo
          data={bundleIssueInfo}
          isLoading={isLoadingInfo}
        />

        <CreatedBundlesList
          data={createdBundles}
          isLoading={isLoadingCreated}
          isError={isErrorCreated}
          onSelect={(trackingCode) => setPrefill({ trackingCode })}
        />
      </div>
    </div>
  );
}

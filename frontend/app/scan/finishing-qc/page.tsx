"use client";

import { FinishingQCScanForm } from "@/components/scanner/finishing-qc-scan-form";
import { QCScanFeedback } from "@/components/scanner/qc-scan-feedback";
import { FinishingQCInfo } from "@/components/scanner/finishing-qc-info";
import { useFinishingQCScanner } from "./use-finishing-qc-scanner";

export default function FinishingQCScannerPage() {
  const {
    // Queries
    finishingQCInfo,
    defects,
    isLoadingInfo,
    isLoadingDefects,

    // Mutation
    submitScan,
    isScanning,
    lastScanResult,
    scanError,

    // Actions
    resetScanResult,
  } = useFinishingQCScanner();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Scan Input and Feedback (1/3) */}
      <div className="space-y-6">
        <FinishingQCScanForm
          onSubmit={submitScan}
          isLoading={isScanning}
          defects={defects}
          isLoadingDefects={isLoadingDefects}
        />
        <QCScanFeedback
          result={lastScanResult}
          error={scanError}
          onClear={resetScanResult}
        />
      </div>

      {/* Right Column - Finishing QC Info (2/3) */}
      <div className="lg:col-span-2">
        <FinishingQCInfo
          data={finishingQCInfo}
          isLoading={isLoadingInfo}
        />
      </div>
    </div>
  );
}

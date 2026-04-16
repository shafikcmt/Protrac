"use client";

import { SewingQCScanForm } from "@/components/scanner/sewing-qc-scan-form";
import { QCScanFeedback } from "@/components/scanner/qc-scan-feedback";
import { SewingQCInfo } from "@/components/scanner/sewing-qc-info";
import { useSewingQCScanner } from "./use-sewing-qc-scanner";

export default function SewingQCScannerPage() {
  const {
    // Queries
    sewingQCInfo,
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
  } = useSewingQCScanner();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Scan Input and Feedback (1/3) */}
      <div className="space-y-6">
        <SewingQCScanForm
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

      {/* Right Column - Sewing QC Info (2/3) */}
      <div className="lg:col-span-2">
        <SewingQCInfo
          data={sewingQCInfo}
          isLoading={isLoadingInfo}
        />
      </div>
    </div>
  );
}

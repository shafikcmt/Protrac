"use client";

import { useState } from "react";
import { FinishingQCScanForm } from "@/components/scanner/finishing-qc-scan-form";
import { QCScanFeedback } from "@/components/scanner/qc-scan-feedback";
import { FinishingQCInfo } from "@/components/scanner/finishing-qc-info";
import { FinishingQCDailySummary } from "@/components/scanner/finishing-qc-daily-summary";
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

  // Bridge: clicking a serial square in the Serial Status grid (Zone 3) fills the
  // scan form's Tracking Code field (Zone 1). A fresh object per click means
  // re-clicking the same code re-applies. Mirrors the sewing-QC page.
  const [prefill, setPrefill] = useState<{ trackingCode: string } | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1.2fr] lg:items-start">
      {/* Zone 1 — Scanner + Scan Result */}
      <div className="min-w-0 space-y-4">
        <FinishingQCScanForm
          onSubmit={submitScan}
          isLoading={isScanning}
          defects={defects}
          isLoadingDefects={isLoadingDefects}
          prefill={prefill}
        />
        <QCScanFeedback
          result={lastScanResult}
          error={scanError}
          onClear={resetScanResult}
        />
      </div>

      {/* Zone 2 — Finishing QC History */}
      <div className="min-w-0">
        <FinishingQCInfo data={finishingQCInfo} isLoading={isLoadingInfo} />
      </div>

      {/* Zone 3 — Today's QC summary (output / rework / pass-rate / DHU% + the
          dual sewing/finishing serial-status heatmap). No Target vs Actual and
          no Top Defects for finishing QC. */}
      <div className="min-w-0 space-y-4">
        <FinishingQCDailySummary
          onSerialSelect={(trackingCode) => setPrefill({ trackingCode })}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { SewingQCScanForm } from "@/components/scanner/sewing-qc-scan-form";
import { QCScanFeedback } from "@/components/scanner/qc-scan-feedback";
import { SewingQCInfo } from "@/components/scanner/sewing-qc-info";
import { SewingQCDailySummary } from "@/components/scanner/sewing-qc-daily-summary";
import { SewingQCTargetVsActual } from "@/components/scanner/sewing-qc-target-vs-actual";
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

  // Bridge: clicking a serial square in the Serial Status grid (Zone 3) fills the
  // scan form's Tracking Code field (Zone 1). A fresh object per click means
  // re-clicking the same code re-applies. Mirrors the bundle-issue page.
  const [prefill, setPrefill] = useState<{ trackingCode: string } | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1.2fr] lg:items-start">
      {/* Zone 1 — Scanner + Scan Result */}
      <div className="space-y-4">
        <SewingQCScanForm
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

      {/* Zone 2 — Sewing QC History */}
      <div>
        <SewingQCInfo data={sewingQCInfo} isLoading={isLoadingInfo} />
      </div>

      {/* Zone 3 — Today's QC summary (output / rework / fail / DHU% + top
          defects) on top, then the hourly Target vs Actual (QC-pass output per
          hour) below. Always visible for a valid sewing-QC user. */}
      <div className="space-y-4">
        <SewingQCDailySummary
          onSerialSelect={(trackingCode) => setPrefill({ trackingCode })}
        />
        <SewingQCTargetVsActual />
      </div>
    </div>
  );
}

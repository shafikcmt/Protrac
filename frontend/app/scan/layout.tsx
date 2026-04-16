"use client";

import ProtectedRoute from "@/components/providers/protected-route";
import { ScannerHeader } from "@/components/scanner/scanner-header";

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <ScannerHeader />
        <main className="container mx-auto p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

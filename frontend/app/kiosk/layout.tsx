"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/providers/protected-route";
import { KioskHeader } from "@/components/kiosk/kiosk-header";
import { KioskContext, type KioskFilters } from "./kiosk-context";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filters, setFilters] = useState<KioskFilters>({
    active_only: true,
  });

  return (
    <ProtectedRoute>
      <KioskContext.Provider value={{ filters, setFilters }}>
        <div className="min-h-screen bg-background">
          <KioskHeader />
          <main className="p-6">{children}</main>
        </div>
      </KioskContext.Provider>
    </ProtectedRoute>
  );
}

"use client";

import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import { OverviewStats } from "./overview-stats";
import { DailyTargetsCard } from "@/components/dashboard/daily-targets-card";

export default function Page() {
  const breadcrumbs: BreadcrumbItem[] = [{ title: "Overview" }];

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to ProTrac
            </h1>
            <p className="text-muted-foreground">
              Production tracking system for Humana Apparels Pvt. Ltd.
            </p>
          </div>

          {/* Stats Overview */}
          <OverviewStats />

          {/* Daily Targets Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DailyTargetsCard />
          </div>

        </div>
      </AppContent>
    </div>
  );
}

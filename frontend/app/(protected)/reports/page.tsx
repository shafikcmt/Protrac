"use client";

import Link from "next/link";
import { BarChart3, TrendingUp, FileText } from "lucide-react";

import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const reportsMeta: Record<string, { description: string; icon: any }> = {
  "sewing-dashboard": {
    description:
      "Comprehensive sewing production analytics with line performance, QC metrics, and assembly parts tracking",
    icon: BarChart3,
  },
  "daily-production": {
    description:
      "Daily production efficiency report showing detailed metrics for all production lines including parts, assembly, and quality control",
    icon: FileText,
  },
};

const reportsItems = [
  {
    title: "Sewing Dashboard",
    url: "/reports/sewing-dashboard",
  },
  {
    title: "Daily Production Report",
    url: "/reports/daily-production",
  },
];

export default function ReportsPage() {
  const breadcrumbs: BreadcrumbItem[] = [{ title: "Reports" }];

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent className="flex-1 overflow-y-auto py-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reportsItems.map((item) => {
            const slug = item.url.split("/").pop() || "";
            const meta = reportsMeta[slug];
            const Icon = meta?.icon;

            return (
              <Link
                key={item.url}
                href={item.url}>
                <Card className="h-full from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 border-2 hover:border-primary/20">
                  <CardHeader className="pb-4 h-full flex flex-col">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {Icon && <Icon className="h-5 w-5 text-primary" />}
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm line-clamp-3 flex-1">
                      {meta?.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </AppContent>
    </div>
  );
}

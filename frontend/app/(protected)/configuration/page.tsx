"use client";

import Link from "next/link";
import {
  Users,
  Calendar,
  Ruler,
  Palette,
  AlertTriangle,
  Factory,
  Scissors,
  Layers,
} from "lucide-react";

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
import { navigation } from "@/lib/navigation";

const configurationMeta: Record<string, { description: string; icon: any }> = {
  buyers: {
    description: "Manage buyer information",
    icon: Users,
  },
  seasons: {
    description: "Configure season collections",
    icon: Calendar,
  },
  sizes: {
    description: "Set up size charts and measurements",
    icon: Ruler,
  },
  colors: {
    description: "Define color palettes and variants",
    icon: Palette,
  },
  defects: {
    description: "Configure quality control defect types",
    icon: AlertTriangle,
  },
  lines: {
    description: "Manage production lines and workflows",
    icon: Factory,
  },  "cut-parts": {
    description: "Define garment parts and specifications",
    icon: Scissors,
  },
  spreads: {
    description: "Manage cutting spreads and fabric layouts",
    icon: Layers,
  },
};

export default function ConfigurationPage() {
  const breadcrumbs: BreadcrumbItem[] = [{ title: "Configuration" }];

  // Get configuration items from navigation
  const configurationNav = navigation.find(
    (item) => item.title === "Configuration"
  );
  const configurationItems = configurationNav?.items || [];

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent className="flex-1 overflow-y-auto py-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {configurationItems.map((item) => {
            const slug = item.url.split("/").pop() || "";
            const meta = configurationMeta[slug];
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

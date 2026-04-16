"use client";

import Link from "next/link";
import {
  Package,
  PaintRoller,
  Tags,
  BookOpenText,
  Settings2,
  ArrowRight,
  BarChart3,
  QrCode,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickActionItems = [
  {
    title: "Styles",
    description: "Manage garment styles and specifications",
    href: "/styles",
    icon: PaintRoller,
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-100 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Orders",
    description: "View and manage production orders",
    href: "/orders",
    icon: Package,
    gradient: "from-green-500/10 to-green-600/5",
    iconBg: "bg-green-100 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    title: "Bundles",
    description: "Track bundle progress and status",
    href: "/bundles",
    icon: Tags,
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-purple-100 dark:bg-purple-900/20",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Line Targets",
    description: "Set daily production targets for lines",
    href: "/configuration/line-targets",
    icon: Target,
    gradient: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-100 dark:bg-amber-900/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Reports",
    description: "View analytics and dashboard reports",
    href: "/reports",
    icon: BookOpenText,
    gradient: "from-orange-500/10 to-orange-600/5",
    iconBg: "bg-orange-100 dark:bg-orange-900/20",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  {
    title: "Configuration",
    description: "System settings and configuration",
    href: "/configuration",
    icon: Settings2,
    gradient: "from-gray-500/10 to-gray-600/5",
    iconBg: "bg-gray-100 dark:bg-gray-900/20",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
];

export function QuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Quick Actions
          </h2>
          <p className="text-muted-foreground">
            Navigate to key sections of the application
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {quickActionItems.map((item) => (
          <Card
            key={item.href}
            className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md bg-gradient-to-br ${item.gradient} border-0`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${item.iconBg}`}>
                  <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start p-0 h-auto font-medium text-sm hover:bg-transparent">
                <Link href={item.href}>Go to {item.title}</Link>
              </Button>
            </CardContent>
            <Link
              href={item.href}
              className="absolute inset-0 z-10"
              aria-label={`Go to ${item.title}`}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}

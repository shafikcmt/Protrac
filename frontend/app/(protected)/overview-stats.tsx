"use client";

import {
  Package,
  PaintRoller,
  Tags,
  TrendingUp,
  Activity,
  Loader,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOverviewStats } from "@/hooks/api";

export function OverviewStats() {
  const { orders, styles, bundles, isLoading, error } = useOverviewStats();

  if (error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-t from-destructive/5 to-card col-span-full">
          <CardHeader>
            <CardDescription>Error loading statistics</CardDescription>
            <CardTitle className="text-lg text-destructive">
              Unable to fetch data
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Orders */}
      <Card className="bg-gradient-to-t from-primary/5 to-card">
        <CardHeader>
          <CardDescription>Total Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {isLoading ? (
              <Loader className="h-6 w-6 animate-spin" />
            ) : (
              orders?.total.toLocaleString() ?? "0"
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <Package className="h-4 w-4 mr-1" />
              All Orders
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Styles */}
      <Card className="bg-gradient-to-t from-primary/5 to-card">
        <CardHeader>
          <CardDescription>Total Styles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {isLoading ? (
              <Loader className="h-6 w-6 animate-spin" />
            ) : (
              styles?.total.toLocaleString() ?? "0"
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <PaintRoller className="h-4 w-4 mr-1" />
              Designs
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Bundles */}
      <Card className="bg-gradient-to-t from-primary/5 to-card">
        <CardHeader>
          <CardDescription>Total Bundles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {isLoading ? (
              <Loader className="h-6 w-6 animate-spin" />
            ) : (
              bundles?.total.toLocaleString() ?? "0"
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <Tags className="h-4 w-4 mr-1" />
              {isLoading
                ? "Loading..."
                : `${bundles?.completed.toLocaleString() ?? "0"} Done`}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Completion Rate */}
      <Card className="bg-gradient-to-t from-primary/5 to-card">
        <CardHeader>
          <CardDescription>Completion Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {isLoading ? (
              <Loader className="h-6 w-6 animate-spin" />
            ) : (
              `${bundles?.completionRate.toFixed(1) ?? "0.0"}%`
            )}
          </CardTitle>
          <CardAction>
            {isLoading ? (
              <Badge variant="secondary">
                <Activity className="h-4 w-4 mr-1" />
                Loading...
              </Badge>
            ) : (
              <Badge
                variant={
                  (bundles?.completionRate ?? 0) >= 85
                    ? "default"
                    : "destructive"
                }>
                {(bundles?.completionRate ?? 0) >= 85 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <Activity className="h-4 w-4 mr-1" />
                )}
                {(bundles?.completionRate ?? 0) >= 85 ? "On Track" : "Behind"}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

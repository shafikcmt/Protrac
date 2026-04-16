"use client";

import Link from "next/link";
import { Target, Plus, AlertTriangle, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayLineTargets } from "@/hooks/api/use-today-line-targets";

export function DailyTargetsCard() {
  const {
    linesWithTargets,
    totalLines,
    totalTargetQuantity,
    missingTargets,
    isLoading,
    error,
  } = useTodayLineTargets();

  if (error) {
    return (
      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Daily Line Targets
          </CardTitle>
          <CardDescription>Error loading today's line targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Unable to load target data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Daily Line Targets
          </CardTitle>
          <CardDescription>Loading today's line targets...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  const completionPercentage =
    totalLines > 0 ? (linesWithTargets / totalLines) * 100 : 0;
  const hasAllTargets = linesWithTargets === totalLines;
  const hasMissingTargets = missingTargets > 0;

  return (
    <Card className="col-span-full md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Daily Line Targets
            </CardTitle>
            <CardDescription>
              Today's production targets for all lines
            </CardDescription>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm">
            <Link href="/configuration/line-targets">
              Manage
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {linesWithTargets}/{totalLines}
            </div>
            <div className="text-sm text-muted-foreground">
              lines with targets set
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">
              {totalTargetQuantity.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              total target units
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Target Setup Progress</span>
            <span className="text-sm text-muted-foreground">
              {completionPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={completionPercentage}
            className="h-2"
          />
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {hasAllTargets ? (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 border-green-200">
              <Target className="mr-1 h-3 w-3" />
              All targets set
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {missingTargets} missing targets
            </Badge>
          )}

          {totalTargetQuantity > 0 && (
            <Badge variant="secondary">
              {totalTargetQuantity.toLocaleString()} units planned
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        {hasMissingTargets && (
          <div className="pt-2 border-t">
            <Button
              asChild
              size="sm"
              className="w-full">
              <Link href="/configuration/line-targets">
                <Plus className="mr-2 h-4 w-4" />
                Set Missing Targets
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

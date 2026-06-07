"use client";

import { useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Target } from "lucide-react";
import { DataTable } from "@/components/table/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import { cn } from "@/lib/utils";
import { useLineTargets } from "./use-line-targets";
import { createLineTargetsTableConfig } from "./line-targets-table-config";
import { LineTargetForm } from "./line-target-form";
import { LineTargetDeleteDialog } from "./line-target-delete-dialog";
import { BulkLineTargetForm } from "./bulk-line-target-form";
import { schemas } from "@/types/api/client";

type LineTarget = z.infer<typeof schemas.LineTarget>;
type LineTargetRequest = z.infer<typeof schemas.LineTargetRequest>;

export default function LineTargetsPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Line Targets" },
  ];

  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedLine, setSelectedLine] = useState<number>();

  const {
    lineTargets,
    productionLines,
    totalCount,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkUpserting,
    createLineTarget,
    updateLineTarget,
    deleteLineTarget,
    deleteLineTargets,
    bulkUpsertLineTargets,
  } = useLineTargets({
    date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    line: selectedLine,
    onSuccess: () => {
      setFormOpen(false);
      setDeleteDialogOpen(false);
    },
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLineTarget, setSelectedLineTarget] =
    useState<LineTarget | null>(null);
  const [selectedLineTargets, setSelectedLineTargets] = useState<LineTarget[]>(
    []
  );

  // Action handlers
  const handleCreateLineTarget = () => {
    setSelectedLineTarget(null);
    setFormOpen(true);
  };

  const handleEditLineTarget = (lineTarget: LineTarget) => {
    setSelectedLineTarget(lineTarget);
    setFormOpen(true);
  };

  const handleDeleteLineTarget = (lineTarget: LineTarget) => {
    setSelectedLineTarget(lineTarget);
    setSelectedLineTargets([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteLineTargets = (lineTargets: LineTarget[]) => {
    setSelectedLineTargets(lineTargets);
    setSelectedLineTarget(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: LineTargetRequest) => {
    if (selectedLineTarget) {
      updateLineTarget(selectedLineTarget.id, data);
    } else {
      createLineTarget(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedLineTargets.length > 0) {
      const ids = selectedLineTargets.map((target) => target.id);
      deleteLineTargets(ids);
    } else if (selectedLineTarget) {
      deleteLineTarget(selectedLineTarget.id);
    }
  };

  // Create table configuration
  const tableConfig = createLineTargetsTableConfig(
    handleCreateLineTarget,
    handleEditLineTarget,
    handleDeleteLineTarget,
    handleBulkDeleteLineTargets
  );

  // Calculate stats for today's targets
  const todayTargets = lineTargets.filter(
    (target) => target.date === format(new Date(), "yyyy-MM-dd")
  );
  const totalTodayTarget = todayTargets.reduce(
    (sum, target) => sum + target.target_quantity,
    0
  );
  const avgWorkHours =
    todayTargets.length > 0
      ? todayTargets.reduce(
          (sum, target) => sum + (target.work_hours || 0),
          0
        ) / todayTargets.length
      : 0;

  if (isLoading) {
    return (
      <div className="flex h-[100svh] flex-col overflow-hidden">
        <AppHeader breadcrumbs={breadcrumbs} />
        <AppContent className="flex-1 overflow-y-auto py-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-24 w-full"
                />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-12 w-full"
                />
              ))}
            </div>
          </div>
        </AppContent>
      </div>
    );
  }

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent className="flex-1 overflow-y-auto py-2">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today's Targets
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayTargets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {todayTargets.length === 1 ? "line set" : "lines set"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Target Quantity
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalTodayTarget.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">units for today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Work Hours
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgWorkHours > 0 ? avgWorkHours.toFixed(1) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">hours per line</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "PPP")
                    : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {selectedDate && (
              <Button
                variant="ghost"
                onClick={() => setSelectedDate(undefined)}
                className="text-muted-foreground">
                Clear date filter
              </Button>
            )}
          </div>

          {/* Bulk Line Target Form */}
          <BulkLineTargetForm
            sewingLines={productionLines}
            existingTargets={lineTargets}
            onSave={bulkUpsertLineTargets}
            isSaving={isBulkUpserting}
          />

          {/* Data Table */}
          <DataTable
            columns={tableConfig.columns}
            data={lineTargets}
            config={tableConfig}
          />
        </div>

        <LineTargetForm
          open={formOpen}
          onOpenChange={setFormOpen}
          lineTarget={selectedLineTarget}
          productionLines={productionLines}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <LineTargetDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          lineTarget={selectedLineTarget}
          lineTargets={selectedLineTargets}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

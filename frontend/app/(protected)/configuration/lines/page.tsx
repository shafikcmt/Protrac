"use client";

import { useState } from "react";
import { z } from "zod";
import { DataTable } from "@/components/table/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import { useLines } from "./use-lines";
import { createLinesTableConfig } from "./lines-table-config";
import { LineForm } from "./line-form";
import { LineDeleteDialog } from "./line-delete-dialog";
import { schemas } from "@/types/api/client";

type Line = z.infer<typeof schemas.ProductionLine>;
type LineRequest = z.infer<typeof schemas.ProductionLineRequest>;

export default function LinesPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Lines" },
  ];

  const {
    lines,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createLine,
    updateLine,
    deleteLine,
    deleteLines,
  } = useLines(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [selectedLines, setSelectedLines] = useState<Line[]>([]);

  // Action handlers
  const handleCreateLine = () => {
    setSelectedLine(null);
    setFormOpen(true);
  };

  const handleEditLine = (line: Line) => {
    setSelectedLine(line);
    setFormOpen(true);
  };

  const handleDeleteLine = (line: Line) => {
    setSelectedLine(line);
    setSelectedLines([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteLines = (lines: Line[]) => {
    setSelectedLines(lines);
    setSelectedLine(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: LineRequest) => {
    if (selectedLine) {
      updateLine(selectedLine.id, data);
    } else {
      createLine(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedLines.length > 0) {
      const ids = selectedLines.map((line) => line.id);
      deleteLines(ids);
    } else if (selectedLine) {
      deleteLine(selectedLine.id);
    }
  };

  // Create table configuration
  const tableConfig = createLinesTableConfig(
    handleCreateLine,
    handleEditLine,
    handleDeleteLine,
    handleBulkDeleteLines
  );

  if (isLoading) {
    return (
      <div className="flex h-[100svh] flex-col overflow-hidden">
        <AppHeader breadcrumbs={breadcrumbs} />
        <AppContent className="flex-1 overflow-y-auto py-2">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 w-full"
              />
            ))}
          </div>
        </AppContent>
      </div>
    );
  }

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
      <AppHeader breadcrumbs={breadcrumbs} />
      <AppContent className="flex-1 overflow-y-auto py-2">
        <DataTable
          columns={tableConfig.columns}
          data={lines}
          config={tableConfig}
        />

        <LineForm
          open={formOpen}
          onOpenChange={setFormOpen}
          line={selectedLine}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <LineDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          line={selectedLine}
          lines={selectedLines}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

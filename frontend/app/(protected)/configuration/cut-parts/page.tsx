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
import { useCutParts } from "./use-cut-parts";
import { createCutPartsTableConfig } from "./cut-parts-table-config";
import { CutPartForm } from "./cut-part-form";
import { CutPartDeleteDialog } from "./cut-part-delete-dialog";
import { schemas } from "@/types/api/client";

type CutPart = z.infer<typeof schemas.Part>;
type CutPartRequest = z.infer<typeof schemas.PartRequest>;

export default function CutPartsPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Cut Parts" },
  ];

  const {
    cutParts,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createCutPart,
    updateCutPart,
    deleteCutPart,
    deleteCutParts,
  } = useCutParts(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCutPart, setSelectedCutPart] = useState<CutPart | null>(null);
  const [selectedCutParts, setSelectedCutParts] = useState<CutPart[]>([]);

  // Action handlers
  const handleCreateCutPart = () => {
    setSelectedCutPart(null);
    setFormOpen(true);
  };

  const handleEditCutPart = (cutPart: CutPart) => {
    setSelectedCutPart(cutPart);
    setFormOpen(true);
  };

  const handleDeleteCutPart = (cutPart: CutPart) => {
    setSelectedCutPart(cutPart);
    setSelectedCutParts([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteCutParts = (cutParts: CutPart[]) => {
    setSelectedCutParts(cutParts);
    setSelectedCutPart(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: CutPartRequest) => {
    if (selectedCutPart) {
      updateCutPart(selectedCutPart.id, data);
    } else {
      createCutPart(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedCutParts.length > 0) {
      const ids = selectedCutParts.map((cutPart) => cutPart.id);
      deleteCutParts(ids);
    } else if (selectedCutPart) {
      deleteCutPart(selectedCutPart.id);
    }
  };

  // Create table configuration
  const tableConfig = createCutPartsTableConfig(
    handleCreateCutPart,
    handleEditCutPart,
    handleDeleteCutPart,
    handleBulkDeleteCutParts
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
          data={cutParts}
          config={tableConfig}
        />

        <CutPartForm
          open={formOpen}
          onOpenChange={setFormOpen}
          cutPart={selectedCutPart}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <CutPartDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          cutPart={selectedCutPart}
          cutParts={selectedCutParts}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

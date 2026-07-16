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
import { useDefects } from "./use-defects";
import { createDefectsTableConfig } from "./defects-table-config";
import { DefectForm } from "./defect-form";
import { DefectDeleteDialog } from "./defect-delete-dialog";
import { schemas } from "@/types/api/client";

type Defect = z.infer<typeof schemas.Defect>;
type DefectRequest = z.infer<typeof schemas.DefectRequest>;

export default function DefectsPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Defects" },
  ];

  const {
    defects,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createDefect,
    updateDefect,
    deleteDefect,
    deleteDefects,
  } = useDefects(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [selectedDefects, setSelectedDefects] = useState<Defect[]>([]);

  // Action handlers
  const handleCreateDefect = () => {
    setSelectedDefect(null);
    setFormOpen(true);
  };

  const handleEditDefect = (defect: Defect) => {
    setSelectedDefect(defect);
    setFormOpen(true);
  };

  const handleDeleteDefect = (defect: Defect) => {
    setSelectedDefect(defect);
    setSelectedDefects([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteDefects = (defects: Defect[]) => {
    setSelectedDefects(defects);
    setSelectedDefect(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: DefectRequest) => {
    if (selectedDefect) {
      updateDefect(selectedDefect.id, data);
    } else {
      createDefect(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedDefects.length > 0) {
      const ids = selectedDefects.map((defect) => defect.id);
      deleteDefects(ids);
    } else if (selectedDefect) {
      deleteDefect(selectedDefect.id);
    }
  };

  // Create table configuration
  const tableConfig = createDefectsTableConfig(
    handleCreateDefect,
    handleEditDefect,
    handleDeleteDefect,
    handleBulkDeleteDefects
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
          data={defects}
          config={tableConfig}
        />

        <DefectForm
          open={formOpen}
          onOpenChange={setFormOpen}
          defect={selectedDefect}
          existingDefects={defects}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <DefectDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          defect={selectedDefect}
          defects={selectedDefects}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

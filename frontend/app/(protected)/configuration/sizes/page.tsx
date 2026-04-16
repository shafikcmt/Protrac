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
import { useSizes } from "./use-sizes";
import { createSizesTableConfig } from "./sizes-table-config";
import { SizeForm } from "./size-form";
import { SizeDeleteDialog } from "./size-delete-dialog";
import { schemas } from "@/types/api/client";

type Size = z.infer<typeof schemas.Size>;
type SizeRequest = z.infer<typeof schemas.SizeRequest>;

export default function SizesPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Sizes" },
  ];

  const {
    sizes,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createSize,
    updateSize,
    deleteSize,
    deleteSizes,
  } = useSizes(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Size[]>([]);

  // Action handlers
  const handleCreateSize = () => {
    setSelectedSize(null);
    setFormOpen(true);
  };

  const handleEditSize = (size: Size) => {
    setSelectedSize(size);
    setFormOpen(true);
  };

  const handleDeleteSize = (size: Size) => {
    setSelectedSize(size);
    setSelectedSizes([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteSizes = (sizes: Size[]) => {
    setSelectedSizes(sizes);
    setSelectedSize(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: SizeRequest) => {
    if (selectedSize) {
      updateSize(selectedSize.id, data);
    } else {
      createSize(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSizes.length > 0) {
      const ids = selectedSizes.map((size) => size.id);
      deleteSizes(ids);
    } else if (selectedSize) {
      deleteSize(selectedSize.id);
    }
  };

  // Create table configuration
  const tableConfig = createSizesTableConfig(
    handleCreateSize,
    handleEditSize,
    handleDeleteSize,
    handleBulkDeleteSizes
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
          data={sizes}
          config={tableConfig}
        />

        <SizeForm
          open={formOpen}
          onOpenChange={setFormOpen}
          size={selectedSize}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <SizeDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          size={selectedSize}
          sizes={selectedSizes}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

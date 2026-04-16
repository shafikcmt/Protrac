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
import { useColors } from "./use-colors";
import { createColorsTableConfig } from "./colors-table-config";
import { ColorForm } from "./color-form";
import { ColorDeleteDialog } from "./color-delete-dialog";
import { schemas } from "@/types/api/client";

type Color = z.infer<typeof schemas.Color>;
type ColorRequest = z.infer<typeof schemas.ColorRequest>;

export default function ColorsPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Colors" },
  ];

  const {
    colors,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createColor,
    updateColor,
    deleteColor,
    deleteColors,
  } = useColors(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedColors, setSelectedColors] = useState<Color[]>([]);

  // Action handlers
  const handleCreateColor = () => {
    setSelectedColor(null);
    setFormOpen(true);
  };

  const handleEditColor = (color: Color) => {
    setSelectedColor(color);
    setFormOpen(true);
  };

  const handleDeleteColor = (color: Color) => {
    setSelectedColor(color);
    setSelectedColors([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteColors = (colors: Color[]) => {
    setSelectedColors(colors);
    setSelectedColor(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: ColorRequest) => {
    if (selectedColor) {
      updateColor(selectedColor.id, data);
    } else {
      createColor(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedColors.length > 0) {
      const ids = selectedColors.map((color) => color.id);
      deleteColors(ids);
    } else if (selectedColor) {
      deleteColor(selectedColor.id);
    }
  };

  // Create table configuration
  const tableConfig = createColorsTableConfig(
    handleCreateColor,
    handleEditColor,
    handleDeleteColor,
    handleBulkDeleteColors
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
          data={colors}
          config={tableConfig}
        />

        <ColorForm
          open={formOpen}
          onOpenChange={setFormOpen}
          color={selectedColor}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <ColorDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          color={selectedColor}
          colors={selectedColors}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

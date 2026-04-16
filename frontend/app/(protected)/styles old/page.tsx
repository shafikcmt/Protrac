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
import { useStyles } from "./use-styles";
import { createStylesTableConfig } from "./styles-table-config";
import { StyleForm } from "./style-form";
import { StyleDeleteDialog } from "./style-delete-dialog";
import { schemas } from "@/types/api/client";

type Style = z.infer<typeof schemas.StyleWithParts>;
type StyleRequest = z.infer<typeof schemas.StyleWithPartsRequest>;

export default function StylesPage() {
  const breadcrumbs: BreadcrumbItem[] = [{ title: "Styles" }];

  const {
    styles,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createStyle,
    updateStyle,
    deleteStyle,
    deleteStyles,
  } = useStyles(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<Style[]>([]);

  // Action handlers
  const handleCreateStyle = () => {
    setSelectedStyle(null);
    setFormOpen(true);
  };

  const handleEditStyle = (style: Style) => {
    setSelectedStyle(style);
    setFormOpen(true);
  };

  const handleDeleteStyle = (style: Style) => {
    setSelectedStyle(style);
    setSelectedStyles([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteStyles = (styles: Style[]) => {
    setSelectedStyles(styles);
    setSelectedStyle(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: StyleRequest) => {
    if (selectedStyle) {
      updateStyle(selectedStyle.id, data);
    } else {
      createStyle(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedStyles.length > 0) {
      const ids = selectedStyles.map((style) => style.id);
      deleteStyles(ids);
    } else if (selectedStyle) {
      deleteStyle(selectedStyle.id);
    }
  };

  // Create table configuration
  const tableConfig = createStylesTableConfig(
    handleCreateStyle,
    handleEditStyle,
    handleDeleteStyle,
    handleBulkDeleteStyles
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
          data={styles}
          config={tableConfig}
        />

        <StyleForm
          open={formOpen}
          onOpenChange={setFormOpen}
          style={selectedStyle}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <StyleDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          style={selectedStyle}
          styles={selectedStyles}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

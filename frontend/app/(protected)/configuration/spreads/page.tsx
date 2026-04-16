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
import { useSpreads } from "./use-spreads";
import { createSpreadsTableConfig } from "./spreads-table-config";
import { SpreadForm } from "./spread-form";
import { SpreadDeleteDialog } from "./spread-delete-dialog";
import { schemas } from "@/types/api/client";

type Spread = z.infer<typeof schemas.Spread>;
type SpreadRequest = z.infer<typeof schemas.SpreadRequest>;

export default function SpreadsPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Spreads" },
  ];

  const {
    spreads,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createSpread,
    updateSpread,
    deleteSpread,
    deleteSpreads,
  } = useSpreads(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [selectedSpreads, setSelectedSpreads] = useState<Spread[]>([]);

  // Action handlers
  const handleCreateSpread = () => {
    setSelectedSpread(null);
    setFormOpen(true);
  };

  const handleEditSpread = (spread: Spread) => {
    setSelectedSpread(spread);
    setFormOpen(true);
  };

  const handleDeleteSpread = (spread: Spread) => {
    setSelectedSpread(spread);
    setSelectedSpreads([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteSpreads = (spreads: Spread[]) => {
    setSelectedSpreads(spreads);
    setSelectedSpread(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: SpreadRequest) => {
    if (selectedSpread) {
      updateSpread(selectedSpread.id, data);
    } else {
      createSpread(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSpreads.length > 0) {
      const ids = selectedSpreads.map((spread) => spread.id);
      deleteSpreads(ids);
    } else if (selectedSpread) {
      deleteSpread(selectedSpread.id);
    }
    setDeleteDialogOpen(false);
    setSelectedSpread(null);
    setSelectedSpreads([]);
  };

  // Create table configuration
  const tableConfig = createSpreadsTableConfig(
    handleCreateSpread,
    handleEditSpread,
    handleDeleteSpread,
    handleBulkDeleteSpreads
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
          data={spreads}
          config={tableConfig}
        />

        <SpreadForm
          open={formOpen}
          onOpenChange={setFormOpen}
          spread={selectedSpread}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <SpreadDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          spread={selectedSpread}
          spreads={selectedSpreads}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

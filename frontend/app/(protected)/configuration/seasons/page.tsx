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
import { useSeasons } from "./use-seasons";
import { createSeasonsTableConfig } from "./seasons-table-config";
import { SeasonForm } from "./season-form";
import { SeasonDeleteDialog } from "./season-delete-dialog";
import { schemas } from "@/types/api/client";

type Season = z.infer<typeof schemas.Season>;
type SeasonRequest = z.infer<typeof schemas.SeasonRequest>;

export default function SeasonsPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Seasons" },
  ];

  const {
    seasons,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createSeason,
    updateSeason,
    deleteSeason,
    deleteSeasons,
  } = useSeasons(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);

  // Action handlers
  const handleCreateSeason = () => {
    setSelectedSeason(null);
    setFormOpen(true);
  };

  const handleEditSeason = (season: Season) => {
    setSelectedSeason(season);
    setFormOpen(true);
  };

  const handleDeleteSeason = (season: Season) => {
    setSelectedSeason(season);
    setSelectedSeasons([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteSeasons = (seasons: Season[]) => {
    setSelectedSeasons(seasons);
    setSelectedSeason(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: SeasonRequest) => {
    if (selectedSeason) {
      updateSeason(selectedSeason.id, data);
    } else {
      createSeason(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSeasons.length > 0) {
      const ids = selectedSeasons.map((season) => season.id);
      deleteSeasons(ids);
    } else if (selectedSeason) {
      deleteSeason(selectedSeason.id);
    }
  };

  // Create table configuration
  const tableConfig = createSeasonsTableConfig(
    handleCreateSeason,
    handleEditSeason,
    handleDeleteSeason,
    handleBulkDeleteSeasons
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
          data={seasons}
          config={tableConfig}
        />

        <SeasonForm
          open={formOpen}
          onOpenChange={setFormOpen}
          season={selectedSeason}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <SeasonDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          season={selectedSeason}
          seasons={selectedSeasons}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

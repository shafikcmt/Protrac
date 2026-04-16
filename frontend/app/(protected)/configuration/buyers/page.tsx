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
import { useBuyers } from "./use-buyers";
import { createBuyersTableConfig } from "./buyers-table-config";
import { BuyerForm } from "./buyer-form";
import { BuyerDeleteDialog } from "./buyer-delete-dialog";
import { schemas } from "@/types/api/client";

type Buyer = z.infer<typeof schemas.Buyer>;
type BuyerRequest = z.infer<typeof schemas.BuyerRequest>;

export default function BuyersPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Configuration", url: "/configuration" },
    { title: "Buyers" },
  ];

  const {
    buyers,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createBuyer,
    updateBuyer,
    deleteBuyer,
    deleteBuyers,
  } = useBuyers(() => {
    setFormOpen(false);
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [selectedBuyers, setSelectedBuyers] = useState<Buyer[]>([]);

  // Action handlers
  const handleCreateBuyer = () => {
    setSelectedBuyer(null);
    setFormOpen(true);
  };

  const handleEditBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setFormOpen(true);
  };

  const handleDeleteBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setSelectedBuyers([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteBuyers = (buyers: Buyer[]) => {
    setSelectedBuyers(buyers);
    setSelectedBuyer(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: BuyerRequest) => {
    if (selectedBuyer) {
      updateBuyer(selectedBuyer.id, data);
    } else {
      createBuyer(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedBuyers.length > 0) {
      const ids = selectedBuyers.map((buyer) => buyer.id);
      deleteBuyers(ids);
    } else if (selectedBuyer) {
      deleteBuyer(selectedBuyer.id);
    }
  };
  // Create table configuration
  const tableConfig = createBuyersTableConfig(
    handleCreateBuyer,
    handleEditBuyer,
    handleDeleteBuyer,
    handleBulkDeleteBuyers
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
          data={buyers}
          config={tableConfig}
        />

        <BuyerForm
          open={formOpen}
          onOpenChange={setFormOpen}
          buyer={selectedBuyer}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <BuyerDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          buyer={selectedBuyer}
          buyers={selectedBuyers}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}

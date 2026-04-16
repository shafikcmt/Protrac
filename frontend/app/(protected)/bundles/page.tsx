"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { ArrowLeftRight, Box, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppHeader,
  AppContent,
  type BreadcrumbItem,
} from "@/components/app/app-layout";
import { useBundles } from "./use-bundles";
import { createBundlesTableConfig } from "./bundles-table-config";
import { BundleForm } from "./bundle-form";
import { BundleDeleteDialog } from "./bundle-delete-dialog";
import { LabelPrintDialog } from "@/components/tracking/label-print-dialog";
import { OrderSelectionDialog } from "./order-selection-dialog";
import { SpreadSelectionDialog } from "./spread-selection-dialog";
import { useSelectedOrderStore } from "@/store/selected-order";
import { useSelectedSpreadStore } from "@/store/selected-spread";
import { schemas } from "@/types/api/client";

type Bundle = z.infer<typeof schemas.Bundle>;
type BulkBundleCreateRequest = z.infer<typeof schemas.BulkBundleCreateRequest>;
type Order = z.infer<typeof schemas.Order>;
type Spread = z.infer<typeof schemas.Spread>;

export default function BundlesPage() {
  // Zustand stores
  const { selectedOrder, setSelectedOrder } = useSelectedOrderStore();
  const { selectedSpread, setSelectedSpread } = useSelectedSpreadStore();
  const searchParams = useSearchParams(); // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [spreadDialogOpen, setSpreadDialogOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [selectedBundles, setSelectedBundles] = useState<Bundle[]>([]);
  const [bundlesToPrint, setBundlesToPrint] = useState<Bundle[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Handle hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Check if viewing all bundles
  const isViewingAll = searchParams.get("view") === "all";
  // Open spread selection dialog on initial load if no spread is selected and not viewing all
  useEffect(() => {
    if (hydrated && !selectedSpread && !isViewingAll) {
      setSpreadDialogOpen(true);
    }
  }, [hydrated, selectedSpread, isViewingAll]); // Create breadcrumbs with selected order and spread details
  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: "Bundles",
      url: selectedOrder || selectedSpread ? "/bundles?view=all" : undefined,
    },
    ...(selectedSpread
      ? [
          {
            title: `Spread ${selectedSpread.number}`,
          },
        ]
      : []),
    ...(selectedOrder
      ? [
          {
            title: `${selectedOrder.order_number} • ${selectedOrder.style_name} • ${selectedOrder.season_name} • ${selectedOrder.size_name} • ${selectedOrder.color_name}`,
          },
        ]
      : []),
  ];

  const handleFormSuccess = () => {
    setFormOpen(false);
  };
  
const {
  bundles,
  isLoading,
  isBulkCreating,
  isDeleting,
  bulkCreateBundles,
  deleteBundle,
  deleteBundles,
  refreshBundles,
} = useBundles({
  orderId: isViewingAll ? undefined : selectedOrder?.id,
  spreadId: isViewingAll ? undefined : selectedSpread?.id,
});

  // Action handlers
  const handleCreateBundle = () => {
    setFormOpen(true);
  };

  const handleDeleteBundle = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setSelectedBundles([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteBundles = (bundles: Bundle[]) => {
    setSelectedBundles(bundles);
    setSelectedBundle(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (
    data: BulkBundleCreateRequest
  ): Promise<void> => {
    await bulkCreateBundles(data);
  };

  const handleDeleteConfirm = () => {
    if (selectedBundles.length > 0) {
      const ids = selectedBundles.map((bundle) => bundle.id);
      deleteBundles(ids);
    } else if (selectedBundle) {
      deleteBundle(selectedBundle.id);
    }
    setDeleteDialogOpen(false);
    setSelectedBundle(null);
    setSelectedBundles([]);
  }; // Order selection handlers
  const handleSelectOrder = (order: Order | null) => {
    setSelectedOrder(order);
    // Clear the view=all parameter when selecting an order
    if (isViewingAll) {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSkipOrderSelection = () => {
    setSelectedOrder(null);
  };

  // Spread selection handlers
  const handleSelectSpread = (spread: Spread | null) => {
    setSelectedSpread(spread);
    // Clear the view=all parameter when selecting a spread
    if (isViewingAll) {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSkipSpreadSelection = () => {
    setSelectedSpread(null);
  };

  // Print handler
  const handlePrintLabels = (bundles: Bundle[]) => {
    setBundlesToPrint(bundles);
    setPrintDialogOpen(true);
  };

  // Create table configuration
  const tableConfig = createBundlesTableConfig(
    handleCreateBundle,
    handleDeleteBundle,
    handleBulkDeleteBundles,
    handlePrintLabels,
    bundles
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
      <AppHeader breadcrumbs={breadcrumbs}>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOrderDialogOpen(true)}>
            {selectedOrder ? (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            ) : (
              <Box className="mr-2 h-4 w-4" />
            )}
            {selectedOrder ? "Change Order" : "Select Order"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSpreadDialogOpen(true)}>
            {selectedSpread ? (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            ) : (
              <Layers className="mr-2 h-4 w-4" />
            )}
            {selectedSpread ? "Change Spread" : "Select Spread"}
          </Button>
        </div>
      </AppHeader>
      <AppContent className="flex-1 overflow-y-auto py-2">
        <DataTable
          columns={tableConfig.columns}
          data={bundles}
          config={tableConfig}
        />
        <BundleForm
          open={formOpen}
          onOpenChangeAction={setFormOpen}
          onSubmitAction={handleFormSubmit}
          onAfterBulkSubmitAction={refreshBundles}
          isLoading={isBulkCreating}
        />{" "}
        <BundleDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          bundle={selectedBundle}
          bundles={selectedBundles}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
        <LabelPrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          selectedBundles={bundlesToPrint}
        />{" "}
        <OrderSelectionDialog
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
          onSelectOrder={handleSelectOrder}
          onSkip={handleSkipOrderSelection}
          selectedOrder={selectedOrder}
        />
        <SpreadSelectionDialog
          open={spreadDialogOpen}
          onOpenChange={setSpreadDialogOpen}
          onSelectSpread={handleSelectSpread}
          onSkip={handleSkipSpreadSelection}
          selectedSpread={selectedSpread}
        />
      </AppContent>
    </div>
  );
}

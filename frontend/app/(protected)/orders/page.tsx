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
import { useOrders } from "./use-orders";
import { createOrdersTableConfig } from "./orders-table-config";
import { OrderForm } from "./order-form";
import { OrderDeleteDialog } from "./order-delete-dialog";
import { schemas } from "@/types/api/client";

type Order = z.infer<typeof schemas.Order>;
type OrderRequest = z.infer<typeof schemas.OrderRequest>;

type OrderFormSubmitPayload =
  | { mode: "single"; data: OrderRequest }
  | { mode: "bulk"; data: OrderRequest[] };

export default function OrdersPage() {
  const breadcrumbs: BreadcrumbItem[] = [{ title: "Orders" }];

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedOrder(null);
  };

  const {
    orders,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createOrder,
    createOrdersBulk,
    updateOrder,
    deleteOrder,
    deleteOrders,
  } = useOrders(handleFormSuccess);

  const clearDeleteState = () => {
    setDeleteDialogOpen(false);
    setSelectedOrder(null);
    setSelectedOrders([]);
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setFormOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setFormOpen(true);
  };

  const handleDeleteOrder = (order: Order) => {
    setSelectedOrder(order);
    setSelectedOrders([]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteOrders = (orders: Order[]) => {
    setSelectedOrders(orders);
    setSelectedOrder(null);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (payload: OrderFormSubmitPayload) => {
    if (payload.mode === "bulk") {
      await createOrdersBulk(payload.data);
      return;
    }

    if (selectedOrder) {
      await updateOrder(selectedOrder.id, payload.data);
    } else {
      await createOrder(payload.data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedOrders.length > 0) {
      const ids = selectedOrders.map((order) => order.id);
      const ok = await deleteOrders(ids);
      if (ok) {
        clearDeleteState();
      }
      return;
    }

    if (selectedOrder) {
      const ok = await deleteOrder(selectedOrder.id);
      if (ok) {
        clearDeleteState();
      }
    }
  };

  const tableConfig = createOrdersTableConfig(
    handleCreateOrder,
    handleEditOrder,
    handleDeleteOrder,
    handleBulkDeleteOrders
  );

  if (isLoading) {
    return (
      <div className="flex h-[100svh] flex-col overflow-hidden">
        <AppHeader breadcrumbs={breadcrumbs} />
        <AppContent className="flex-1 overflow-y-auto py-2">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          data={orders}
          config={tableConfig}
        />

        <OrderForm
          open={formOpen}
          onOpenChange={setFormOpen}
          order={selectedOrder}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />

        <OrderDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setSelectedOrder(null);
              setSelectedOrders([]);
            }
          }}
          order={selectedOrder}
          orders={selectedOrders}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      </AppContent>
    </div>
  );
}
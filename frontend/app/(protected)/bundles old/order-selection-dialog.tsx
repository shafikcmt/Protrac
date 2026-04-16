"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type Order = z.infer<typeof schemas.Order>;

interface OrderSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOrder: (order: Order | null) => void;
  onSkip: () => void;
  selectedOrder?: Order | null;
}

export function OrderSelectionDialog({
  open,
  onOpenChange,
  onSelectOrder,
  onSkip,
  selectedOrder,
}: OrderSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch first page via react-query (keeps cache behaviour)
  const ordersQuery = apiHooks.useGet("/api/tracking/orders/", undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });

  // Local aggregated orders (multi-page)
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [fetchedAll, setFetchedAll] = useState(false);

  const loadAllPages = useCallback(async () => {
    if (!open || isLoadingAll || fetchedAll) return;
    // Only start once first page is in.
    if (!ordersQuery.data) return;
    try {
      setIsLoadingAll(true);
      const first = ordersQuery.data;
      let aggregated: Order[] = [...first.results];
      const total = first.count ?? aggregated.length;
      // Heuristic: stop after 10 pages to avoid excessive load (adjust if needed)
      let page = 2;
      const maxPages = 10;
      // Continue while we haven't gathered all & next pages likely exist
      while (aggregated.length < total && page <= maxPages) {
        try {
          const resp = await api.get("/api/tracking/orders/", {
            queries: { page },
          });
          aggregated = aggregated.concat(resp.results);
          // Break if fewer results returned than previous page size (end)
          if (!resp.results.length) break;
        } catch (e) {
          // Fail silently for quick fix; keep what we have
          break;
        }
        page += 1;
      }
      setAllOrders(aggregated);
      // Mark fetchedAll true if we likely reached end
      if (aggregated.length >= total) setFetchedAll(true);
    } finally {
      setIsLoadingAll(false);
    }
  }, [open, ordersQuery.data, isLoadingAll, fetchedAll]);

  // Trigger multi-page fetch when dialog opens and first page loaded
  useEffect(() => {
    loadAllPages();
  }, [loadAllPages]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setAllOrders([]);
      setIsLoadingAll(false);
      setFetchedAll(false);
    }
  }, [open]);

  const effectiveOrders = allOrders.length ? allOrders : ordersQuery.data?.results || [];

  // Filter orders based on search term
  const filteredOrders = effectiveOrders.filter(
    (order) =>
      searchTerm === "" ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.style_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.season_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.size_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.color_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleSelectOrder = (order: Order) => {
    onSelectOrder(order);
    onOpenChange(false);
  };

  const handleClear = () => {
    onSelectOrder(null);
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:min-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Select Order to Work With</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Current Selection - Compact Display */}
          {selectedOrder && (
            <div className="relative text-sm p-3 bg-muted/30 rounded-md border border-muted">
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 text-xs">
                Current
              </Badge>
              <div className="pr-16 space-y-1">
                <div className="font-medium">
                  {selectedOrder.order_number} • {selectedOrder.style_name} •{" "}
                  {selectedOrder.season_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedOrder.size_name} • {selectedOrder.color_name} •{" "}
                  {selectedOrder.quantity?.toLocaleString()} pcs
                </div>
              </div>
            </div>
          )}
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Orders List */}
          <ScrollArea className="h-64 w-full">
            {ordersQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-14 w-full"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`
                      p-2 rounded-md border cursor-pointer transition-colors hover:bg-accent/50
                      ${
                        selectedOrder?.id === order.id
                          ? "bg-accent border-primary"
                          : "border-transparent"
                      }
                    `}
                    onClick={() => handleSelectOrder(order)}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {order.order_number}
                        </span>
                        <span className="text-sm">
                          • {order.style_name} • {order.season_name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.size_name} • {order.color_name} •{" "}
                        {order.quantity?.toLocaleString()} pcs
                      </div>
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && !ordersQuery.isLoading && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No orders found matching your search.
                  </div>
                )}
                {isLoadingAll && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    Loading more orders...
                  </div>
                )}
                {!isLoadingAll && !fetchedAll && allOrders.length > 0 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    Showing partial list (quick load). Continue typing to search.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {selectedOrder && (
          <DialogFooter className="px-6 py-4 border-t">
            <Button
              variant="outline"
              onClick={handleClear}>
              Clear Selection
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

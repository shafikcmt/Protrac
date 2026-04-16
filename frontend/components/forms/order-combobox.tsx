"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type { z } from "zod";
import { schemas } from "@/types/api/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrders } from "@/app/(protected)/orders/use-orders";
import { api } from "@/lib/api";

type Order = z.infer<typeof schemas.Order>;

export interface OrderComboboxFilters {
  style?: number;
  size?: number;
  color?: number;
}

interface OrderComboboxProps {
  value?: number;
  onValueChangeAction: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filters?: OrderComboboxFilters;
}

export function OrderCombobox({
  value,
  onValueChangeAction,
  placeholder = "Select order...",
  disabled = false,
  className,
  filters,
}: OrderComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [remoteItems, setRemoteItems] = React.useState<Order[]>([]);
  const [isRemoteLoading, setIsRemoteLoading] = React.useState(false);

  const { orders } = useOrders();

  // Client-side filter on the locally available orders first
  const filteredLocal: Order[] = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((o) =>
      [
        o.order_number ?? "",
        o.style_name ?? "",
        o.buyer_name ?? "",
        o.season_name ?? "",
        o.size_name ?? "",
        o.color_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [orders, searchQuery]);

  // Debounced server search when local is exhausted
  React.useEffect(() => {
    let cancelled = false;

    const q = searchQuery.trim();
    const canSearchRemote = q.length >= 2 && filteredLocal.length === 0;

    if (!canSearchRemote) {
      setRemoteItems([]);
      setIsRemoteLoading(false);
      return;
    }

    setIsRemoteLoading(true);

    const handle = setTimeout(async () => {
      try {
        const queries: Record<string, any> = { search: q };
        if (filters?.style) queries.style = filters.style;
        if (filters?.size) queries.size = filters.size;
        if (filters?.color) queries.color = filters.color;

        const res = await api.tracking_orders_list({ queries });
        if (!cancelled) setRemoteItems(res.results ?? []);
      } catch (e) {
        if (!cancelled) setRemoteItems([]);
      } finally {
        if (!cancelled) setIsRemoteLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, filteredLocal, filters]);

  // Items to display: prefer local matches, else remote results when searching
  const items: Order[] = searchQuery
    ? filteredLocal.length > 0
      ? filteredLocal
      : remoteItems
    : orders;

  // Find selected order from any source we have
  const selectedOrder: Order | undefined = React.useMemo(() => {
    const combined = new Map<number, Order>();
    for (const o of orders) combined.set(o.id, o);
    for (const o of remoteItems) if (!combined.has(o.id)) combined.set(o.id, o);
    return value ? combined.get(value) : undefined;
  }, [orders, remoteItems, value]);

  const handleSelect = (orderId: number) => {
    onValueChangeAction(orderId === value ? 0 : orderId);
    setOpen(false);
  };

  return (
    <Popover
      modal
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {selectedOrder ? (
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="text-xs font-medium truncate">
                {selectedOrder.order_number}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-full">
                {selectedOrder.style_name} • {selectedOrder.size_name} •{" "}
                {selectedOrder.color_name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] max-w-[360px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search orders..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <CommandList className="max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
                {isRemoteLoading
                  ? "Searching server..."
                  : searchQuery
                  ? "No orders found."
                  : "No orders available."}
              </CommandEmpty>
            )}

            {items.length > 0 && (
              <CommandGroup>
                {items.map((order) => (
                  <CommandItem
                    key={order.id}
                    // ✅ IMPORTANT: text-based value so cmdk can match typing
                    value={`${order.order_number ?? ""} ${order.style_name ?? ""} ${order.buyer_name ?? ""} ${order.season_name ?? ""} ${order.size_name ?? ""} ${order.color_name ?? ""}`}
                    onSelect={() => handleSelect(order.id)}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === order.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {order.order_number}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {order.style_name} • {order.size_name} •{" "}
                        {order.color_name}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
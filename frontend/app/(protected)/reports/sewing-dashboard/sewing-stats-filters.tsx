"use client";

import { useState } from "react";
import { CalendarIcon, X, Factory, Package, Calendar } from "lucide-react";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiHooks } from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SewingStatsFiltersProps {
  filters: {
    production_line_id?: number;
    order_id?: number;
    date_from?: string;
    date_to?: string;
    active_only?: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

export function SewingStatsFilters({
  filters,
  onFiltersChange,
}: SewingStatsFiltersProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );

  // Get production lines for filter
  const { data: productionLines } = apiHooks.useGet(
    "/api/tracking/productionlines/"
  );

  // Get orders for filter with size and color info
  const { data: orders } = apiHooks.useGet("/api/tracking/orders/");

  const handleProductionLineChange = (value: string) => {
    onFiltersChange({
      ...filters,
      production_line_id: value === "all" ? undefined : parseInt(value),
    });
  };

  const handleOrderChange = (value: string) => {
    onFiltersChange({
      ...filters,
      order_id: value === "all" ? undefined : parseInt(value),
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({
      ...filters,
      date_from: date ? date.toISOString().split("T")[0] : undefined,
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({
      ...filters,
      date_to: date ? date.toISOString().split("T")[0] : undefined,
    });
  };

  const handleActiveOnlyChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      active_only: checked,
    });
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({
      active_only: true,
    });
  };

  // Count active filters (excluding active_only)
  const activeFiltersCount = Object.keys(filters).filter((key) => {
    if (key === "active_only") return false;
    return filters[key as keyof typeof filters] !== undefined;
  }).length;

  // Get selected production line name
  const selectedProductionLine = productionLines?.results?.find(
    (line: any) => line.id === filters.production_line_id
  );

  // Get selected order info
  const selectedOrder = orders?.results?.find(
    (order: any) => order.id === filters.order_id
  );

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border">
      {/* Production Line Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed">
            <Factory className="mr-2 h-4 w-4" />
            Production Line
            {filters.production_line_id && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 h-4"
                />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal">
                  {selectedProductionLine?.name ||
                    `Line ${filters.production_line_id}`}
                </Badge>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[250px] p-0"
          align="start">
          <Command>
            <CommandInput placeholder="Search production lines..." />
            <CommandList>
              <CommandEmpty>No production lines found.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={() => handleProductionLineChange("all")}>
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      !filters.production_line_id
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}>
                    {!filters.production_line_id && (
                      <span className="text-primary-foreground">✓</span>
                    )}
                  </div>
                  All Production Lines
                </CommandItem>
                {productionLines?.results
                  ?.filter((line: any) => line.line_type === "sewing")
                  .map((line: any) => {
                    const isSelected = filters.production_line_id === line.id;
                    return (
                      <CommandItem
                        key={line.id}
                        onSelect={() =>
                          handleProductionLineChange(line.id.toString())
                        }>
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {isSelected && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        {line.name}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Order Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed">
            <Package className="mr-2 h-4 w-4" />
            Order
            {filters.order_id && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 h-4"
                />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal">
                  {selectedOrder
                    ? `${selectedOrder.order_number} - ${selectedOrder.size_name} ${selectedOrder.color_name}`
                    : `Order ${filters.order_id}`}
                </Badge>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[350px] p-0"
          align="start">
          <Command>
            <CommandInput placeholder="Search orders..." />
            <CommandList>
              <CommandEmpty>No orders found.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={() => handleOrderChange("all")}>
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      !filters.order_id
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}>
                    {!filters.order_id && (
                      <span className="text-primary-foreground">✓</span>
                    )}
                  </div>
                  All Orders
                </CommandItem>
                {orders?.results?.map((order: any) => {
                  const isSelected = filters.order_id === order.id;
                  return (
                    <CommandItem
                      key={order.id}
                      onSelect={() => handleOrderChange(order.id.toString())}>
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}>
                        {isSelected && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {order.order_number} - {order.style_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.size_name} • {order.color_name} • Qty:{" "}
                          {order.quantity}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed">
            <Calendar className="mr-2 h-4 w-4" />
            From Date
            {dateFrom && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 h-4"
                />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal">
                  {format(dateFrom, "MMM dd")}
                </Badge>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={dateFrom}
            onSelect={handleDateFromChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed">
            <Calendar className="mr-2 h-4 w-4" />
            To Date
            {dateTo && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-2 h-4"
                />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal">
                  {format(dateTo, "MMM dd")}
                </Badge>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={dateTo}
            onSelect={handleDateToChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Active Only Toggle — div instead of Button to avoid button-in-button (Checkbox renders as <button>) */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "inline-flex items-center h-8 px-3 rounded-md text-sm font-medium border border-dashed cursor-pointer select-none transition-colors",
          "bg-background hover:bg-accent hover:text-accent-foreground",
          filters.active_only ? "bg-primary/10 border-primary/30" : "border-input"
        )}
        onClick={() => handleActiveOnlyChange(!filters.active_only)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActiveOnlyChange(!filters.active_only);
          }
        }}
      >
        <Checkbox
          checked={filters.active_only || false}
          className="mr-2 h-4 w-4 pointer-events-none"
        />
        Active Only
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="h-8 border-dashed text-muted-foreground hover:text-foreground">
          Clear
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

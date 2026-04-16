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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiHooks } from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface KioskFiltersDialogProps {
  children: React.ReactNode;
  filters?: {
    production_line_id?: number;
    production_line_ids?: number[];
    tv?: number; // new
    order_id?: number;
    order_ids?: number[];
    buyer_id?: number;
    buyer_ids?: number[];
    style_id?: number;
    style_ids?: number[];
    colors?: string[];
    sizes?: string[];
    date_from?: string;
    date_to?: string;
    active_only?: boolean;
  };
  onFiltersChange?: (filters: any) => void;
}

export function KioskFiltersDialog({
  children,
  filters = { active_only: true },
  onFiltersChange,
}: KioskFiltersDialogProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );

  // Get production lines (sewing only) for filter
  const { data: productionLines } = apiHooks.useGet(
    "/api/tracking/productionlines/"
  );

  // Get orders for filter with size and color info
  const { data: orders } = apiHooks.useGet("/api/tracking/orders/");

  // Get buyers for filter
  const { data: buyers } = apiHooks.useGet("/api/tracking/buyers/");

  // Get styles for filter
  const { data: styles } = apiHooks.useGet("/api/tracking/styles/");

  const handleProductionLineChange = (value: string) => {
    if (value === "all") {
      const newFilters = {
        ...localFilters,
        production_line_id: undefined,
        production_line_ids: undefined,
      };
      setLocalFilters(newFilters);
    } else {
      const lineId = parseInt(value);
      const currentIds = localFilters.production_line_ids || [];
      const newIds = currentIds.includes(lineId)
        ? currentIds.filter((id) => id !== lineId)
        : [...currentIds, lineId];

      const newFilters = {
        ...localFilters,
        production_line_id: undefined,
        production_line_ids: newIds.length > 0 ? newIds : undefined,
      };
      setLocalFilters(newFilters);
    }
  };

  const handleOrderChange = (value: string) => {
    if (value === "all") {
      const newFilters = {
        ...localFilters,
        order_id: undefined,
        order_ids: undefined,
      };
      setLocalFilters(newFilters);
    } else {
      const orderId = parseInt(value);
      const currentIds = localFilters.order_ids || [];
      const newIds = currentIds.includes(orderId)
        ? currentIds.filter((id) => id !== orderId)
        : [...currentIds, orderId];

      const newFilters = {
        ...localFilters,
        order_id: undefined,
        order_ids: newIds.length > 0 ? newIds : undefined,
      };
      setLocalFilters(newFilters);
    }
  };

  const handleBuyerChange = (value: string) => {
    if (value === "all") {
      const newFilters = {
        ...localFilters,
        buyer_id: undefined,
        buyer_ids: undefined,
      };
      setLocalFilters(newFilters);
    } else {
      const buyerId = parseInt(value);
      const currentIds = localFilters.buyer_ids || [];
      const newIds = currentIds.includes(buyerId)
        ? currentIds.filter((id) => id !== buyerId)
        : [...currentIds, buyerId];

      const newFilters = {
        ...localFilters,
        buyer_id: undefined,
        buyer_ids: newIds.length > 0 ? newIds : undefined,
      };
      setLocalFilters(newFilters);
    }
  };

  const handleStyleChange = (value: string) => {
    if (value === "all") {
      const newFilters = {
        ...localFilters,
        style_id: undefined,
        style_ids: undefined,
      };
      setLocalFilters(newFilters);
    } else {
      const styleId = parseInt(value);
      const currentIds = localFilters.style_ids || [];
      const newIds = currentIds.includes(styleId)
        ? currentIds.filter((id) => id !== styleId)
        : [...currentIds, styleId];

      const newFilters = {
        ...localFilters,
        style_id: undefined,
        style_ids: newIds.length > 0 ? newIds : undefined,
      };
      setLocalFilters(newFilters);
    }
  };

  const handleColorChange = (value: string) => {
    if (value === "all") {
      const newFilters = {
        ...localFilters,
        colors: undefined,
      };
      setLocalFilters(newFilters);
    } else {
      const currentColors = localFilters.colors || [];
      const newColors = currentColors.includes(value)
        ? currentColors.filter((color) => color !== value)
        : [...currentColors, value];

      const newFilters = {
        ...localFilters,
        colors: newColors.length > 0 ? newColors : undefined,
      };
      setLocalFilters(newFilters);
    }
  };

  const handleSizeChange = (value: string) => {
    if (value === "all") {
      const newFilters = {
        ...localFilters,
        sizes: undefined,
      };
      setLocalFilters(newFilters);
    } else {
      const currentSizes = localFilters.sizes || [];
      const newSizes = currentSizes.includes(value)
        ? currentSizes.filter((size) => size !== value)
        : [...currentSizes, value];

      const newFilters = {
        ...localFilters,
        sizes: newSizes.length > 0 ? newSizes : undefined,
      };
      setLocalFilters(newFilters);
    }
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    const newFilters = {
      ...localFilters,
      date_from: date ? date.toISOString().split("T")[0] : undefined,
    };
    setLocalFilters(newFilters);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    const newFilters = {
      ...localFilters,
      date_to: date ? date.toISOString().split("T")[0] : undefined,
    };
    setLocalFilters(newFilters);
  };

  const handleActiveOnlyChange = (checked: boolean) => {
    const newFilters = {
      ...localFilters,
      active_only: checked,
    };
    setLocalFilters(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { active_only: true };
    setLocalFilters(clearedFilters);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const applyFilters = () => {
    onFiltersChange?.(localFilters);
    setOpen(false);
  };

  // Count active filters (excluding active_only)
  const activeFiltersCount = Object.keys(localFilters).filter((key) => {
    if (key === "active_only") return false;
    const value = localFilters[key as keyof typeof localFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  }).length;

  // Get selected production line name
  const selectedProductionLines =
    productionLines?.results?.filter(
      (line: any) =>
        localFilters.production_line_id === line.id ||
        localFilters.production_line_ids?.includes(line.id)
    ) || [];

  // Get selected order info
  const selectedOrders =
    orders?.results?.filter(
      (order: any) =>
        localFilters.order_id === order.id ||
        localFilters.order_ids?.includes(order.id)
    ) || [];

  // Get selected buyer info
  const selectedBuyers =
    buyers?.results?.filter(
      (buyer: any) =>
        localFilters.buyer_id === buyer.id ||
        localFilters.buyer_ids?.includes(buyer.id)
    ) || [];

  // Get selected style info
  const selectedStyles =
    styles?.results?.filter(
      (style: any) =>
        localFilters.style_id === style.id ||
        localFilters.style_ids?.includes(style.id)
    ) || [];

  // Get unique colors and sizes from orders
  const availableColors = Array.from(
    new Set(
      orders?.results?.map((order: any) => order.color_name).filter(Boolean) ||
        []
    )
  ).sort();

  const availableSizes = Array.from(
    new Set(
      orders?.results?.map((order: any) => order.size_name).filter(Boolean) ||
        []
    )
  ).sort();

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Kiosk Filters</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Production Line Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed">
                  <Factory className="mr-2 h-4 w-4" />
                  Production Line
                  {selectedProductionLines.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="mx-2 h-4"
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal">
                        {selectedProductionLines.length === 1
                          ? selectedProductionLines[0]?.name
                          : `${selectedProductionLines.length} lines`}
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
                      <CommandItem
                        onSelect={() => handleProductionLineChange("all")}>
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedProductionLines.length === 0
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {selectedProductionLines.length === 0 && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        All Production Lines
                      </CommandItem>
                      {productionLines?.results
                        ?.filter((line: any) => line.line_type === "sewing")
                        .map((line: any) => {
                          const isSelected = selectedProductionLines.some(
                            (sl) => sl.id === line.id
                          );
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
                                  <span className="text-primary-foreground">
                                    ✓
                                  </span>
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
                  {selectedOrders.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="mx-2 h-4"
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal">
                        {selectedOrders.length === 1
                          ? `${selectedOrders[0]?.order_number} - ${selectedOrders[0]?.size_name} ${selectedOrders[0]?.color_name}`
                          : `${selectedOrders.length} orders`}
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
                            selectedOrders.length === 0
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {selectedOrders.length === 0 && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        All Orders
                      </CommandItem>
                      {orders?.results?.map((order: any) => {
                        const isSelected = selectedOrders.some(
                          (so) => so.id === order.id
                        );
                        return (
                          <CommandItem
                            key={order.id}
                            onSelect={() =>
                              handleOrderChange(order.id.toString())
                            }>
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50"
                              )}>
                              {isSelected && (
                                <span className="text-primary-foreground">
                                  ✓
                                </span>
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

            {/* Buyer Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed">
                  <Package className="mr-2 h-4 w-4" />
                  Buyer
                  {selectedBuyers.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="mx-2 h-4"
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal">
                        {selectedBuyers.length === 1
                          ? selectedBuyers[0]?.name
                          : `${selectedBuyers.length} buyers`}
                      </Badge>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[250px] p-0"
                align="start">
                <Command>
                  <CommandInput placeholder="Search buyers..." />
                  <CommandList>
                    <CommandEmpty>No buyers found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleBuyerChange("all")}>
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedBuyers.length === 0
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {selectedBuyers.length === 0 && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        All Buyers
                      </CommandItem>
                      {buyers?.results?.map((buyer: any) => {
                        const isSelected = selectedBuyers.some(
                          (sb) => sb.id === buyer.id
                        );
                        return (
                          <CommandItem
                            key={buyer.id}
                            onSelect={() =>
                              handleBuyerChange(buyer.id.toString())
                            }>
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50"
                              )}>
                              {isSelected && (
                                <span className="text-primary-foreground">
                                  ✓
                                </span>
                              )}
                            </div>
                            {buyer.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Style Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed">
                  <Package className="mr-2 h-4 w-4" />
                  Style
                  {selectedStyles.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="mx-2 h-4"
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal">
                        {selectedStyles.length === 1
                          ? selectedStyles[0]?.name
                          : `${selectedStyles.length} styles`}
                      </Badge>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[250px] p-0"
                align="start">
                <Command>
                  <CommandInput placeholder="Search styles..." />
                  <CommandList>
                    <CommandEmpty>No styles found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleStyleChange("all")}>
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedStyles.length === 0
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {selectedStyles.length === 0 && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        All Styles
                      </CommandItem>
                      {styles?.results?.map((style: any) => {
                        const isSelected = selectedStyles.some(
                          (ss) => ss.id === style.id
                        );
                        return (
                          <CommandItem
                            key={style.id}
                            onSelect={() =>
                              handleStyleChange(style.id.toString())
                            }>
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50"
                              )}>
                              {isSelected && (
                                <span className="text-primary-foreground">
                                  ✓
                                </span>
                              )}
                            </div>
                            {style.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Colors Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed">
                  <Package className="mr-2 h-4 w-4" />
                  Colors
                  {localFilters.colors && localFilters.colors.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="mx-2 h-4"
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal">
                        {localFilters.colors.length === 1
                          ? localFilters.colors[0]
                          : `${localFilters.colors.length} colors`}
                      </Badge>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[250px] p-0"
                align="start">
                <Command>
                  <CommandInput placeholder="Search colors..." />
                  <CommandList>
                    <CommandEmpty>No colors found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleColorChange("all")}>
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            !localFilters.colors ||
                              localFilters.colors.length === 0
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {(!localFilters.colors ||
                            localFilters.colors.length === 0) && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        All Colors
                      </CommandItem>
                      {availableColors.map((color: string) => {
                        const isSelected =
                          localFilters.colors?.includes(color) || false;
                        return (
                          <CommandItem
                            key={color}
                            onSelect={() => handleColorChange(color)}>
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50"
                              )}>
                              {isSelected && (
                                <span className="text-primary-foreground">
                                  ✓
                                </span>
                              )}
                            </div>
                            {color}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Sizes Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed">
                  <Package className="mr-2 h-4 w-4" />
                  Sizes
                  {localFilters.sizes && localFilters.sizes.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="mx-2 h-4"
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal">
                        {localFilters.sizes.length === 1
                          ? localFilters.sizes[0]
                          : `${localFilters.sizes.length} sizes`}
                      </Badge>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[250px] p-0"
                align="start">
                <Command>
                  <CommandInput placeholder="Search sizes..." />
                  <CommandList>
                    <CommandEmpty>No sizes found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleSizeChange("all")}>
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            !localFilters.sizes ||
                              localFilters.sizes.length === 0
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                          {(!localFilters.sizes ||
                            localFilters.sizes.length === 0) && (
                            <span className="text-primary-foreground">✓</span>
                          )}
                        </div>
                        All Sizes
                      </CommandItem>
                      {availableSizes.map((size: string) => {
                        const isSelected =
                          localFilters.sizes?.includes(size) || false;
                        return (
                          <CommandItem
                            key={size}
                            onSelect={() => handleSizeChange(size)}>
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50"
                              )}>
                              {isSelected && (
                                <span className="text-primary-foreground">
                                  ✓
                                </span>
                              )}
                            </div>
                            {size}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Active Only Toggle */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 border-dashed",
                localFilters.active_only
                  ? "bg-primary/10 border-primary/30"
                  : ""
              )}
              onClick={() => handleActiveOnlyChange(!localFilters.active_only)}>
              <Checkbox
                checked={localFilters.active_only || false}
                className="mr-2 h-4 w-4 pointer-events-none"
              />
              Active Only
            </Button>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}>
                Clear All
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

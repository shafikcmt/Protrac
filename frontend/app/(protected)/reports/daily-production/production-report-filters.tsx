"use client";

import { useState } from "react";
import {
  CalendarIcon,
  X,
  Factory,
  Package,
  User,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiHooks } from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProductionReportFiltersProps {
  filters: {
    buyer_id?: number;
    buyer_ids?: number[];
    colors?: string[];
    date_from?: string;
    date_to?: string;
    order_id?: number;
    order_ids?: number[];
    production_line_id?: number;
    production_line_ids?: number[];
    report_date?: string;
    sizes?: string[];
    style_id?: number;
    style_ids?: number[];
  };
  onFiltersChange: (filters: any) => void;
}

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (value?: string) => {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

export function ProductionReportFilters({
  filters,
  onFiltersChange,
}: ProductionReportFiltersProps) {
  const [reportDate, setReportDate] = useState<Date | undefined>(
    parseLocalDate(filters.report_date) ?? new Date()
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    parseLocalDate(filters.date_from)
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    parseLocalDate(filters.date_to)
  );

  const { data: productionLines } = apiHooks.useGet(
    "/api/tracking/productionlines/"
  );

  // The report only covers sewing lines, so the dropdown should only offer
  // sewing lines (hide cutting/finishing). The backend list endpoint doesn't
  // filter by line_type, so we filter client-side on the serialized field.
  const sewingLines =
    productionLines?.results?.filter(
      (line: any) => line.line_type === "sewing"
    ) ?? [];

  const { data: buyers } = apiHooks.useGet("/api/tracking/buyers/");

  const { data: styles } = apiHooks.useGet("/api/tracking/styles/");

  const { data: orders } = apiHooks.useGet("/api/tracking/orders/");

  const availableColors = Array.from(
    new Set(
      orders?.results?.map((order: any) => order.color_name).filter(Boolean) || []
    )
  ).sort();

  const availableSizes = Array.from(
    new Set(
      orders?.results?.map((order: any) => order.size_name).filter(Boolean) || []
    )
  ).sort();

  const handleProductionLineChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({
        ...filters,
        production_line_id: undefined,
        production_line_ids: undefined,
      });
    } else {
      const lineId = parseInt(value);
      const currentIds = filters.production_line_ids || [];
      const newIds = currentIds.includes(lineId)
        ? currentIds.filter((id) => id !== lineId)
        : [...currentIds, lineId];

      onFiltersChange({
        ...filters,
        production_line_id: undefined,
        production_line_ids: newIds.length > 0 ? newIds : undefined,
      });
    }
  };

  const handleBuyerChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({
        ...filters,
        buyer_id: undefined,
        buyer_ids: undefined,
      });
    } else {
      const buyerId = parseInt(value);
      const currentIds = filters.buyer_ids || [];
      const newIds = currentIds.includes(buyerId)
        ? currentIds.filter((id) => id !== buyerId)
        : [...currentIds, buyerId];

      onFiltersChange({
        ...filters,
        buyer_id: undefined,
        buyer_ids: newIds.length > 0 ? newIds : undefined,
      });
    }
  };

  const handleStyleChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({
        ...filters,
        style_id: undefined,
        style_ids: undefined,
      });
    } else {
      const styleId = parseInt(value);
      const currentIds = filters.style_ids || [];
      const newIds = currentIds.includes(styleId)
        ? currentIds.filter((id) => id !== styleId)
        : [...currentIds, styleId];

      onFiltersChange({
        ...filters,
        style_id: undefined,
        style_ids: newIds.length > 0 ? newIds : undefined,
      });
    }
  };

  const handleOrderChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({
        ...filters,
        order_id: undefined,
        order_ids: undefined,
      });
    } else {
      const orderId = parseInt(value);
      const currentIds = filters.order_ids || [];
      const newIds = currentIds.includes(orderId)
        ? currentIds.filter((id) => id !== orderId)
        : [...currentIds, orderId];

      onFiltersChange({
        ...filters,
        order_id: undefined,
        order_ids: newIds.length > 0 ? newIds : undefined,
      });
    }
  };

  const handleColorChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({
        ...filters,
        colors: undefined,
      });
    } else {
      const currentColors = filters.colors || [];
      const newColors = currentColors.includes(value)
        ? currentColors.filter((color) => color !== value)
        : [...currentColors, value];

      onFiltersChange({
        ...filters,
        colors: newColors.length > 0 ? newColors : undefined,
      });
    }
  };

  const handleSizeChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({
        ...filters,
        sizes: undefined,
      });
    } else {
      const currentSizes = filters.sizes || [];
      const newSizes = currentSizes.includes(value)
        ? currentSizes.filter((size) => size !== value)
        : [...currentSizes, value];

      onFiltersChange({
        ...filters,
        sizes: newSizes.length > 0 ? newSizes : undefined,
      });
    }
  };

  const handleReportDateChange = (date: Date | undefined) => {
    setReportDate(date);
    onFiltersChange({
      ...filters,
      report_date: date ? formatLocalDate(date) : undefined,
    });
  };

  const selectedProductionLines =
    sewingLines.filter(
      (line: any) =>
        filters.production_line_id === line.id ||
        filters.production_line_ids?.includes(line.id)
    ) || [];

  const selectedOrders =
    orders?.results?.filter(
      (order: any) =>
        filters.order_id === order.id || filters.order_ids?.includes(order.id)
    ) || [];

  const selectedBuyers =
    buyers?.results?.filter(
      (buyer: any) =>
        filters.buyer_id === buyer.id || filters.buyer_ids?.includes(buyer.id)
    ) || [];

  const selectedStyles =
    styles?.results?.filter(
      (style: any) =>
        filters.style_id === style.id || filters.style_ids?.includes(style.id)
    ) || [];

  const clearFilters = () => {
    const today = new Date();
    setReportDate(today);
    setDateFrom(undefined);
    setDateTo(undefined);

    onFiltersChange({
      report_date: formatLocalDate(today),
      date_from: undefined,
      date_to: undefined,
      production_line_id: undefined,
      production_line_ids: undefined,
      buyer_id: undefined,
      buyer_ids: undefined,
      style_id: undefined,
      style_ids: undefined,
      order_id: undefined,
      order_ids: undefined,
      colors: undefined,
      sizes: undefined,
    });
  };

  const activeFiltersCount = Object.keys(filters).filter((key) => {
    if (key === "report_date") return false;
    const value = filters[key as keyof typeof filters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  }).length;

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 lg:px-3"
          >
            Clear
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Report Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !reportDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {reportDate ? format(reportDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
            >
              <CalendarComponent
                mode="single"
                selected={reportDate}
                onSelect={handleReportDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Production Line
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[200px] justify-between"
              >
                <Factory className="mr-2 h-4 w-4 shrink-0" />
                {selectedProductionLines.length > 0
                  ? selectedProductionLines.length === 1
                    ? selectedProductionLines[0]?.name
                    : `${selectedProductionLines.length} lines`
                  : "All Lines"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search lines..." />
                <CommandList>
                  <CommandEmpty>No lines found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleProductionLineChange("all")}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedProductionLines.length === 0
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {selectedProductionLines.length === 0 && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      All Lines
                    </CommandItem>
                    {sewingLines.map((line: any) => {
                      const isSelected = selectedProductionLines.some(
                        (sl: any) => sl.id === line.id
                      );
                      return (
                        <CommandItem
                          key={line.id}
                          value={line.id.toString()}
                          onSelect={() =>
                            handleProductionLineChange(line.id.toString())
                          }
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50"
                            )}
                          >
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
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Buyer
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[180px] justify-between"
              >
                <User className="mr-2 h-4 w-4 shrink-0" />
                {selectedBuyers.length > 0
                  ? selectedBuyers.length === 1
                    ? selectedBuyers[0]?.name
                    : `${selectedBuyers.length} buyers`
                  : "All Buyers"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0">
              <Command>
                <CommandInput placeholder="Search buyers..." />
                <CommandList>
                  <CommandEmpty>No buyers found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleBuyerChange("all")}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedBuyers.length === 0
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {selectedBuyers.length === 0 && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      All Buyers
                    </CommandItem>
                    {buyers?.results?.map((buyer) => {
                      const isSelected = selectedBuyers.some(
                        (sb) => sb.id === buyer.id
                      );
                      return (
                        <CommandItem
                          key={buyer.id}
                          value={buyer.id.toString()}
                          onSelect={() =>
                            handleBuyerChange(buyer.id.toString())
                          }
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50"
                            )}
                          >
                            {isSelected && (
                              <span className="text-primary-foreground">✓</span>
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
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Style
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[180px] justify-between"
              >
                <Package className="mr-2 h-4 w-4 shrink-0" />
                {selectedStyles.length > 0
                  ? selectedStyles.length === 1
                    ? selectedStyles[0]?.name
                    : `${selectedStyles.length} styles`
                  : "All Styles"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0">
              <Command>
                <CommandInput placeholder="Search styles..." />
                <CommandList>
                  <CommandEmpty>No styles found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleStyleChange("all")}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedStyles.length === 0
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {selectedStyles.length === 0 && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      All Styles
                    </CommandItem>
                    {styles?.results?.map((style) => {
                      const isSelected = selectedStyles.some(
                        (ss) => ss.id === style.id
                      );
                      return (
                        <CommandItem
                          key={style.id}
                          value={style.id.toString()}
                          onSelect={() =>
                            handleStyleChange(style.id.toString())
                          }
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50"
                            )}
                          >
                            {isSelected && (
                              <span className="text-primary-foreground">✓</span>
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
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Order
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[200px] justify-between"
              >
                <Package className="mr-2 h-4 w-4 shrink-0" />
                {selectedOrders.length > 0
                  ? selectedOrders.length === 1
                    ? `${selectedOrders[0]?.order_number} - ${selectedOrders[0]?.style_name}`
                    : `${selectedOrders.length} orders`
                  : "All Orders"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Search orders..." />
                <CommandList>
                  <CommandEmpty>No orders found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleOrderChange("all")}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedOrders.length === 0
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {selectedOrders.length === 0 && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      All Orders
                    </CommandItem>
                    {orders?.results?.map((order) => {
                      const isSelected = selectedOrders.some(
                        (so) => so.id === order.id
                      );
                      return (
                        <CommandItem
                          key={order.id}
                          value={order.id.toString()}
                          onSelect={() =>
                            handleOrderChange(order.id.toString())
                          }
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50"
                            )}
                          >
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
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Colors
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[150px] justify-between"
              >
                <Package className="mr-2 h-4 w-4 shrink-0" />
                {filters.colors && filters.colors.length > 0
                  ? filters.colors.length === 1
                    ? filters.colors[0]
                    : `${filters.colors.length} colors`
                  : "All Colors"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search colors..." />
                <CommandList>
                  <CommandEmpty>No colors found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleColorChange("all")}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          !filters.colors || filters.colors.length === 0
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {(!filters.colors || filters.colors.length === 0) && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      All Colors
                    </CommandItem>
                    {availableColors.map((color) => {
                      const isSelected = filters.colors?.includes(color) || false;
                      return (
                        <CommandItem
                          key={color}
                          value={color}
                          onSelect={() => handleColorChange(color)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50"
                            )}
                          >
                            {isSelected && (
                              <span className="text-primary-foreground">✓</span>
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
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground font-medium">
            Sizes
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[150px] justify-between"
              >
                <Package className="mr-2 h-4 w-4 shrink-0" />
                {filters.sizes && filters.sizes.length > 0
                  ? filters.sizes.length === 1
                    ? filters.sizes[0]
                    : `${filters.sizes.length} sizes`
                  : "All Sizes"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search sizes..." />
                <CommandList>
                  <CommandEmpty>No sizes found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleSizeChange("all")}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          !filters.sizes || filters.sizes.length === 0
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {(!filters.sizes || filters.sizes.length === 0) && (
                          <span className="text-primary-foreground">✓</span>
                        )}
                      </div>
                      All Sizes
                    </CommandItem>
                    {availableSizes.map((size) => {
                      const isSelected = filters.sizes?.includes(size) || false;
                      return (
                        <CommandItem
                          key={size}
                          value={size}
                          onSelect={() => handleSizeChange(size)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50"
                            )}
                          >
                            {isSelected && (
                              <span className="text-primary-foreground">✓</span>
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
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            {filters.production_line_id && (
              <Badge
                variant="secondary"
                className="text-xs"
              >
                Line:{" "}
                {productionLines?.results?.find(
                  (line) => line.id === filters.production_line_id
                )?.name || "Unknown"}
              </Badge>
            )}
            {filters.buyer_id && (
              <Badge
                variant="secondary"
                className="text-xs"
              >
                Buyer:{" "}
                {buyers?.results?.find((buyer) => buyer.id === filters.buyer_id)
                  ?.name || "Unknown"}
              </Badge>
            )}
            {filters.style_id && (
              <Badge
                variant="secondary"
                className="text-xs"
              >
                Style:{" "}
                {styles?.results?.find((style) => style.id === filters.style_id)
                  ?.name || "Unknown"}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
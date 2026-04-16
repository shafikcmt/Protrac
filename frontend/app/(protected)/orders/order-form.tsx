"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
// import { Copy, Clock, Check, ChevronsUpDown,Plus,X } from "lucide-react";
import { Copy, Clock, Check, ChevronsUpDown, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { schemas } from "@/types/api/client";
import { apiHooks } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SizeCombobox } from "./size-combobox";
import { ColorCombobox } from "./color-combobox";

// Utility function to format date for API (YYYY-MM-DD format)
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type Order = z.infer<typeof schemas.Order>;
type OrderRequest = z.infer<typeof schemas.OrderRequest>;
type Style = z.infer<typeof schemas.StyleWithParts>;

type OrderFormSubmitPayload =
  | { mode: "single"; data: OrderRequest }
  | { mode: "bulk"; data: OrderRequest[] };

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
  onSubmit: (payload: OrderFormSubmitPayload) => void;
  isLoading?: boolean;
}

export function OrderForm({
  open,
  onOpenChange,
  order,
  onSubmit,
  isLoading,
}: OrderFormProps) {
  const { data: stylesData } = apiHooks.useGet("/api/tracking/styles/");
  const { data: ordersData } = apiHooks.useGet("/api/tracking/orders/");

  const styles = stylesData?.results || [];
  const allOrders = ordersData?.results || [];

  const isEditing = !!order;

  const [copyFromOpen, setCopyFromOpen] = useState(false);
  const [selectedCopyFromOrder, setSelectedCopyFromOrder] =
    useState<Order | null>(null);

  const [styleOpen, setStyleOpen] = useState(false);
  const [styleQuery, setStyleQuery] = useState("");

  const [bulkRows, setBulkRows] = useState([{ size: 0, quantity: 0 }]);
  const [bulkError, setBulkError] = useState("");

  const addBulkRow = () => {
    setBulkRows((prev) => [...prev, { size: 0, quantity: 0 }]);
  };

  const removeBulkRow = (index: number) => {
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBulkRow = (
    index: number,
    key: "size" | "quantity",
    value: number
  ) => {
    setBulkRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const transformedOrders = useMemo(
    () =>
      allOrders.map((o) => ({
        ...o,
        searchableString: `${o.order_number} ${o.buyer_name} ${o.season_name} ${o.style_name} ${o.size_name} ${o.color_name} ${o.quantity}`,
      })),
    [allOrders]
  );

  const recentOrders = allOrders.slice(0, 2);

  const form = useForm<OrderRequest>({
    resolver: zodResolver(schemas.OrderRequest),
    defaultValues: {
      order_number: "",
      style: 0,
      size: 0,
      color: 0,
      quantity: 100,
      production_cutting_date: null,
      delivery_date: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        order_number: order?.order_number || "",
        style: order?.style || 0,
        size: order?.size || 0,
        color: order?.color || 0,
        quantity: order?.quantity || 0,
        production_cutting_date: order?.production_cutting_date || null,
        delivery_date: order?.delivery_date || null,
      });

      setBulkRows(
        order
          ? [
              {
                size: order.size || 0,
                quantity: order.quantity || 0,
              },
            ]
          : [{ size: 0, quantity: 0 }]
      );

      setBulkError("");
      setSelectedCopyFromOrder(null);
      setStyleQuery("");
      setStyleOpen(false);
      setCopyFromOpen(false);
    }
  }, [order, open, form]);

  const handleSubmit = (data: OrderRequest) => {
    setBulkError("");

    if (isEditing) {
      onSubmit({ mode: "single", data });
      return;
    }

    const cleanRows = bulkRows.filter(
      (row) => row.size > 0 && Number(row.quantity) > 0
    );

    if (!cleanRows.length) {
      setBulkError("At least one size row with valid quantity is required.");
      return;
    }

    const sizeIds = cleanRows.map((r) => r.size);
    const hasDuplicate = new Set(sizeIds).size !== sizeIds.length;

    if (hasDuplicate) {
      setBulkError("Duplicate size is not allowed.");
      return;
    }

    const payloads: OrderRequest[] = cleanRows.map((row) => ({
      order_number: data.order_number,
      style: data.style,
      color: data.color,
      size: row.size,
      quantity: Number(row.quantity),
      production_cutting_date: data.production_cutting_date,
      delivery_date: data.delivery_date,
    }));

    onSubmit({ mode: "bulk", data: payloads });
  };

  const handleCopyFromOrder = (copyOrder: Order) => {
    setSelectedCopyFromOrder(copyOrder);
    setBulkError("");

    form.setValue("order_number", copyOrder.order_number);
    form.setValue("style", copyOrder.style);
    form.setValue("color", copyOrder.color);
    form.setValue(
      "production_cutting_date",
      copyOrder.production_cutting_date
    );
    form.setValue("delivery_date", copyOrder.delivery_date);

    if (isEditing) {
      form.setValue("size", copyOrder.size);
      form.setValue("quantity", copyOrder.quantity);
    } else {
      setBulkRows([
        {
          size: copyOrder.size,
          quantity: copyOrder.quantity,
        },
      ]);
    }

    setCopyFromOpen(false);
  };

  const handleResetCopiedOrder = () => {
    setSelectedCopyFromOrder(null);
    setBulkError("");

    form.setValue("style", 0);
    form.setValue("color", 0);
    form.setValue("production_cutting_date", null);
    form.setValue("delivery_date", null);

    if (isEditing) {
      form.setValue("size", 0);
      form.setValue("quantity", 0);
    } else {
      setBulkRows([{ size: 0, quantity: 0 }]);
    }
  };

  const validBulkRowCount = bulkRows.filter(
    (row) => row.size > 0 && Number(row.quantity) > 0
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          className="sm:max-w-6xl h-[90vh] overflow-hidden p-0 flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditing ? "Edit Order" : "Create Order"}</DialogTitle>
          {!isEditing && (
            <p className="text-sm text-muted-foreground">
              Enter common order details once, then add multiple sizes and
              quantities.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-1 min-h-0 flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col lg:flex-row min-h-full">
                <div className="flex-1 min-w-0 p-6 space-y-6">
                  {selectedCopyFromOrder && (
                    <Alert>
                      <Copy className="h-3 w-3" />
                      <AlertTitle className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          Copied: {selectedCopyFromOrder.order_number} •{" "}
                          {selectedCopyFromOrder.style_name} •{" "}
                          {selectedCopyFromOrder.season_name} •{" "}
                          {selectedCopyFromOrder.quantity} pcs
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-6 rounded-full text-xs"
                          size="sm"
                          onClick={handleResetCopiedOrder}
                        >
                          Reset
                        </Button>
                      </AlertTitle>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="order_number"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Order Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter order number"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="style"
                      render={({ field }) => {
                        const selectedStyle = styles.find(
                          (s: Style) => s.id === field.value
                        );

                        const filteredStyles = styles.filter((s: Style) => {
                          const q = styleQuery.trim().toLowerCase();
                          if (!q) return true;

                          return (
                            (s.name ?? "").toLowerCase().includes(q) ||
                            (s.buyer_name ?? "").toLowerCase().includes(q) ||
                            (s.season_name ?? "").toLowerCase().includes(q)
                          );
                        });

                        return (
                          <FormItem>
                            <FormLabel>Style</FormLabel>
                            <Popover
                              modal
                              open={styleOpen}
                              onOpenChange={setStyleOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={styleOpen}
                                  className="w-full justify-between h-auto py-2"
                                  disabled={isLoading}
                                >
                                  {selectedStyle ? (
                                    <div className="flex flex-col items-start text-left">
                                      <span className="text-sm font-medium">
                                        {selectedStyle.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground leading-tight">
                                        {selectedStyle.buyer_name} •{" "}
                                        {selectedStyle.season_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      Select style
                                    </span>
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>

                              <PopoverContent
                                className="w-[--radix-popover-trigger-width] p-0"
                                align="start"
                              >
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Search styles..."
                                    value={styleQuery}
                                    onValueChange={setStyleQuery}
                                  />

                                  <CommandList className="max-h-72 overflow-y-auto">
                                    <CommandEmpty className="py-4 text-xs">
                                      No styles found.
                                    </CommandEmpty>

                                    <CommandGroup>
                                      {filteredStyles.map((s: Style) => (
                                        <CommandItem
                                          key={s.id}
                                          value={`${s.name} ${s.buyer_name} ${s.season_name}`}
                                          onSelect={() => {
                                            field.onChange(s.id);
                                            setStyleOpen(false);
                                          }}
                                          className="py-2"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-3 w-3",
                                              field.value === s.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-medium">
                                              {s.name}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                              {s.buyer_name} • {s.season_name}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />


                    <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <ColorCombobox
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select or create color"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

            {isEditing ? (
  <>
    <FormField
      control={form.control}
      name="quantity"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Quantity</FormLabel>
          <FormControl>
            <Input
              type="number"
              min="1"
              placeholder="100"
              {...field}
              onChange={(e) =>
                field.onChange(parseInt(e.target.value, 10) || 0)
              }
              disabled={isLoading}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="size"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Size</FormLabel>
          <FormControl>
            <SizeCombobox
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Select or create size"
              disabled={isLoading}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
) : (
  <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <FormLabel className="text-sm font-semibold">Size Breakdown</FormLabel>
        <p className="mt-1 text-xs text-muted-foreground">
          Add all size-wise quantities and create them in one submit.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addBulkRow}
        disabled={isLoading}
        className="shrink-0 gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span>Add Row</span>
      </Button>
    </div>

    <div className="space-y-2">
      {bulkRows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-12 gap-2 rounded-md border bg-background p-2 items-end"
        >
          <div className="col-span-7">
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
              Size
            </label>
            <SizeCombobox
              value={row.size}
              onValueChange={(value) => updateBulkRow(index, "size", value)}
              placeholder="Select or create size"
              disabled={isLoading}
            />
          </div>

          <div className="col-span-4">
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
              Quantity
            </label>
            <Input
              type="number"
              min="1"
              placeholder="Qty"
              value={row.quantity || ""}
              onChange={(e) =>
                updateBulkRow(
                  index,
                  "quantity",
                  parseInt(e.target.value, 10) || 0
                )
              }
              disabled={isLoading}
            />
          </div>

          <div className="col-span-1 flex items-end justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-md text-muted-foreground hover:text-destructive"
              onClick={() => removeBulkRow(index)}
              disabled={bulkRows.length === 1 || isLoading}
              title="Remove row"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>

    {bulkError ? (
      <p className="text-sm font-medium text-destructive">{bulkError}</p>
    ) : null}

    <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
      Total rows:{" "}
      <span className="font-medium text-foreground">{bulkRows.length}</span>
    </div>
  </div>
)}

                   

                    <FormField
                      control={form.control}
                      name="production_cutting_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Production Cutting Date</FormLabel>
                          <FormControl>
                            <DatePickerInput
                              value={
                                field.value
                                  ? new Date(field.value as string)
                                  : undefined
                              }
                              onChange={(date) =>
                                field.onChange(
                                  date ? formatDateForAPI(date) : null
                                )
                              }
                              placeholder="Select production cutting date"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Date</FormLabel>
                          <FormControl>
                            <DatePickerInput
                              value={
                                field.value
                                  ? new Date(field.value as string)
                                  : undefined
                              }
                              onChange={(date) =>
                                field.onChange(
                                  date ? formatDateForAPI(date) : null
                                )
                              }
                              placeholder="Select delivery date"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div className="w-full lg:w-80 shrink-0 p-6 space-y-4 bg-muted/20 border-l overflow-y-auto">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Copy From Existing Order
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Recent Orders
                            </span>
                          </div>

                          <div className="space-y-1">
                            {recentOrders.map((recentOrder) => (
                              <Button
                                key={recentOrder.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-auto p-2 text-left border"
                                onClick={() => handleCopyFromOrder(recentOrder)}
                              >
                                <div className="flex flex-col w-full gap-0.5">
                                  <span className="text-xs font-medium truncate">
                                    {recentOrder.order_number} •{" "}
                                    {recentOrder.style_name} •{" "}
                                    {recentOrder.season_name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {recentOrder.size_name} •{" "}
                                    {recentOrder.color_name} •{" "}
                                    {recentOrder.quantity} pcs
                                  </span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Search All Orders
                          </span>

                          <Popover
                            modal
                            open={copyFromOpen}
                            onOpenChange={setCopyFromOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={copyFromOpen}
                                className="w-full justify-between text-xs h-8"
                              >
                                {selectedCopyFromOrder
                                  ? selectedCopyFromOrder.order_number
                                  : "Search orders..."}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-80 p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search order"
                                  className="h-8"
                                />
                                <CommandList className="max-h-72 overflow-y-auto">
                                  <CommandEmpty className="py-4 text-xs">
                                    No orders found.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {transformedOrders.map((copyOrder) => (
                                      <CommandItem
                                        key={copyOrder.id}
                                        value={copyOrder.searchableString}
                                        onSelect={() =>
                                          handleCopyFromOrder(copyOrder)
                                        }
                                        className="py-2"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-3 w-3",
                                            selectedCopyFromOrder?.id ===
                                              copyOrder.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-medium">
                                            {copyOrder.order_number} •{" "}
                                            {copyOrder.style_name} •{" "}
                                            {copyOrder.season_name}
                                          </span>
                                          <span className="text-[11px] text-muted-foreground">
                                            {copyOrder.size_name} •{" "}
                                            {copyOrder.color_name} •{" "}
                                            {copyOrder.quantity} pcs
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isLoading}>
                {isEditing
                  ? "Update Order"
                  : `Create ${validBulkRowCount} Orders`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
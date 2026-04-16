"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Copy, Clock, Check, ChevronsUpDown } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
type Size = z.infer<typeof schemas.Size>;
type Color = z.infer<typeof schemas.Color>;

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
  onSubmit: (data: OrderRequest) => void;
  isLoading?: boolean;
}

export function OrderForm({
  open,
  onOpenChange,
  order,
  onSubmit,
  isLoading,
}: OrderFormProps) {
  // Fetch options for dropdowns
  const { data: stylesData } = apiHooks.useGet("/api/tracking/styles/");
  const { data: sizesData } = apiHooks.useGet("/api/tracking/sizes/");
  const { data: colorsData } = apiHooks.useGet("/api/tracking/colors/");
  const { data: buyersData } = apiHooks.useGet("/api/tracking/buyers/");
  const { data: ordersData } = apiHooks.useGet("/api/tracking/orders/");

  const styles = stylesData?.results || [];
  const sizes = sizesData?.results || [];
  const colors = colorsData?.results || [];
  const buyers = buyersData?.results || [];
  const allOrders = ordersData?.results || [];
  // Copy-from state
  const [copyFromOpen, setCopyFromOpen] = useState(false);
  const [selectedCopyFromOrder, setSelectedCopyFromOrder] =
    useState<Order | null>(null);
  const transformedOrders = allOrders.map((order) => ({
    ...order,
    searchableString: `${order.order_number} ${order.buyer_name} ${order.season_name} ${order.style_name}`,
  }));
  // Get the 2 most recent orders for quick copy
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
  // Reset form when order changes or dialog opens/closes
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
      setSelectedCopyFromOrder(null);
    }
  }, [order, open, form]);
  const handleSubmit = (data: OrderRequest) => {
    onSubmit(data);
  };
  const handleCopyFromOrder = (copyOrder: Order) => {
    setSelectedCopyFromOrder(copyOrder);
    form.setValue("order_number", copyOrder.order_number);
    form.setValue("style", copyOrder.style);
    form.setValue("size", copyOrder.size);
    form.setValue("color", copyOrder.color);
    form.setValue("quantity", copyOrder.quantity);
    form.setValue("production_cutting_date", copyOrder.production_cutting_date);
    form.setValue("delivery_date", copyOrder.delivery_date);
    setCopyFromOpen(false);
  };

  const handleResetCopiedOrder = () => {
    setSelectedCopyFromOrder(null);
    // Reset form fields to default values
    form.setValue("style", 0);
    form.setValue("size", 0);
    form.setValue("color", 0);
    form.setValue("quantity", 100);
    form.setValue("production_cutting_date", null);
    form.setValue("delivery_date", null);
  };

  const isEditing = !!order;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditing ? "Edit Order" : "Create Order"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="flex">
                {/* Main Form Column */}
                <div className="flex-1 p-6 space-y-6">
                  {/* Copied Order Alert */}
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
                          onClick={handleResetCopiedOrder}>
                          Reset
                        </Button>
                      </AlertTitle>
                    </Alert>
                  )}
                  {/* Order Form Fields */}
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
                          (style) => style.id === field.value
                        );
                        return (
                          <FormItem>
                            <FormLabel>Style</FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(parseInt(value))
                              }
                              value={field.value ? field.value.toString() : ""}
                              disabled={isLoading}>
                              <FormControl>
                                <SelectTrigger className="w-full h-auto py-2">
                                  <SelectValue placeholder="Select style">
                                    {selectedStyle && (
                                      <div className="flex flex-col items-start">
                                        <span className="text-xs font-medium">
                                          {selectedStyle.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground leading-tight">
                                          {selectedStyle.buyer_name} •
                                          {selectedStyle.season_name}
                                        </span>
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {styles.map((style: Style) => (
                                  <SelectItem
                                    key={style.id}
                                    value={style.id.toString()}>
                                    <div className="flex flex-col">
                                      <span>{style.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {style.buyer_name} • {style.season_name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
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
                                field.onChange(parseInt(e.target.value) || 0)
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
                              onChange={(date) => {
                                field.onChange(
                                  date ? formatDateForAPI(date) : null
                                );
                              }}
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
                              onChange={(date) => {
                                field.onChange(
                                  date ? formatDateForAPI(date) : null
                                );
                              }}
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
                {/* Copy From Sidebar - Only show when creating new order */}
                {!isEditing && (
                  <div className="w-80 p-6 space-y-4 bg-muted/20">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Copy From Existing Order
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Recent Orders */}
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
                                onClick={() =>
                                  handleCopyFromOrder(recentOrder)
                                }>
                                <div className="flex flex-col w-full gap-0.5">
                                  <span className="text-[10px] font-medium truncate">
                                    {recentOrder.order_number} •{" "}
                                    {recentOrder.style_name} •{" "}
                                    {recentOrder.season_name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {recentOrder.size_name} •{" "}
                                    {recentOrder.color_name} •{" "}
                                    {recentOrder.quantity} pcs
                                  </span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>{" "}
                        {/* Search Orders */}
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Search All Orders
                          </span>

                          {/* Search Combobox */}
                          <Popover
                            open={copyFromOpen}
                            onOpenChange={setCopyFromOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={copyFromOpen}
                                className="w-full justify-between text-xs h-8">
                                {selectedCopyFromOrder
                                  ? selectedCopyFromOrder.order_number
                                  : "Search orders..."}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-80 p-0"
                              align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search order"
                                  className="h-8"
                                />
                                <CommandList>
                                  <CommandEmpty className="py-4 text-xs">
                                    No orders found.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {transformedOrders
                                      .slice(0, 10)
                                      .map((copyOrder) => (
                                        <CommandItem
                                          key={copyOrder.id}
                                          value={copyOrder.searchableString}
                                          onSelect={() =>
                                            handleCopyFromOrder(copyOrder)
                                          }
                                          className="py-2">
                                          <Check
                                            className={cn(
                                              "mr-2 h-3 w-3",
                                              selectedCopyFromOrder?.id ===
                                                copyOrder.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />{" "}
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-medium">
                                              {copyOrder.order_number} •{" "}
                                              {copyOrder.style_name} •{" "}
                                              {copyOrder.season_name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
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

            <DialogFooter className="px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

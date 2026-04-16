"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { schemas } from "@/types/api/client";
import { useOrders } from "../orders/use-orders";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpreadCombobox } from "@/app/(protected)/bundles/spread-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderCombobox } from "@/components/forms/order-combobox";

type BulkBundleCreateRequest = z.infer<typeof schemas.BulkBundleCreateRequest>;
type Order = z.infer<typeof schemas.Order>;

type BundleFormData = {
  spread: number;
  bundle_size: number;
};

interface BundleFormProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onSubmitAction: (data: BulkBundleCreateRequest) => Promise<any> | any;
  onAfterBulkSubmitAction?: () => Promise<void> | void;
  isLoading?: boolean;
}

export function BundleForm({
  open,
  onOpenChangeAction,
  onSubmitAction,
  onAfterBulkSubmitAction,
  isLoading,
}: BundleFormProps) {
  const [selectedOrderIdForSearch, setSelectedOrderIdForSearch] = useState(0);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bundleQuantities, setBundleQuantities] = useState<Record<number, number>>(
    {}
  );
  const [isSubmittingMulti, setIsSubmittingMulti] = useState(false);
  const [submitSummary, setSubmitSummary] = useState<{
    success: string[];
    failed: string[];
  } | null>(null);

  const { orders } = useOrders();

  const form = useForm<BundleFormData>({
    defaultValues: {
      spread: 0,
      bundle_size: 10,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        spread: 0,
        bundle_size: 10,
      });
      setSelectedOrderIdForSearch(0);
      setSelectedOrderNumber("");
      setSelectedOrderIds([]);
      setBundleQuantities({});
      setSubmitSummary(null);
      return;
    }

    setSubmitSummary(null);
  }, [open, form]);

  const watchedSpread = form.watch("spread");
  const watchedBundleSize = form.watch("bundle_size");

  const matchedOrders = useMemo(() => {
    if (!selectedOrderNumber) return [];
    return orders.filter((order) => order.order_number === selectedOrderNumber);
  }, [orders, selectedOrderNumber]);

  const selectedOrders = useMemo(() => {
    const selectedSet = new Set(selectedOrderIds);
    return matchedOrders.filter((order) => selectedSet.has(order.id));
  }, [matchedOrders, selectedOrderIds]);

  const canSubmit =
    watchedSpread > 0 &&
    watchedBundleSize > 0 &&
    selectedOrders.length > 0 &&
    !isLoading &&
    !isSubmittingMulti;

  const handleSelectSearchOrder = (orderId: number) => {
    setSelectedOrderIdForSearch(orderId);

    const foundOrder = orders.find((order) => order.id === orderId);
    const orderNumber = foundOrder?.order_number || "";

    setSelectedOrderNumber(orderNumber);
    setSelectedOrderIds([]);
    setBundleQuantities({});
    setSubmitSummary(null);
  };

  const handleBundleQtyChange = (orderId: number, value: string) => {
    setBundleQuantities((prev) => ({
      ...prev,
      [orderId]: value === "" ? 0 : parseInt(value, 10) || 0,
    }));
  };

  const toggleOrderSelection = (
    orderId: number,
    checked: boolean,
    defaultQty: number
  ) => {
    setSelectedOrderIds((prev) => {
      if (checked) {
        if (bundleQuantities[orderId] === undefined) {
          setBundleQuantities((old) => ({
            ...old,
            [orderId]: defaultQty,
          }));
        }

        if (prev.includes(orderId)) return prev;
        return [...prev, orderId];
      }

      return prev.filter((id) => id !== orderId);
    });
  };

  const handleSelectAllMatched = () => {
    const ids = matchedOrders.map((order) => order.id);

    const qtyMap: Record<number, number> = {};
    matchedOrders.forEach((order) => {
      qtyMap[order.id] = bundleQuantities[order.id] ?? order.quantity ?? 0;
    });

    setSelectedOrderIds(ids);
    setBundleQuantities((prev) => ({
      ...prev,
      ...qtyMap,
    }));
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleAdvancedSubmit = async (data: BundleFormData) => {
    if (selectedOrders.length === 0) return;

    setIsSubmittingMulti(true);
    setSubmitSummary(null);

    const success: string[] = [];
    const failed: string[] = [];
    let totalCreatedBundles = 0;

      for (const order of selectedOrders) {
      try {
        const selectedQty = bundleQuantities[order.id] ?? 0;

        const response = await Promise.resolve(
          onSubmitAction({
            order: order.id,
            total_garment_quantity:
              selectedQty > 0 ? selectedQty : order.quantity ?? 0,
            bundle_size: data.bundle_size,
            spread: data.spread,
          })
        );

        totalCreatedBundles +=
          response?.total_bundle_count ?? response?.created_count ?? 0;

        success.push(
          `${order.order_number} • ${order.size_name} • ${order.color_name}`
        );
      } catch {
        failed.push(
          `${order.order_number} • ${order.size_name} • ${order.color_name}`
        );
      }
    }

    await Promise.resolve(onAfterBulkSubmitAction?.());

    const summary = { success, failed };
    setSubmitSummary(summary);
    setIsSubmittingMulti(false);

    if (success.length > 0 && failed.length === 0) {
      toast.success(
        `${success.length} row created successfully${
          totalCreatedBundles > 0 ? ` (${totalCreatedBundles} bundles)` : ""
        }`
      );
      onOpenChangeAction(false);
      return;
    }

    if (success.length > 0 && failed.length > 0) {
      toast.warning(`${success.length} row success, ${failed.length} row failed`);
      return;
    }

    if (failed.length > 0) {
      toast.error(`Failed to create ${failed.length} row`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create Bundles</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleAdvancedSubmit)}
            className="flex flex-col h-full"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-80 p-6 border-r bg-muted/20">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="spread"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spread</FormLabel>
                          <FormControl>
                            <SpreadCombobox
                              value={field.value || 0}
                              onValueChange={field.onChange}
                              placeholder="Select or create spread..."
                              disabled={isLoading || isSubmittingMulti}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Order Number</FormLabel>
                      <OrderCombobox
                        value={selectedOrderIdForSearch || 0}
                        onValueChangeAction={handleSelectSearchOrder}
                        placeholder="Select an order..."
                        disabled={isLoading || isSubmittingMulti}
                        className="w-full"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="bundle_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bundle Size</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Items per bundle"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value, 10) || 0)
                              }
                              disabled={isLoading || isSubmittingMulti}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllMatched}
                        disabled={
                          matchedOrders.length === 0 ||
                          isLoading ||
                          isSubmittingMulti
                        }
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelection}
                        disabled={
                          selectedOrderIds.length === 0 ||
                          isLoading ||
                          isSubmittingMulti
                        }
                      >
                        Clear
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full"
                    >
                      {(isLoading || isSubmittingMulti) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSubmittingMulti
                        ? "Creating Bundles..."
                        : `Create ${selectedOrders.length} Selection${
                            selectedOrders.length > 1 ? "s" : ""
                          }`}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-6">
                  <div className="space-y-4">
                    {!selectedOrderNumber && (
                      <Alert>
                        <AlertDescription>
                          Order number select korle oi order er shob size/color row
                          ekhane dekhabe. Tarpor select kore one click e bundle
                          create korte parbe.
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedOrderNumber && matchedOrders.length === 0 && (
                      <Alert>
                        <AlertDescription>
                          Kono order paowa jayni. Exact order number select koro.
                        </AlertDescription>
                      </Alert>
                    )}

                    {submitSummary && (
                      <Alert>
                        <AlertTitle>Bulk create finished</AlertTitle>
                        <AlertDescription>
                          Success: {submitSummary.success.length} row, Failed:{" "}
                          {submitSummary.failed.length} row
                        </AlertDescription>
                      </Alert>
                    )}

                    {matchedOrders.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Matching Order Rows</h4>
                        </div>

                        <ScrollArea className="h-[420px] pr-2">
                          <div className="space-y-2">
                            {matchedOrders.map((order: Order) => {
                              const checked = selectedOrderIds.includes(order.id);
                              const currentQty =
                                bundleQuantities[order.id] ?? order.quantity ?? 0;

                              return (
                                <div
                                  key={order.id}
                                  className={`rounded-lg border p-3 transition-colors ${
                                    checked
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-card"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) =>
                                        toggleOrderSelection(
                                          order.id,
                                          Boolean(value),
                                          order.quantity ?? 0
                                        )
                                      }
                                      disabled={isLoading || isSubmittingMulti}
                                      className="mt-1"
                                    />

                                    <div className="flex-1 min-w-0 space-y-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">
                                          {order.order_number}
                                        </span>
                                        <Badge variant="secondary">
                                          {order.size_name}
                                        </Badge>
                                        <Badge variant="outline">
                                          {order.color_name}
                                        </Badge>
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                                        <div>
                                          <span className="block">Style</span>
                                          <span className="font-medium text-foreground">
                                            {order.style_name}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block">Season</span>
                                          <span className="font-medium text-foreground">
                                            {order.season_name}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block">Buyer</span>
                                          <span className="font-medium text-foreground">
                                            {order.buyer_name}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block">Order Qty</span>
                                          <span className="font-medium text-foreground">
                                            {(order.quantity || 0).toLocaleString()}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block">Garments Qty</span>
                                          <Input
                                            type="number"
                                            value={currentQty}
                                            onChange={(e) =>
                                              handleBundleQtyChange(
                                                order.id,
                                                e.target.value
                                              )
                                            }
                                            disabled={
                                              !checked ||
                                              isLoading ||
                                              isSubmittingMulti
                                            }
                                            className="h-8"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChangeAction(false)}
                disabled={isLoading || isSubmittingMulti}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
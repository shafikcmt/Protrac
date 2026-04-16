"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { schemas } from "@/types/api/client";
import { useOrders } from "../orders/use-orders";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderCombobox } from "@/components/forms/order-combobox";
import { useBundles } from "./use-bundles";
import { SpreadCombobox } from "@/app/(protected)/bundles/spread-combobox";
import { SimplifiedBundleForm } from "@/components/bundles/simplified-bundle-form";

type BulkBundleCreateRequest = z.infer<typeof schemas.BulkBundleCreateRequest>;
type BulkBundlePreviewResponse = z.infer<typeof schemas.BundleCreationPreview>;

// Create a form-specific type to handle the optional bundle_size
type BundleFormData = {
  order: number;
  total_garment_quantity: number;
  bundle_size: number;
  spread: number;
};

interface BundleFormProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onSubmitAction: (data: BulkBundleCreateRequest) => Promise<void> | void;
  isLoading?: boolean;
}

export function BundleForm({
  open,
  onOpenChangeAction,
  onSubmitAction,
  isLoading,
}: BundleFormProps) {
  const [preview, setPreview] = useState<BulkBundlePreviewResponse | null>(
    null
  );
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("simplified");

  const { orders } = useOrders();
  const { bulkPreviewBundles } = useBundles();
  const form = useForm<BundleFormData>({
    defaultValues: {
      order: 0,
      total_garment_quantity: 1,
      bundle_size: 10,
      spread: 0,
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        order: 0,
        total_garment_quantity: 1,
        bundle_size: 10,
        spread: 0,
      });
      setPreview(null);
      setActiveTab("simplified"); // Default to simplified tab
    }
  }, [open, form]);

  const watchedOrder = form.watch("order");
  const watchedQuantity = form.watch("total_garment_quantity");
  const watchedBundleSize = form.watch("bundle_size");
  const watchedSpread = form.watch("spread");

  // Generate preview when order, quantity, bundle size, and spread are valid
  useEffect(() => {
    const generatePreview = async () => {
      if (
        watchedOrder > 0 &&
        watchedQuantity > 0 &&
        watchedBundleSize > 0 &&
        watchedSpread > 0
      ) {
        setIsGeneratingPreview(true);
        try {
          const previewData = await bulkPreviewBundles({
            order: watchedOrder,
            total_garment_quantity: watchedQuantity,
            bundle_size: watchedBundleSize,
            spread: watchedSpread,
          });
          setPreview(previewData);
        } catch (error) {
          console.error("Failed to generate preview:", error);
          setPreview(null);
        } finally {
          setIsGeneratingPreview(false);
        }
      } else {
        setPreview(null);
      }
    };

    const timeoutId = setTimeout(generatePreview, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [
    watchedOrder,
    watchedQuantity,
    watchedBundleSize,
    watchedSpread,
    bulkPreviewBundles,
  ]);

  const handleSubmit = async (data: BundleFormData) => {
    // Convert form data to the API format
    const apiData: BulkBundleCreateRequest = {
      order: data.order,
      total_garment_quantity: data.total_garment_quantity,
      bundle_size: data.bundle_size,
      spread: data.spread,
    };
    await Promise.resolve(onSubmitAction(apiData));
  };

  const selectedOrder = orders.find((order) => order.id === watchedOrder);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChangeAction}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create Bundles</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="simplified"
                className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Create
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="simplified"
            className="flex-1 overflow-hidden m-0">
            <SimplifiedBundleForm
              onSubmitAction={onSubmitAction}
              isLoading={isLoading}
            />
            <DialogFooter className="px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChangeAction(false)}
                disabled={isLoading}>
                Cancel
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value="advanced"
            className="flex-1 overflow-hidden m-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <div className="flex">
                    {/* Form Column */}
                    <div className="w-80 p-6 border-r bg-muted/20">
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
                                  disabled={isLoading}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order</FormLabel>
                              <FormControl>
                                <OrderCombobox
                                  value={field.value || 0}
                                  onValueChangeAction={field.onChange}
                                  placeholder="Select an order..."
                                  disabled={isLoading}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="total_garment_quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Garment Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Enter quantity"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value, 10) || 0
                                    )
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
                          name="bundle_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bundle Size</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Items per bundle"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedOrder && (
                          <Card className="p-3">
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  Style:
                                </span>
                                <span className="font-medium">
                                  {selectedOrder.style_name}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  Size:
                                </span>
                                <span>{selectedOrder.size_name}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  Color:
                                </span>
                                <span>{selectedOrder.color_name}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  Order Qty:
                                </span>
                                <span>
                                  {selectedOrder.quantity.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>
                    </div>

                    {/* Preview Column */}
                    <div className="flex-1 p-6">
                      <div className="space-y-4">
                        {!preview && !isGeneratingPreview && (
                          <Alert>
                            <AlertDescription>
                              Select an order, enter garment quantity, set
                              bundle size, and choose a spread to see the bundle
                              preview.
                            </AlertDescription>
                          </Alert>
                        )}

                        {isGeneratingPreview && (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="ml-2">Generating preview...</span>
                          </div>
                        )}

                        {preview && (
                          <div className="space-y-4">
                            {/* Preview Summary */}
                            <Card>
                              <CardContent className="grid grid-cols-2 gap-1 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">
                                    Order:
                                  </span>
                                  <div className="font-medium">
                                    {selectedOrder?.order_number || "N/A"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">
                                    Style:
                                  </span>
                                  <div className="truncate">
                                    {selectedOrder?.style_name || "N/A"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">
                                    Spread:
                                  </span>
                                  <div className="font-medium">
                                    {preview.spread_number}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">
                                    Garment Qty:
                                  </span>
                                  <div className="font-medium">
                                    {preview.total_garment_quantity.toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">
                                    Total Bundles:
                                  </span>
                                  <div className="font-medium">
                                    {preview.total_bundles.toLocaleString()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Separator />

                            {/* Parts Details from Preview */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">
                                Parts to be Created
                              </h4>
                              <ScrollArea className="h-36">
                                <div className="space-y-1">
                                  {preview.parts.map((part, index) => (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center p-2 border rounded-md bg-card/50">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-medium truncate">
                                            {part.part_name}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            Sets: {part.bundles_count}
                                          </span>
                                        </div>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="h-5 min-w-12 rounded-sm px-1 font-mono tabular-nums">
                                        {part.bundles_count}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
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
                    disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !preview}
                    className="min-w-32">
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isLoading ? "Creating..." : "Create Bundles"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

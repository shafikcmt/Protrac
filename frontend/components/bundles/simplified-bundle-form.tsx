"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { schemas } from "@/types/api/client";
import { useOrders } from "@/app/(protected)/orders/use-orders";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderCombobox } from "@/components/forms/order-combobox";
import { SpreadCombobox } from "@/app/(protected)/bundles/spread-combobox";

type BulkBundleCreateRequest = z.infer<typeof schemas.BulkBundleCreateRequest>;

// Schema for simplified form
const SimplifiedBundleFormSchema = z.object({
  order: z.number().min(1, "Please select an order"),
  spread: z.number().min(1, "Please select a spread"),
  totalGarments: z.number().min(1, "Total garments must be at least 1"),
  preferredBundleSize: z
    .number()
    .min(1, "Preferred bundle size must be at least 1"),
});

type SimplifiedBundleFormData = z.infer<typeof SimplifiedBundleFormSchema>;

interface SimplifiedBundlePreview {
  totalBundles: number;
  bundleBreakdown: {
    size: number;
    count: number;
  }[];
  motherPartBundles: {
    index: number;
    partName: string;
    quantity: number;
  }[];
}

interface SimplifiedBundleFormProps {
  onSubmitAction: (data: BulkBundleCreateRequest) => Promise<void> | void;
  isLoading?: boolean;
}

export function SimplifiedBundleForm({
  onSubmitAction,
  isLoading,
}: SimplifiedBundleFormProps) {
  const [preview, setPreview] = useState<SimplifiedBundlePreview | null>(null);
  const { orders } = useOrders();

  const form = useForm<SimplifiedBundleFormData>({
    resolver: zodResolver(SimplifiedBundleFormSchema),
    defaultValues: {
      order: 0,
      spread: 0,
      totalGarments: 0,
      preferredBundleSize: 10,
    },
  });

  const watchedOrder = form.watch("order");
  const watchedSpread = form.watch("spread");
  const watchedTotalGarments = form.watch("totalGarments");
  const watchedPreferredSize = form.watch("preferredBundleSize");

  // Generate preview when form values change
  useEffect(() => {
    if (
      watchedOrder > 0 &&
      watchedSpread > 0 &&
      watchedTotalGarments > 0 &&
      watchedPreferredSize > 0
    ) {
      const totalBundles = Math.ceil(
        watchedTotalGarments / watchedPreferredSize
      );
      const fullBundles = Math.floor(
        watchedTotalGarments / watchedPreferredSize
      );
      const remainder = watchedTotalGarments % watchedPreferredSize;

      const bundleBreakdown = [];
      if (fullBundles > 0) {
        bundleBreakdown.push({
          size: watchedPreferredSize,
          count: fullBundles,
        });
      }
      if (remainder > 0) {
        bundleBreakdown.push({
          size: remainder,
          count: 1,
        });
      }

      // Generate mother part bundles preview
      const selectedOrder = orders.find((order) => order.id === watchedOrder);
      const motherPartBundles = [];

      for (let i = 0; i < totalBundles; i++) {
        const isLastBundle = i === totalBundles - 1;
        const bundleSize =
          isLastBundle && remainder > 0 ? remainder : watchedPreferredSize;

        motherPartBundles.push({
          index: i + 1,
          partName: selectedOrder?.style_name || "Assembly Part",
          quantity: bundleSize,
        });
      }

      setPreview({
        totalBundles,
        bundleBreakdown,
        motherPartBundles,
      });
    } else {
      setPreview(null);
    }
  }, [
    watchedOrder,
    watchedSpread,
    watchedTotalGarments,
    watchedPreferredSize,
    orders,
  ]);

  const handleSubmit = async (data: SimplifiedBundleFormData) => {
    if (!preview) return;

    // Create a single bulk bundle request with the total garment quantity and preferred bundle size
    const bundleCreateData: BulkBundleCreateRequest = {
      order: data.order,
      spread: data.spread,
      total_garment_quantity: data.totalGarments,
      bundle_size: data.preferredBundleSize,
    };

    // Call onSubmit once with the bulk request
    await Promise.resolve(onSubmitAction(bundleCreateData));
  };

  const selectedOrder = orders.find((order) => order.id === watchedOrder);

  return (
    <div className="flex">
      {/* Form Column */}
      <div className="w-80 p-6 border-r bg-muted/20">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6">
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
              name="totalGarments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Garments</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 245"
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
              name="preferredBundleSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bundle Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 10"
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

            {selectedOrder && (
              <Card className="p-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Style:</span>
                    <span className="font-medium">
                      {selectedOrder.style_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{selectedOrder.size_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Color:</span>
                    <span>{selectedOrder.color_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Order Qty:</span>
                    <span>{selectedOrder.quantity.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !preview}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Bundles...
                </>
              ) : (
                <>Create {preview?.totalBundles || 0} Bundles</>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Preview Column */}
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {!preview && (
            <Alert>
              <AlertDescription>
                Fill in the form to see bundle calculation and preview.
              </AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Bundle Calculation Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Bundle Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">
                        Total Garments:
                      </span>
                      <div className="font-medium text-lg">
                        {watchedTotalGarments.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        Total Bundles:
                      </span>
                      <div className="font-medium text-lg">
                        {preview.totalBundles.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-muted-foreground text-xs block">
                      Bundle Breakdown:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {preview.bundleBreakdown.map((breakdown, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs">
                          {breakdown.count} × {breakdown.size} garments
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mother Part Bundles Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Bundles Preview</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {preview.motherPartBundles.map((bundle) => (
                      <div
                        key={bundle.index}
                        className="flex justify-between items-center p-2 border rounded-md bg-card/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              Bundle #{bundle.index}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {bundle.partName}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="h-5 min-w-12 rounded-sm px-1 font-mono tabular-nums">
                          {bundle.quantity}
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
  );
}

"use client";

import { z } from "zod";
import { schemas } from "@/types/api/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

type OrderHeatmap = z.infer<typeof schemas.OrderHeatmap>;
type GarmentHeatmapItem = z.infer<typeof schemas.GarmentHeatmapItem>;
type GarmentStatusEnum = z.infer<typeof schemas.GarmentStatusEnum>;
type StatusSummary = z.infer<typeof schemas.StatusSummary>;

interface GarmentsHeatmapGridProps {
  orders: OrderHeatmap[];
  isRefetching?: boolean;
}

// Status to color mapping with enhanced visual distinction
const getStatusStyles = (status: string) => {
  switch (status) {
    case "pending_assembly":
      return {
        bg: "bg-gray-400",
        text: "text-white",
        border: "",
        shape: "rounded",
        label: "Pending Assembly",
      };
    case "issued_for_assembly":
      return {
        bg: "bg-blue-500",
        text: "text-white",
        border: "",
        shape: "rounded",
        label: "Issued for Assembly",
      };
    // Sewing QC statuses - use rounded rectangles
    case "sewing_qc_pass":
      return {
        bg: "bg-green-500",
        text: "text-white",
        border: "border-2 border-green-600",
        shape: "rounded",
        label: "Sewing QC Pass",
      };
    case "sewing_qc_fail":
      return {
        bg: "bg-red-500",
        text: "text-white",
        border: "border-2 border-red-600",
        shape: "rounded",
        label: "Sewing QC Fail",
      };
    case "sewing_qc_rework":
      return {
        bg: "bg-orange-500",
        text: "text-white",
        border: "border-2 border-orange-600",
        shape: "rounded",
        label: "Sewing QC Rework",
      };
    // Finishing QC statuses - use circles for distinction
    case "finishing_qc_pass":
      return {
        bg: "bg-emerald-500",
        text: "text-white",
        border: "border-2 border-emerald-700",
        shape: "rounded-full",
        label: "Finishing QC Pass",
      };
    case "finishing_qc_fail":
      return {
        bg: "bg-rose-500",
        text: "text-white",
        border: "border-2 border-rose-700",
        shape: "rounded-full",
        label: "Finishing QC Fail",
      };
    case "finishing_qc_rework":
      return {
        bg: "bg-amber-500",
        text: "text-white",
        border: "border-2 border-amber-700",
        shape: "rounded-full",
        label: "Finishing QC Rework",
      };
    default:
      return {
        bg: "bg-gray-300",
        text: "text-gray-700",
        border: "",
        shape: "rounded",
        label: "Unknown",
      };
  }
};

interface GarmentBoxProps {
  garment: GarmentHeatmapItem;
}

const GarmentBox = ({ garment }: GarmentBoxProps) => {
  const styles = getStatusStyles(garment.status);

  return (
    <div
      className={cn(
        "w-8 h-8 flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer group relative flex-shrink-0",
        styles.bg,
        styles.text,
        styles.border,
        styles.shape
      )}
      title={`${garment.sequence_number} - ${styles.label}`}>
      {garment.sequence_number}

      {/* Enhanced Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
        <div className="font-medium">Garment #{garment.sequence_number}</div>
        <div className="text-gray-300">{garment.status_display}</div>
        <div className="text-gray-400 text-xs mt-1">
          Code: {garment.tracking_code}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
      </div>
    </div>
  );
};

interface OrderHeatmapCardProps {
  order: OrderHeatmap;
  globalExpanded?: boolean;
}

const OrderHeatmapCard = ({
  order,
  globalExpanded = false,
}: OrderHeatmapCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset local expansion when global state changes
  useEffect(() => {
    if (globalExpanded) {
      setIsExpanded(false);
    }
  }, [globalExpanded]);

  // Use global expanded state if provided, otherwise use local state
  const effectiveExpanded = globalExpanded || isExpanded;

  // Create a grid layout for garments (25 per row for better layout on most screens)
  const garmentsPerRow = 25;
  const initialRowsToShow = 6; // Show first 150 garments initially (6 rows × 25)

  // Memoize the garment rows for performance
  const allGarmentRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < order.garments.length; i += garmentsPerRow) {
      rows.push(order.garments.slice(i, i + garmentsPerRow));
    }
    return rows;
  }, [order.garments, garmentsPerRow]);

  // Determine which rows to show
  const garmentRowsToShow = effectiveExpanded
    ? allGarmentRows
    : allGarmentRows.slice(0, initialRowsToShow);

  const hasMoreRows = allGarmentRows.length > initialRowsToShow;
  const hiddenGarmentsCount = hasMoreRows
    ? order.garments.length - initialRowsToShow * garmentsPerRow
    : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {order.order_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {order.style_name} • {order.buyer_name} • {order.season_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.color_name} • {order.size_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {order.garments.length} / {order.total_quantity} garments
            </p>
            <p className="text-xs text-muted-foreground">
              {effectiveExpanded
                ? "All"
                : `${Math.min(
                    order.garments.length,
                    initialRowsToShow * garmentsPerRow
                  )}`}{" "}
              shown
            </p>
          </div>
        </div>

        {/* Status Summary using the provided status_summary */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(order.status_summary).map(([status, count]) => {
            const numCount = Number(count);
            if (numCount === 0) return null;
            const styles = getStatusStyles(status);
            return (
              <Badge
                key={status}
                variant="outline"
                className={cn("text-xs px-2 py-1", styles.bg, styles.text)}>
                {numCount} {styles.label}
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {garmentRowsToShow.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex flex-wrap gap-1 justify-start">
              {row.map((garment) => (
                <GarmentBox
                  key={`${garment.tracking_code}-${garment.sequence_number}`}
                  garment={garment}
                />
              ))}
            </div>
          ))}

          {/* Expand/Collapse Button */}
          {hasMoreRows && !globalExpanded && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show {hiddenGarmentsCount} More Garments
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Legend Component with enhanced visual distinction
const StatusLegend = () => {
  const allStatuses = [
    "pending_assembly",
    "issued_for_assembly",
    "sewing_qc_pass",
    "sewing_qc_fail",
    "sewing_qc_rework",
    "finishing_qc_pass",
    "finishing_qc_fail",
    "finishing_qc_rework",
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Status Legend</CardTitle>
        <p className="text-xs text-muted-foreground">
          Sewing QC: Rounded squares • Finishing QC: Circles
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {allStatuses.map((status) => {
            const styles = getStatusStyles(status);
            return (
              <div
                key={status}
                className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs font-medium",
                    styles.bg,
                    styles.text,
                    styles.border,
                    styles.shape
                  )}>
                  #
                </div>
                <span className="text-sm text-muted-foreground">
                  {styles.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export const GarmentsHeatmapGrid = ({
  orders,
  isRefetching,
}: GarmentsHeatmapGridProps) => {
  const [globalExpanded, setGlobalExpanded] = useState(false);
  const [ordersToShow, setOrdersToShow] = useState(5); // Show 5 orders initially

  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">No garments data available</p>
        </div>
      </div>
    );
  }

  // Paginate orders to avoid loading all at once
  const visibleOrders = orders.slice(0, ordersToShow);
  const hasMoreOrders = orders.length > ordersToShow;

  // Calculate total garments across visible orders
  const totalGarments = visibleOrders.reduce(
    (sum, order) => sum + order.garments.length,
    0
  );
  const totalOrderQuantity = visibleOrders.reduce(
    (sum, order) => sum + order.total_quantity,
    0
  );

  const loadMoreOrders = () => {
    setOrdersToShow((prev) => Math.min(prev + 5, orders.length));
  };
  return (
    <div
      className={cn(
        "space-y-6",
        isRefetching && "opacity-75 transition-opacity"
      )}>
      <StatusLegend />

      {/* Global Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {visibleOrders.length} of {orders.length} orders •{" "}
          {totalGarments} / {totalOrderQuantity} garments
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGlobalExpanded(!globalExpanded)}
          className="flex items-center gap-2">
          {globalExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse All
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Expand All
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {visibleOrders.map((order) => (
          <OrderHeatmapCard
            key={order.order_id}
            order={order}
            globalExpanded={globalExpanded}
          />
        ))}
      </div>

      {/* Load More Orders Button */}
      {hasMoreOrders && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={loadMoreOrders}
            className="flex items-center gap-2">
            <ChevronDown className="h-4 w-4" />
            Load {Math.min(5, orders.length - ordersToShow)} More Orders
          </Button>
        </div>
      )}
    </div>
  );
};

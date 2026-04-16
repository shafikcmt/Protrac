"use client";

import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Trash2, CirclePlus, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { TableConfig, arrayFilter } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type Bundle = z.infer<typeof schemas.Bundle>;

// Format date and time for display
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="text-sm text-muted-foreground">
      <div>{dateStr}</div>
      <div className="text-xs opacity-70">{timeStr}</div>
    </div>
  );
};

// Get badge variant for bundle status
const getStatusVariant = (status: string) => {
  switch (status) {
    case "created":
      return "secondary";
    case "issued_to_sewing":
      return "default";
    case "completed":
      return "default";
    default:
      return "secondary";
  }
};

// Define columns for the bundles table
export const bundlesColumns: ColumnDef<Bundle>[] = [
  // ✅ Hidden "search index" column for searching ALL fields
  {
    id: "search_index",
    accessorFn: (row: any) => {
      return [
        row.tracking_code ?? "",
        row.order_number ?? "",
        row.style_name ?? "",
        row.size_name ?? "",
        row.color_name ?? "",
        row.part_name ?? "",
        row.spread_number ?? "",
        row.display_bundle_number ?? "",
        row.garment_quantity ?? "",
        row.status ?? "",
        row.created_at ?? "",
        row.updated_at ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    },
    header: () => null,
    cell: () => null,
    enableSorting: false,
    enableHiding: true,
    size: 0,
  },

  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "tracking_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tracking Code" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[120px] truncate font-mono text-sm">
            {row.getValue("tracking_code")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "order_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-sm font-medium">{row.getValue("order_number")}</div>
      );
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "style_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Style" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("style_name")}</div>;
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "size_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Size" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("size_name")}</div>;
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "color_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Color" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("color_name")}</div>;
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "part_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Part" />
    ),
    cell: ({ row }) => {
      const partName = row.getValue("part_name") as string | null;
      return <div className="text-sm">{partName || "—"}</div>;
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "spread_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Spread" />
    ),
    cell: ({ row }) => {
      const spreadNumber = row.getValue("spread_number") as string | null;
      return <div className="text-sm font-mono">{spreadNumber || "—"}</div>;
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "display_bundle_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bundle #" />
    ),
    cell: ({ row }) => {
      const bundleNumber = row.getValue("display_bundle_number") as string;
      const spreadNumber = row.original.spread_number as string | null;
      const fifoViolation = row.original.fifo_violation_flag;

      return (
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-mono font-medium">{bundleNumber}</span>
            {fifoViolation && (
              <Badge
                variant="destructive"
                className="h-3 w-3 p-0 text-[8px] rounded-full"
              >
                !
              </Badge>
            )}
          </div>
          {spreadNumber && (
            <div className="text-xs text-muted-foreground font-mono">
              {spreadNumber}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "garment_quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Qty" />
    ),
    cell: ({ row }) => {
      const quantity = row.getValue("garment_quantity") as number;
      return (
        <Badge
          variant="outline"
          className="h-5 min-w-8 rounded-sm px-1 font-mono text-xs tabular-nums"
        >
          {quantity?.toLocaleString() || "—"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={getStatusVariant(status)} className="capitalize">
          {status.replace("_", " ")}
        </Badge>
      );
    },
    filterFn: arrayFilter,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatDateTime(row.getValue("created_at")),
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => formatDateTime(row.getValue("updated_at")),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const actions = (table.options.meta as any)?.rowActions;
      return <DataTableRowActions row={row} actions={actions} />;
    },
  },
];

// Create table configuration factory with dynamic filters
export const createBundlesTableConfig = (
  onCreateBundle: () => void,
  onDeleteBundle: (bundle: Bundle) => void,
  onBulkDeleteBundles: (bundles: Bundle[]) => void,
  onPrintLabels: (bundles: Bundle[]) => void,
  bundles: Bundle[] = []
): TableConfig<Bundle> => {
  // Generate unique filter options from the data
  const getUniqueOptions = (key: keyof Bundle) => {
    const uniqueValues = Array.from(new Set(bundles.map((bundle) => bundle[key])))
      .filter((value) => value !== null && value !== undefined && value !== "")
      .sort();

    return uniqueValues.map((value) => ({
      label: String(value),
      value: String(value),
    }));
  };

  // Generate simple order options
  const getOrderOptions = () => {
    const uniqueOrders = Array.from(new Set(bundles.map((bundle) => bundle.order_number)))
      .filter((order) => order !== null && order !== undefined && order !== "")
      .sort();
    return uniqueOrders.map((orderNumber) => ({
      label: orderNumber,
      value: orderNumber,
    }));
  };

  return {
    columns: bundlesColumns,

    // ✅ Search now works on ALL fields
    search: {
      column: "search_index",
      placeholder: "Search bundles...",
    },

    filters: [
      { column: "order_number", title: "Order", options: getOrderOptions() },
      { column: "style_name", title: "Style", options: getUniqueOptions("style_name") },
      { column: "size_name", title: "Size", options: getUniqueOptions("size_name") },
      { column: "color_name", title: "Color", options: getUniqueOptions("color_name") },
      { column: "part_name", title: "Part", options: getUniqueOptions("part_name") },
      { column: "spread_number", title: "Spread", options: getUniqueOptions("spread_number") },
      {
        column: "status",
        title: "Status",
        options: [
          { label: "Created", value: "created" },
          { label: "Issued to Sewing", value: "issued_to_sewing" },
          { label: "Completed", value: "completed" },
        ],
      },
    ],

    defaultFilters: {
      status: ["created"],
    },

    defaultColumnVisibility: {
      spread_number: false,
      // ✅ keep hidden search column hidden
      search_index: false,
    },

    actions: {
      create: {
        label: "Create Bundles",
        onClick: onCreateBundle,
        icon: CirclePlus,
      },
      row: [
        {
          label: "Print Labels",
          onClick: (bundle: Bundle) => onPrintLabels([bundle]),
          variant: "default",
          icon: Printer,
        },
        {
          label: "Delete",
          onClick: onDeleteBundle,
          variant: "destructive",
          icon: Trash2,
        },
      ],
    },

    selection: {
      enabled: true,
      bulkActions: [
        {
          label: "Print Labels",
          onClick: onPrintLabels,
          variant: "default",
          icon: Printer,
        },
        {
          label: "Delete Selected",
          onClick: onBulkDeleteBundles,
          variant: "destructive",
          icon: Trash2,
        },
      ],
    },
  };
};
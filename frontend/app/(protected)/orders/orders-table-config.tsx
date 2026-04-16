"use client";

import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Pencil, Trash2, CirclePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { TableConfig } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type Order = z.infer<typeof schemas.Order>;

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Define columns for the orders table
export const ordersColumns: ColumnDef<Order>[] = [
  // ✅ Hidden "search index" column (searches across ALL fields)
  {
    id: "search_index",
    accessorFn: (row: any) => {
      return [
        row.order_number ?? "",
        row.style_name ?? "",
        row.buyer_name ?? "",
        row.season_name ?? "",
        row.size_name ?? "",
        row.color_name ?? "",
        row.quantity ?? "",
        row.production_cutting_date ?? "",
        row.delivery_date ?? "",
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
    accessorKey: "order_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Number" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[200px] truncate font-medium">
            {row.getValue("order_number")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "style_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Style" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("style_name")}</div>;
    },
  },
  {
    accessorKey: "buyer_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Buyer" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("buyer_name")}</div>;
    },
  },
  {
    accessorKey: "season_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Season" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("season_name")}</div>;
    },
  },
  {
    accessorKey: "size_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Size" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("size_name")}</div>;
    },
  },
  {
    accessorKey: "color_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Color" />
    ),
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("color_name")}</div>;
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number;
      return (
        <Badge
          variant="outline"
          className="h-5 min-w-12 rounded-sm px-1 font-mono tabular-nums"
        >
          {Number(quantity || 0).toLocaleString()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "production_cutting_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cutting Date" />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.getValue("production_cutting_date"))}
        </div>
      );
    },
  },
  {
    accessorKey: "delivery_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Delivery Date" />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.getValue("delivery_date"))}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.getValue("created_at"))}
        </div>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.getValue("updated_at"))}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const actions = (table.options.meta as any)?.rowActions;
      return <DataTableRowActions row={row} actions={actions} />;
    },
  },
];

// Create table configuration factory
export const createOrdersTableConfig = (
  onCreateOrder: () => void,
  onEditOrder: (order: Order) => void,
  onDeleteOrder: (order: Order) => void,
  onBulkDeleteOrders: (orders: Order[]) => void
): TableConfig<Order> => ({
  columns: ordersColumns,

  // ✅ Search now works by ALL fields
  search: {
    column: "search_index",
    placeholder: "Search orders...",
  },

  actions: {
    create: {
      label: "Create Order",
      onClick: onCreateOrder,
      icon: CirclePlus,
    },
    row: [
      {
        label: "Edit",
        onClick: onEditOrder,
        icon: Pencil,
      },
      {
        label: "Delete",
        onClick: onDeleteOrder,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },

  selection: {
    enabled: true,
    bulkActions: [
      {
        label: "Delete Selected",
        onClick: onBulkDeleteOrders,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },
});
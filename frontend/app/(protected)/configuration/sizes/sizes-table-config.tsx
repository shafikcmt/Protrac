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

type Size = z.infer<typeof schemas.Size>;

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Define columns for the sizes table
export const sizesColumns: ColumnDef<Size>[] = [
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
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Name"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[200px] truncate font-medium">
            {row.getValue("name")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "index",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Index"
      />
    ),
    cell: ({ row }) => {
      const index = row.getValue("index") as number | null | undefined;
      return (
        <Badge
          className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
          variant="outline">
          {index !== null && index !== undefined ? index : "—"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Created"
      />
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
      <DataTableColumnHeader
        column={column}
        title="Updated"
      />
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
      // Get actions from table meta
      const actions = (table.options.meta as any)?.rowActions;
      return (
        <DataTableRowActions
          row={row}
          actions={actions}
        />
      );
    },
  },
];

// Create table configuration factory
export const createSizesTableConfig = (
  onCreateSize: () => void,
  onEditSize: (size: Size) => void,
  onDeleteSize: (size: Size) => void,
  onBulkDeleteSizes: (sizes: Size[]) => void
): TableConfig<Size> => ({
  columns: sizesColumns,

  search: {
    column: "name",
    placeholder: "Search sizes...",
  },

  actions: {
    create: {
      label: "Create Size",
      onClick: onCreateSize,
      icon: CirclePlus,
    },
    row: [
      {
        label: "Edit",
        onClick: onEditSize,
        icon: Pencil,
      },
      {
        label: "Delete",
        onClick: onDeleteSize,
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
        onClick: onBulkDeleteSizes,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },
});

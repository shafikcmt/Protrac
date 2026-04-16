"use client";

import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Pencil, Trash2, CirclePlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { TableConfig } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type Color = z.infer<typeof schemas.Color>;

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Define columns for the colors table
export const colorsColumns: ColumnDef<Color>[] = [
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
export const createColorsTableConfig = (
  onCreateColor: () => void,
  onEditColor: (color: Color) => void,
  onDeleteColor: (color: Color) => void,
  onBulkDeleteColors: (colors: Color[]) => void
): TableConfig<Color> => ({
  columns: colorsColumns,

  search: {
    column: "name",
    placeholder: "Search colors...",
  },

  actions: {
    create: {
      label: "Create Color",
      onClick: onCreateColor,
      icon: CirclePlus,
    },
    row: [
      {
        label: "Edit",
        onClick: onEditColor,
        icon: Pencil,
      },
      {
        label: "Delete",
        onClick: onDeleteColor,
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
        onClick: onBulkDeleteColors,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },
});

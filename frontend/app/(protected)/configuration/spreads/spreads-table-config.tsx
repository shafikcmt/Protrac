"use client";

import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Pencil, Trash2, CirclePlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { TableConfig } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type Spread = z.infer<typeof schemas.Spread>;

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Define columns for the spreads table
export const spreadsColumns: ColumnDef<Spread>[] = [
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
    accessorKey: "number",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Spread Number"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-32 truncate font-medium sm:max-w-72 md:max-w-[31rem]">
            {row.getValue("number")}
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
        <div className="text-xs text-muted-foreground">
          {formatDate(row.getValue("created_at"))}
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
export const createSpreadsTableConfig = (
  onCreateSpread: () => void,
  onEditSpread: (spread: Spread) => void,
  onDeleteSpread: (spread: Spread) => void,
  onBulkDeleteSpreads: (spreads: Spread[]) => void
): TableConfig<Spread> => ({
  columns: spreadsColumns,

  search: {
    column: "number",
    placeholder: "Search spreads...",
  },

  actions: {
    create: {
      label: "Create Spread",
      onClick: onCreateSpread,
      icon: CirclePlus,
    },
    row: [
      {
        label: "Edit",
        onClick: onEditSpread,
        icon: Pencil,
      },
      {
        label: "Delete",
        onClick: onDeleteSpread,
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
        onClick: onBulkDeleteSpreads,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },
});

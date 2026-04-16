"use client";

import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Pencil, Trash2, CirclePlus, Scissors, Shell, Box } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { TableConfig, FilterOption } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type Line = z.infer<typeof schemas.ProductionLine>;

// Line type filter options
export const lineTypes: FilterOption[] = [
  {
    value: "cutting",
    label: "Cutting",
    icon: Scissors,
  },
  {
    value: "sewing",
    label: "Sewing",
    icon: Shell,
  },
  {
    value: "finishing",
    label: "Finishing",
    icon: Box,
  },
];

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Define columns for the lines table
export const linesColumns: ColumnDef<Line>[] = [
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
    accessorKey: "line_type",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Type"
      />
    ),
    cell: ({ row }) => {
      const lineType = row.getValue("line_type") as string;
      const displayType = lineType.charAt(0).toUpperCase() + lineType.slice(1);
      return (
        <div className="flex w-[100px] items-center">
          {lineType === "cutting" ? (
            <Scissors className="mr-2 size-4 text-muted-foreground" />
          ) : lineType === "sewing" ? (
            <Shell className="mr-2 size-4 text-muted-foreground" />
          ) : lineType === "finishing" ? (
            <Box className="mr-2 size-4 text-muted-foreground" />
          ) : (
            <></>
          )}
          <span>{displayType}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
export const createLinesTableConfig = (
  onCreateLine: () => void,
  onEditLine: (line: Line) => void,
  onDeleteLine: (line: Line) => void,
  onBulkDeleteLines: (lines: Line[]) => void
): TableConfig<Line> => ({
  columns: linesColumns,

  search: {
    column: "name",
    placeholder: "Search lines...",
  },

  filters: [
    {
      column: "line_type",
      title: "Type",
      options: lineTypes,
    },
  ],

  actions: {
    create: {
      label: "Create Line",
      onClick: onCreateLine,
      icon: CirclePlus,
    },
    row: [
      {
        label: "Edit",
        onClick: onEditLine,
        icon: Pencil,
      },
      {
        label: "Delete",
        onClick: onDeleteLine,
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
        onClick: onBulkDeleteLines,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },
});

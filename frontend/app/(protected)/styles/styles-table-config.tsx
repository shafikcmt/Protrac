"use client";

import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Pencil, Trash2, CirclePlus, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { TableConfig } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type Style = z.infer<typeof schemas.StyleWithParts>;

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Define columns for the styles table
export const stylesColumns: ColumnDef<Style>[] = [
  // ✅ Hidden column used for global search across all fields
  {
    id: "search_index",
    accessorFn: (row) => {
      const parts = (row as any).parts_details as any[] | undefined;

      const partsText = (parts ?? [])
        .map((p) => p?.name ?? p?.code ?? p?.part_name ?? "")
        .filter(Boolean)
        .join(" ");

      return [
        (row as any).name ?? "",
        (row as any).buyer_name ?? "",
        (row as any).season_name ?? "",
        partsText,
        (row as any).created_at ?? "",
        (row as any).updated_at ?? "",
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
    accessorKey: "image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Image" />
    ),
    cell: ({ row }) => {
      const imageUrl = row.getValue("image") as string | null;
      return (
        <div className="flex items-center justify-center w-12 h-12">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${row.getValue("name")} style`}
              className="w-12 h-12 object-cover rounded-md border"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-md border flex items-center justify-center text-xs text-muted-foreground">
              <Shirt />
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
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
    accessorKey: "parts_details",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Parts" />
    ),
    cell: ({ row }) => {
      const parts = row.getValue("parts_details") as any[] | undefined;
      const count = parts?.length || 0;
      return (
        <Badge
          variant="outline"
          className="h-5 min-w-5 rounded-sm px-1 font-mono tabular-nums"
        >
          {count} part{count !== 1 ? "s" : ""}
        </Badge>
      );
    },
    enableSorting: false,
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
export const createStylesTableConfig = (
  onCreateStyle: () => void,
  onEditStyle: (style: Style) => void,
  onDeleteStyle: (style: Style) => void,
  onBulkDeleteStyles: (styles: Style[]) => void
): TableConfig<Style> => ({
  columns: stylesColumns,

  // ✅ Search now matches Name + Buyer + Season + Parts + dates
  search: {
    column: "search_index",
    placeholder: "Search styles...",
  },

  actions: {
    create: {
      label: "Create Style",
      onClick: onCreateStyle,
      icon: CirclePlus,
    },
    row: [
      {
        label: "Edit",
        onClick: onEditStyle,
        icon: Pencil,
      },
      {
        label: "Delete",
        onClick: onDeleteStyle,
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
        onClick: onBulkDeleteStyles,
        variant: "destructive",
        icon: Trash2,
      },
    ],
  },
});
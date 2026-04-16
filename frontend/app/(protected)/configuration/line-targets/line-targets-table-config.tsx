"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, Plus } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import type { TableConfig } from "@/components/table/data-table-types";
import { schemas } from "@/types/api/client";

type LineTarget = z.infer<typeof schemas.LineTarget>;

export function createLineTargetsTableConfig(
  onCreateLineTarget: () => void,
  onEditLineTarget: (lineTarget: LineTarget) => void,
  onDeleteLineTarget: (lineTarget: LineTarget) => void,
  onBulkDeleteLineTargets: (lineTargets: LineTarget[]) => void
): TableConfig<LineTarget> {
  const columns: ColumnDef<LineTarget>[] = [
    {
      accessorKey: "line_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Production Line"
        />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("line_name")}</div>
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Date"
        />
      ),
      cell: ({ row }) => {
        const date = row.getValue("date") as string;
        return (
          <div className="font-mono">
            {format(parseISO(date), "MMM dd, yyyy")}
          </div>
        );
      },
    },
    {
      accessorKey: "target_quantity",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Target Quantity"
        />
      ),
      cell: ({ row }) => (
        <div className="font-semibold tabular-nums">
          {(row.getValue("target_quantity") as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "work_hours",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Work Hours"
        />
      ),
      cell: ({ row }) => {
        const hours = row.getValue("work_hours") as number | null;
        return <div className="tabular-nums">{hours ? `${hours}h` : "—"}</div>;
      },
    },
    {
      accessorKey: "worker_count",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Workers"
        />
      ),
      cell: ({ row }) => {
        const count = row.getValue("worker_count") as number | null;
        return <div className="tabular-nums">{count ? count : "—"}</div>;
      },
    },
    {
      id: "efficiency",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Target/Hour"
        />
      ),
      cell: ({ row }) => {
        const targetQuantity = row.getValue("target_quantity") as number;
        const workHours = row.getValue("work_hours") as number | null;

        if (!workHours) {
          return <div className="text-muted-foreground">—</div>;
        }

        const perHour = Math.round(targetQuantity / workHours);
        return (
          <Badge
            variant="secondary"
            className="tabular-nums">
            {perHour}/hr
          </Badge>
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

  return {
    columns,

    search: {
      column: "line_name",
      placeholder: "Search production lines...",
    },

    actions: {
      create: {
        label: "Add Line Target",
        onClick: onCreateLineTarget,
        icon: Plus,
      },
      row: [
        {
          label: "Edit",
          onClick: onEditLineTarget,
          icon: Pencil,
        },
        {
          label: "Delete",
          onClick: onDeleteLineTarget,
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
          onClick: onBulkDeleteLineTargets,
          variant: "destructive",
          icon: Trash2,
        },
      ],
    },
  };
}

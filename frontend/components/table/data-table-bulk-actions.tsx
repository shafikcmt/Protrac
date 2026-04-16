"use client";

import { Table } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BulkAction } from "./data-table-types";
import { Badge } from "../ui/badge";

interface DataTableBulkActionsProps<TData> {
  table: Table<TData>;
  bulkActions: BulkAction<TData>[];
}

export function DataTableBulkActions<TData>({
  table,
  bulkActions,
}: DataTableBulkActionsProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedData = selectedRows.map((row) => row.original);

  if (selectedRows.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8">
          Actions
          <Badge variant="outline" className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums text-sm">
            {selectedRows.length}
          </Badge>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {bulkActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={index}
              variant={action.variant}
              onClick={() => action.onClick(selectedData)}>
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

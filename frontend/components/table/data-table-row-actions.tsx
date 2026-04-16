"use client";

import { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableAction } from "./data-table-types";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  actions?: TableAction<TData>[];
}

export function DataTableRowActions<TData>({
  row,
  actions = [],
}: DataTableRowActionsProps<TData>) {
  if (!actions.length) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px]">
        {actions.map((action, index) => (
          <div key={index}>
            <DropdownMenuItem
              variant={action.variant}
              onClick={() => action.onClick(row.original)}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
            {index < actions.length - 1 && action.variant === "destructive" && (
              <DropdownMenuSeparator />
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

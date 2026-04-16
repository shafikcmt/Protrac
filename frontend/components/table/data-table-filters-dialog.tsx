"use client";

import { useState } from "react";
import { Table } from "@tanstack/react-table";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { TableFilter } from "./data-table-types";
import { Badge } from "@/components/ui/badge";

interface DataTableFiltersDialogProps<TData> {
  table: Table<TData>;
  filters: TableFilter[];
  activeFiltersCount: number;
}

export function DataTableFiltersDialog<TData>({
  table,
  filters,
  activeFiltersCount,
}: DataTableFiltersDialogProps<TData>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed">
          <ListFilter />
          Filters
          {activeFiltersCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => {
              const column = table.getColumn(filter.column);
              return column ? (
                <DataTableFacetedFilter
                  key={filter.column}
                  column={column}
                  title={filter.title}
                  options={filter.options}
                />
              ) : null;
            })}
          </div>
        </div>
        {activeFiltersCount > 0 && (
          <DialogFooter className="px-6 py-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                table.resetColumnFilters();
                setOpen(false);
              }}>
              Clear All Filters
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

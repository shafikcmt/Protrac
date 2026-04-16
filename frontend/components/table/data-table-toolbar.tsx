"use client";

import { Table } from "@tanstack/react-table";
import { X, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableFiltersDialog } from "./data-table-filters-dialog";
import { DataTableBulkActions } from "./data-table-bulk-actions";
import { TableConfig } from "./data-table-types";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  config?: TableConfig<TData>;
}

export function DataTableToolbar<TData>({
  table,
  config,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const searchConfig = config?.search;
  const filters = config?.filters || [];
  const activeFiltersCount = table.getState().columnFilters.length;

  // Show inline filters if 2 or fewer are active, otherwise show dialog
  const showInlineFilters = activeFiltersCount <= 2;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchConfig && (
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchConfig.placeholder}
              value={
                (table
                  .getColumn(searchConfig.column)
                  ?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table
                  .getColumn(searchConfig.column)
                  ?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] lg:w-[250px] pl-8"
            />
          </div>
        )}
        {/* Inline filters when 3 or fewer are active */}
        {showInlineFilters && filters.length > 0 && (
          <div className="hidden lg:flex items-center space-x-2">
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
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2 lg:px-3">
                Reset
                <X />
              </Button>
            )}
          </div>
        )}

        {/* Filters dialog when more than 3 are active */}
        {!showInlineFilters && filters.length > 0 && (
          <div className="hidden lg:flex items-center space-x-2">
            <DataTableFiltersDialog
              table={table}
              filters={filters}
              activeFiltersCount={activeFiltersCount}
            />
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2 lg:px-3">
                Reset
                <X />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <DataTableViewOptions table={table} />
        {config?.selection?.bulkActions &&
          config.selection.bulkActions.length > 0 && (
            <DataTableBulkActions
              table={table}
              bulkActions={config.selection.bulkActions}
            />
          )}
        {config?.actions?.create && (
          <Button
            size="sm"
            className="flex h-8"
            onClick={config.actions.create.onClick}>
            {config.actions.create.icon && <config.actions.create.icon />}
            {config.actions.create.label}
          </Button>
        )}
      </div>
    </div>
  );
}

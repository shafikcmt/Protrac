import { ColumnDef } from "@tanstack/react-table";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

// Custom filter function for array-based filtering (multi-select)
export const arrayFilter = (
  row: any,
  columnId: string,
  filterValue: string[]
): boolean => {
  if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }
  const cellValue = row.getValue(columnId);
  return filterValue.includes(cellValue);
};

export interface FilterOption {
  label: string | ReactNode;
  value: string;
  icon?: LucideIcon;
}

export interface TableFilter {
  column: string;
  title: string;
  options: FilterOption[];
}

export interface TableAction<TData = any> {
  label: string;
  onClick: (data: TData) => void;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
}

export interface BulkAction<TData = any> {
  label: string;
  onClick: (selectedRows: TData[]) => void;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
}

export interface TableConfig<TData = any> {
  // Column definitions
  columns: ColumnDef<TData, any>[];

  // Search configuration
  search?: {
    column: string;
    placeholder: string;
  };

  // Filter configuration
  filters?: TableFilter[];
  // Default filters to apply on table initialization
  defaultFilters?: Record<string, string[]>;

  // Default column visibility state
  defaultColumnVisibility?: Record<string, boolean>;

  // Action configuration
  actions?: {
    create?: {
      label: string;
      onClick: () => void;
      icon?: LucideIcon;
    };
    row?: TableAction<TData>[];
  };
  // Selection configuration
  selection?: {
    enabled: boolean;
    bulkActions?: BulkAction<TData>[];
  };
}

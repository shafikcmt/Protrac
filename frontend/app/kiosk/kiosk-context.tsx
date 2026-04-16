"use client";

import { createContext, useContext } from "react";

interface KioskFilters {
  // Common filters
  order_id?: number;
  order_ids?: number[];
  date_from?: string;
  date_to?: string;
  active_only?: boolean;
  buyer_id?: number;
  buyer_ids?: number[];
  style_id?: number;
  style_ids?: number[];
  colors?: string[];
  sizes?: string[];

  // Sewing-specific filters
  production_line_id?: number;
  production_line_ids?: number[];

  // Finishing-specific filters
  finishing_line_id?: number;
  finishing_line_ids?: number[];
  color?: string;
  size?: string;
  style?: string;

  // Daily production report specific
  report_date?: string;

  // Sewing V2 specific
  date?: string;
}

interface KioskContextType {
  filters: KioskFilters;
  setFilters: (filters: KioskFilters) => void;
}

export const KioskContext = createContext<KioskContextType | undefined>(
  undefined
);

export const useKioskFilters = () => {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error("useKioskFilters must be used within KioskLayout");
  }
  return context;
};

export type { KioskFilters, KioskContextType };

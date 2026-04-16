import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type Order = z.infer<typeof schemas.Order>;

interface SelectedOrderState {
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  clearSelectedOrder: () => void;
}

export const useSelectedOrderStore = create<SelectedOrderState>()(
  persist(
    (set) => ({
      selectedOrder: null,
      setSelectedOrder: (order) => set({ selectedOrder: order }),
      clearSelectedOrder: () => set({ selectedOrder: null }),
    }),
    {
      name: "selected-order-storage",
    }
  )
);

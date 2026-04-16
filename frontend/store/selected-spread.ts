import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type Spread = z.infer<typeof schemas.Spread>;

interface SelectedSpreadState {
  selectedSpread: Spread | null;
  setSelectedSpread: (spread: Spread | null) => void;
}

export const useSelectedSpreadStore = create<SelectedSpreadState>()(
  persist(
    (set) => ({
      selectedSpread: null,
      setSelectedSpread: (spread) => set({ selectedSpread: spread }),
    }),
    {
      name: "selected-spread-storage",
    }
  )
);

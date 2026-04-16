import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { schemas } from "@/types/api/client";

type AuthTokens = z.infer<typeof schemas.TokenObtainPair>;

interface AuthState {
  tokens: AuthTokens | null;
  setTokens: (tokens: AuthTokens) => void;
  clearTokens: () => void;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      isAuthenticated: false,
      hasHydrated: false,

      setTokens: (tokens) =>
        set({
          tokens,
          isAuthenticated: true,
        }),

      clearTokens: () =>
        set({
          tokens: null,
          isAuthenticated: false,
        }),

      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

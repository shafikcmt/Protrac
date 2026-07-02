import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { publicApiHooks } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { schemas } from "@/types/api/client";

type LoginCredentials = z.infer<typeof schemas.TokenObtainPairRequest>;
type LoginResponse = z.infer<typeof schemas.TokenObtainPair>;

export const useAuth = () => {
  const { tokens, setTokens, clearTokens, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const loginMutation = publicApiHooks.usePost(
    "/api/accounts/login/",
    undefined,
    {
      onSuccess: (data: LoginResponse) => {
        // Drop any cached data from a previously signed-in account so a new
        // user (e.g. a different production line) never sees stale data that
        // was cached under URL-only query keys.
        queryClient.clear();
        setTokens({
          access: data.access,
          refresh: data.refresh,
        });
      },
    }
  );

  const login = (credentials: LoginCredentials) => {
    loginMutation.mutate(credentials);
  };

  const logout = () => {
    clearTokens();
    // Clear React Query cache on logout to prevent cross-account/line data
    // bleeding into the next session on the same browser.
    queryClient.clear();
  };

  return {
    tokens,
    login,
    logout,
    isAuthenticated,
    error: loginMutation.error,
    isLoading: loginMutation.isPending,
    isSuccess: loginMutation.isSuccess,
  };
};

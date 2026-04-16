import { z } from "zod";
import { publicApiHooks } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { schemas } from "@/types/api/client";

type LoginCredentials = z.infer<typeof schemas.TokenObtainPairRequest>;
type LoginResponse = z.infer<typeof schemas.TokenObtainPair>;

export const useAuth = () => {
  const { tokens, setTokens, clearTokens, isAuthenticated } = useAuthStore();

  const loginMutation = publicApiHooks.usePost(
    "/api/accounts/login/",
    undefined,
    {
      onSuccess: (data: LoginResponse) => {
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

import { ZodiosHooks } from "@zodios/react";
import { useAuthStore } from "@/store/auth";
import { pluginToken } from "@zodios/plugins";
import { createApiClient } from "@/types/api/client";


const getBackendApiBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ??
    "http://192.168.245.25:8000"
  );
};

// Unauthenticated client for login/public endpoints
export const publicApi = createApiClient(getBackendApiBaseUrl());
export const publicApiHooks = new ZodiosHooks("publicApi", publicApi);

// Authenticated client with token plugin
export const api = createApiClient(getBackendApiBaseUrl());




api.use(
  pluginToken({
    getToken: async () => {
      const { tokens } = useAuthStore.getState();
      return tokens?.access || undefined;
    },
    renewToken: async () => {
      const { tokens, setTokens, clearTokens } = useAuthStore.getState();

      if (!tokens?.refresh) {
        throw new Error("No refresh token");
      }

      try {
        const response = await publicApi.accounts_refresh_token_create({
          refresh: tokens.refresh,
        });

        const newTokens = {
          access: response.access,
          refresh: tokens.refresh,
        };

        setTokens(newTokens);
        return response.access;
      } catch (error) {
        clearTokens();
        throw error;
      }
    },
  })
);

export const apiHooks = new ZodiosHooks("protrac", api);

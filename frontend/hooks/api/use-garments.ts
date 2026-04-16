import { z } from "zod";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type Garment = z.infer<typeof schemas.Garment>;

interface UseGarmentsOptions {
  orderId?: number | null;
  orderNumber?: string | null;
  status?: string | null;
}

export const useGarments = (options: UseGarmentsOptions = {}) => {
  const { orderId, orderNumber, status } = options;

  // Build query parameters
  const queries: Record<string, any> = {};
  if (orderId) queries.order = orderId;
  if (orderNumber) queries.order__order_number = orderNumber;
  if (status) queries.status = status;

  // List garments with pagination and filtering
  const garmentsQuery = apiHooks.useGet(
    "/api/tracking/garments/",
    Object.keys(queries).length > 0 ? { queries } : undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  return {
    garments: garmentsQuery.data?.results || [],
    isLoading: garmentsQuery.isLoading,
    error: garmentsQuery.error,
    refetch: garmentsQuery.refetch,
    isError: garmentsQuery.isError,
  };
};

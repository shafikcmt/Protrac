"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { usePathname, useRouter } from "next/navigation";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, hasHydrated, router, pathname]);

  return hasHydrated && isAuthenticated ? children : null;
}

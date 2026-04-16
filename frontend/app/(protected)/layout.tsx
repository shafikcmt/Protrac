"use client";

import ProtectedRoute from "@/components/providers/protected-route";
import { AppLayout } from "@/components/app/app-layout";
import type { User } from "@/components/app/nav-user";
import { navigation } from "@/lib/navigation";
import { apiHooks } from "@/lib/api";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user profile data from API
  const { data: userProfile, isLoading } = apiHooks.useGet(
    "/api/accounts/profile/",
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create user object from API data or fallback to placeholder while loading
  const user: User = userProfile
    ? {
        name: userProfile.full_name || userProfile.username || "User",
        email: userProfile.email || "user@humanaapparels.com",
        avatar: userProfile.image || "",
      }
    : {
        name: "Loading...",
        email: "loading@humanaapparels.com",
        avatar: "",
      };

  return (
    <ProtectedRoute>
      <AppLayout
        navigation={navigation}
        user={user}>
        {children}
      </AppLayout>
    </ProtectedRoute>
  );
}

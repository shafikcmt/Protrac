"use client";

import { apiHooks } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/app/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Command } from "lucide-react";
import { useAuth } from "@/hooks/api/use-auth";

export function ScannerHeader() {
  const { logout } = useAuth();

  // Get user profile with scanner assignment
  const { data: userProfile } = apiHooks.useGet(
    "/api/accounts/profile/",
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
  };

  const scanner = userProfile?.assigned_scanner;

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo and Company */}
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Command className="size-4" />
          </div>
          <div className="grid text-left text-sm leading-tight">
            <span className="font-medium">ProTrac</span>
            <span className="text-xs text-muted-foreground">
              Humana Apparels Pvt. Ltd.
            </span>
          </div>
        </div>

        {/* Scanner Info and User Profile */}
        <div className="flex items-center gap-4">
          {/* Scanner Info */}
          {scanner && (
            <Badge
              variant="secondary"
              className="font-medium">
              {scanner.name}
            </Badge>
          )}

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={userProfile?.image || undefined} />
                <AvatarFallback>
                  {userProfile?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={userProfile?.image ?? undefined}
                      alt={userProfile?.full_name}
                    />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(
                        userProfile?.full_name || userProfile?.username || "U"
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {userProfile?.full_name}
                    </span>
                    <span className="truncate text-xs">
                      {userProfile?.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <ModeToggle className="h-8 w-8" />
        </div>
      </div>
    </header>
  );
}

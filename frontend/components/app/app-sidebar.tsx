"use client";

import * as React from "react";
import { Command } from "lucide-react";
import { NavMain } from "@/components/app/nav-main";
import { NavUser } from "@/components/app/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import type { User } from "@/components/app/nav-user";
import type { NavItem } from "@/components/app/nav-main";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
  navigation: NavItem[];
}

export function AppSidebar({ user, navigation, ...props }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">ProTrac</span>
                  <span className="truncate text-xs">
                    Humana Apparels Pvt. Ltd.
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigation} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import { AppSidebar } from "@/components/app/app-sidebar";
import { ModeToggle } from "@/components/app/mode-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { User } from "@/components/app/nav-user";
import type { NavItem } from "@/components/app/nav-main";
import React from "react";

// Main Layout Component
interface AppLayoutProps {
  user: User;
  navigation: NavItem[];
  children: React.ReactNode;
}

export function AppLayout({ user, navigation, children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        navigation={navigation}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

// Header Component
export interface BreadcrumbItem {
  title: string;
  url?: string;
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export function AppHeader({ breadcrumbs = [], children }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <ModeToggle
          variant="ghost"
          className="size-7"
        />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}

                  <BreadcrumbItem
                    className={
                      index === breadcrumbs.length - 1 ? "" : "hidden md:block"
                    }>
                    {index === breadcrumbs.length - 1 || !crumb.url ? (
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.url}>
                        {crumb.title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
      {children && <div className="ml-auto px-4">{children}</div>}
    </header>
  );
}

// Content Component
interface AppContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AppContent({ children, className, ...props }: AppContentProps) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 p-4 pt-0", className)}
      {...props}>
      {children}
    </div>
  );
}

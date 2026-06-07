"use client";

import { useEffect, useState } from "react";
import { Command, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KioskModeToggle } from "./kiosk-mode-toggle";
import { KioskFiltersDialog } from "./kiosk-filters-dialog";
import { useKioskFilters } from "@/app/kiosk/kiosk-context";
import { usePathname } from "next/navigation";

export function KioskHeader() {
  const { filters, setFilters } = useKioskFilters();
  const pathname = usePathname();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const day = days[now.getDay()];
      const mon = months[now.getMonth()];
      const date = String(now.getDate()).padStart(2, "0");
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClock(`${day}, ${mon} ${date}  ·  ${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const activeFiltersCount = Object.keys(filters).filter((key) => {
    if (key === "active_only") return false;
    return filters[key as keyof typeof filters] !== undefined;
  }).length;

  const isKioskRoot = pathname === "/kiosk";

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
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

        {/* Live clock — center */}
        {clock && (
          <span className="hidden md:block text-sm font-mono tabular-nums text-muted-foreground select-none">
            {clock}
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isKioskRoot && (
            <div className="relative">
              <KioskFiltersDialog filters={filters} onFiltersChange={setFilters}>
                <Button variant="outline" size="icon">
                  <ListFilter className="h-[1.2rem] w-[1.2rem]" />
                </Button>
              </KioskFiltersDialog>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
          )}
          <KioskModeToggle />
        </div>
      </div>
    </header>
  );
}

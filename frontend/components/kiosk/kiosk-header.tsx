import { Command, ListFilter, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/app/mode-toggle";
import { KioskFiltersDialog } from "./kiosk-filters-dialog";
import { useKioskFilters } from "@/app/kiosk/kiosk-context";
import { usePathname, useRouter } from "next/navigation";

export function KioskHeader() {
  const { filters, setFilters } = useKioskFilters();
  const pathname = usePathname();
  const router = useRouter();

  // Count active filters (excluding active_only)
  const activeFiltersCount = Object.keys(filters).filter((key) => {
    if (key === "active_only") return false;
    return filters[key as keyof typeof filters] !== undefined;
  }).length;

  const isKioskRoot = pathname === "/kiosk";

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
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

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isKioskRoot && (
            <div className="relative">
              <KioskFiltersDialog
                filters={filters}
                onFiltersChange={setFilters}>
                <Button
                  variant="outline"
                  size="icon">
                  <ListFilter className="h-[1.2rem] w-[1.2rem]" />
                </Button>
              </KioskFiltersDialog>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

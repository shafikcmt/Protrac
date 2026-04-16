"use client";

import { useState,useEffect } from "react";
import { z } from "zod";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiHooks } from "@/lib/api";
import { schemas } from "@/types/api/client";

type Spread = z.infer<typeof schemas.Spread>;

interface SpreadSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSpread: (spread: Spread | null) => void;
  onSkip: () => void;
  selectedSpread?: Spread | null;
}

export function SpreadSelectionDialog({
  open,
  onOpenChange,
  onSelectSpread,
  onSkip,
  selectedSpread,
}: SpreadSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
  if (!open) setSearchTerm("");
}, [open]);

  // Fetch spreads
  const spreadsQuery = apiHooks.useGet("/api/tracking/spreads/", undefined, {
    enabled: open,
  });

  const spreads = spreadsQuery.data?.results || [];

  // Filter spreads based on search term
  const q = searchTerm.trim().toLowerCase();

  const filteredSpreads = spreads.filter((spread) => {
    if (!q) return true;
    const num = String(spread.number ?? "").toLowerCase(); // ✅ safe
    return num.includes(q);
  });

  const handleSelectSpread = (spread: Spread) => {
    onSelectSpread(spread);
    onOpenChange(false);
  };

  const handleClear = () => {
    onSelectSpread(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:min-w-xl overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Select Spread to Filter By</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Current Selection - Compact Display */}
          {selectedSpread && (
            <div className="relative text-sm p-3 bg-muted/30 rounded-md border border-muted">
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 text-xs">
                Current
              </Badge>
              <div className="pr-16 space-y-1">
                <div className="font-medium font-mono">
                  Spread {selectedSpread.number}
                </div>
                <div className="text-xs text-muted-foreground">
                  Created{" "}
                  {selectedSpread.created_at
                    ? new Date(selectedSpread.created_at).toLocaleDateString()
                    : "Unknown"}
                </div>
              </div>
            </div>
          )}
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search spreads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          {/* Spreads List */}
          <ScrollArea className="h-96">
            {spreadsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-12 w-full"
                  />
                ))}
              </div>
            ) : filteredSpreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No spreads found" : "No spreads available"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSpreads.map((spread) => (
                  <div
                    key={spread.id}
                    onClick={() => handleSelectSpread(spread)}
                    className="p-3 rounded-md border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium font-mono">
                          Spread {spread.number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created{" "}
                          {spread.created_at
                            ? new Date(spread.created_at).toLocaleDateString()
                            : "Unknown"}
                        </div>
                      </div>
                      {selectedSpread?.id === spread.id && (
                        <Badge variant="secondary">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>{" "}
        </div>

        {selectedSpread && (
          <DialogFooter className="px-6 py-4 border-t">
            <Button
              variant="outline"
              onClick={handleClear}>
              Clear Selection
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

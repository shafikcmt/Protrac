"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Printer, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReactToPrint } from "react-to-print";
import { schemas } from "@/types/api/client";
import { LabelRenderer, LabelData } from "./label-renderer";
import { PAPER_CONFIGS, PaperSize } from "./paper-config";

type Bundle = z.infer<typeof schemas.Bundle>;

interface LabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBundles: Bundle[];
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  selectedBundles,
}: LabelPrintDialogProps) {
  const [activeTab, setActiveTab] = useState<"bundle" | "garment">("bundle");
  const [paperSize, setPaperSize] = useState<PaperSize>("thermal");
  const printRef = useRef<HTMLDivElement>(null);

  // All bundles are now printable (no cut part distinction)
  const printableBundles = selectedBundles;

  // Get bundle IDs for garment fetching
  const bundleIds = printableBundles.map((bundle) => bundle.id);

  // Fetch garments only for selected bundles
  const { data: allGarments = [], isLoading: garmentsLoading } = useQuery({
    queryKey: ["garments-for-bundles", bundleIds],
    queryFn: async () => {
      if (bundleIds.length === 0) return [];

      const allGarments = [];
      let page = 1;
      let hasMore = true;

      // Keep fetching pages until no more pages
      while (hasMore) {
        try {
          const response = await api.tracking_garments_list({
            queries: {
              bundle_ids: bundleIds.join(","),
              page: page,
            },
          });

          // Add garments from this page
          if (response.results) {
            allGarments.push(...response.results);
          }

          // Check if there's a next page
          hasMore = !!response.next;
          page++;
        } catch (error) {
          console.error(`Error fetching garments for bundles:`, error);
          break;
        }
      }

      return allGarments;
    },
    enabled: bundleIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Garments are filtered by the selected bundle IDs
  const relevantGarments = allGarments;
  // Generate label data
  const labels: LabelData[] =
    activeTab === "bundle"
      ? printableBundles.map((bundle) => ({
          type: "bundle" as const,
          bundle,
          key: `bundle-${bundle.id}`,
        }))
      : relevantGarments.map((garment) => ({
          type: "garment" as const,
          garment,
          key: `garment-${garment.id}`,
        }));

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${PAPER_CONFIGS[paperSize].name} Print`,
    pageStyle: PAPER_CONFIGS[paperSize].printStyles,
  });

  // Keyboard shortcut
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrint]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl lg:min-w-[80vw] h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/50 flex-shrink-0">
          <DialogTitle>Print Labels</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="px-6 py-3 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <Tabs
                value={activeTab}
                onValueChange={(tab) =>
                  setActiveTab(tab as "bundle" | "garment")
                }>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="bundle">Bundle Labels</TabsTrigger>
                  <TabsTrigger value="garment">Garment Labels</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select
                value={paperSize}
                onValueChange={(value: PaperSize) => setPaperSize(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue>
                    <span className="text-xs">
                      {PAPER_CONFIGS[paperSize].name} (
                      {PAPER_CONFIGS[paperSize].dimensions})
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PAPER_CONFIGS).map((config) => (
                    <SelectItem
                      key={config.id}
                      value={config.id}>
                      {config.name} ({config.dimensions})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(90vh-200px)]">
            <div className="p-6">
              {printableBundles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bundles selected</p>
                  <p className="text-sm">
                    Select bundles to print labels for tracking
                  </p>
                </div>
              ) : activeTab === "garment" && garmentsLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin rounded-full border-2 border-dashed border-current" />
                  <p>Loading garments...</p>
                </div>
              ) : labels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No labels to display
                </div>
              ) : (
                <>
                  {/* Preview Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {labels.map((label) => (
                      <div
                        key={label.key}
                        className="flex justify-center items-center">
                        <LabelRenderer
                          label={label}
                          isPreview={true}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Print Content (Hidden) */}
                  <div
                    ref={printRef}
                    className={`hidden print:block print-content ${
                      paperSize === "a4" ? "print-label-grid" : ""
                    }`}>
                    {labels.map((label) => (
                      <div
                        key={`print-${label.key}`}
                        className="print-label">
                        <LabelRenderer
                          label={label}
                          isPreview={false}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/50 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              disabled={
                labels.length === 0 ||
                (activeTab === "garment" && garmentsLoading)
              }
              className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {activeTab === "garment" && garmentsLoading
                ? "Loading..."
                : `Print ${labels.length} Label${
                    labels.length !== 1 ? "s" : ""
                  }`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

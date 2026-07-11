"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  History,
  PackagePlus,
  List,
  LayoutList,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { schemas } from "@/types/api/client";
import { z } from "zod";
import { BundleIssueInfo } from "@/components/scanner/bundle-issue-info";
import {
  CreatedBundlesList,
  type CreatedBundlesView,
} from "@/components/scanner/created-bundles-list";
import type { BundleTransferInput } from "@/app/scan/bundle-issue/use-bundle-issue-scanner";

/** Bounded, viewport-aware height so the list scrolls internally and the right
 *  card stays visually balanced against the left column (form + feedback). */
const SCROLL_HEIGHT = "h-[calc(100vh-20rem)] max-h-[440px] min-h-[320px]";

export type RecentIssuesView = "list" | "grouped";

type BundleIssueInfoResponse = z.infer<typeof schemas.BundleIssueInfoResponse>;
type PaginatedBundleList = z.infer<typeof schemas.PaginatedBundleList>;

interface SewingLine {
  id: number;
  name: string;
  line_type: string;
}

interface BundleIssuePanelProps {
  /** Recent Bundle Issues (recently issued bundles). */
  recentData?: BundleIssueInfoResponse;
  isLoadingRecent: boolean;
  /** Bundles still in "created" status — the worklist available to issue. */
  createdData?: PaginatedBundleList;
  isLoadingCreated: boolean;
  isErrorCreated: boolean;
  /** Fill the scan form's Tracking Code field from a "Ready to Issue" row. */
  onSelect: (trackingCode: string) => void;
  /** Sewing lines a selection can be transferred to. */
  sewingLines: SewingLine[];
  /** Transfer selected bundles to a sewing line (awaited). */
  onTransfer: (data: BundleTransferInput) => Promise<unknown>;
  isTransferring: boolean;
}

/**
 * Single card with two tabs — "Ready to Issue" (created-status bundles, default)
 * and "Recent Issues" (recently issued). Recent Issues rows can be selected via
 * checkboxes and transferred to a different sewing line (fixing a wrong-line
 * issue) after a confirmation dialog. Both lists are fetched once at the page
 * hook level, so switching tabs never triggers a refetch.
 */
export function BundleIssuePanel({
  recentData,
  isLoadingRecent,
  createdData,
  isLoadingCreated,
  isErrorCreated,
  onSelect,
  sewingLines,
  onTransfer,
  isTransferring,
}: BundleIssuePanelProps) {
  const recentRows = recentData?.results ?? [];
  const recentCount = recentRows.length;
  const createdCount = createdData?.results?.length ?? 0;
  const scannerName = recentData?.scanner_info?.scanner_name;

  // View toggles (session-local only).
  const [readyView, setReadyView] = React.useState<CreatedBundlesView>("list");
  const [recentView, setRecentView] = React.useState<RecentIssuesView>("list");

  const showReadyToggle =
    !isLoadingCreated && !isErrorCreated && createdCount > 0;
  const showRecentToggle = !isLoadingRecent && recentCount > 0;

  // ── Transfer selection state ──
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [targetLineId, setTargetLineId] = React.useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const toggleSelect = (bundleId: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });

  const clearSelection = () => {
    setSelectedIds(new Set());
    setTargetLineId(undefined);
  };

  const selectedRows = recentRows.filter((r) => selectedIds.has(r.bundle_id));
  const targetLine = sewingLines.find((l) => String(l.id) === targetLineId);

  const handleConfirm = async () => {
    if (!targetLine) return;
    try {
      await onTransfer({
        bundle_ids: Array.from(selectedIds),
        sewing_line: targetLine.id,
      });
      setConfirmOpen(false);
      clearSelection();
    } catch {
      // Error toast is surfaced by the mutation's onError; keep the dialog open.
    }
  };

  return (
    <Card className="py-4 gap-3">
      <CardHeader className="px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Bundle Issues
          {scannerName && (
            <Badge variant="outline" className="ml-auto">
              {scannerName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4">
        <Tabs defaultValue="ready-to-issue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="ready-to-issue"
              className="flex items-center gap-2"
            >
              <PackagePlus className="h-4 w-4" />
              Ready to Issue
              {createdCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {createdCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="recent-issues"
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Recent Issues
              {recentCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {recentCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ready-to-issue">
            {showReadyToggle && (
              <div className="mb-2 flex justify-end">
                <ViewToggle
                  value={readyView}
                  onChange={(v) => setReadyView(v as CreatedBundlesView)}
                />
              </div>
            )}
            {/* Single both-axis scroll container. The flat table is wider than
                the card; neutralising the shared Table's own overflow-x wrapper
                (data-slot=table-container) lets THIS container do the scrolling,
                so the horizontal scrollbar stays pinned to the visible viewport
                instead of the bottom of the full-height table. */}
            <div
              className={cn(
                SCROLL_HEIGHT,
                "overflow-auto [&_[data-slot=table-container]]:overflow-visible"
              )}
            >
              <CreatedBundlesList
                data={createdData}
                isLoading={isLoadingCreated}
                isError={isErrorCreated}
                view={readyView}
                onSelect={onSelect}
              />
            </div>
          </TabsContent>

          <TabsContent value="recent-issues">
            {showRecentToggle && (
              <div className="mb-2 flex justify-end">
                <ViewToggle
                  value={recentView}
                  onChange={(v) => setRecentView(v as RecentIssuesView)}
                />
              </div>
            )}

            {/* Explains why some rows aren't selectable (already completed, etc.). */}
            <p className="mb-2 text-xs text-muted-foreground">
              Only bundles still issued to a line can be transferred.
            </p>

            {/* Selection action bar — appears when 1+ transferable rows chosen. */}
            {selectedIds.size > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                <span className="text-xs font-medium">
                  {selectedIds.size} selected
                </span>
                <Select value={targetLineId} onValueChange={setTargetLineId}>
                  <SelectTrigger className="h-8 w-[170px] text-xs">
                    <SelectValue placeholder="Transfer to line…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sewingLines.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!targetLineId || isTransferring}
                  onClick={() => setConfirmOpen(true)}
                >
                  <ArrowRightLeft className="mr-1 size-3.5" />
                  Transfer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={clearSelection}
                  aria-label="Clear selection"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            <ScrollArea className={cn(SCROLL_HEIGHT, "pr-3")}>
              <BundleIssueInfo
                data={recentData}
                isLoading={isLoadingRecent}
                view={recentView}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Confirmation before moving bundles between lines. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Transfer {selectedRows.length} bundle
              {selectedRows.length === 1 ? "" : "s"} to{" "}
              {targetLine?.name ?? "…"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Review the line change for each bundle before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[240px] space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
            {selectedRows.map((r) => (
              <div
                key={r.bundle_id}
                className="flex items-center gap-2 tabular-nums"
              >
                <span className="font-mono">{r.tracking_code}</span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                  {r.issued_to_sewing_line}
                  <ArrowRightLeft className="size-3" />
                  <span className="font-medium text-foreground">
                    {targetLine?.name ?? "…"}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={isTransferring}>
              {isTransferring ? "Transferring…" : "Confirm transfer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Compact List/Grouped segmented toggle shared by both tabs. */
function ViewToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      aria-label="List view mode"
      className="shrink-0"
    >
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className="gap-1.5 px-2.5 text-xs"
      >
        <List className="size-3.5" />
        List
      </ToggleGroupItem>
      <ToggleGroupItem
        value="grouped"
        aria-label="Grouped view"
        className="gap-1.5 px-2.5 text-xs"
      >
        <LayoutList className="size-3.5" />
        Grouped
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

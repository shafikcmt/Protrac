"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Package, History, PackagePlus, List, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { schemas } from "@/types/api/client";
import { z } from "zod";
import { BundleIssueInfo } from "@/components/scanner/bundle-issue-info";
import {
  CreatedBundlesList,
  type CreatedBundlesView,
} from "@/components/scanner/created-bundles-list";

/** Bounded, viewport-aware height so the list scrolls internally and the right
 *  card stays visually balanced against the left column (form + feedback). */
const SCROLL_HEIGHT = "h-[calc(100vh-20rem)] max-h-[440px] min-h-[320px]";

type BundleIssueInfoResponse = z.infer<typeof schemas.BundleIssueInfoResponse>;
type PaginatedBundleList = z.infer<typeof schemas.PaginatedBundleList>;

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
}

/**
 * Single card with two tabs — "Ready to Issue" (created-status bundles, default)
 * and "Recent Issues" (recently issued). Mirrors the AssemblyTrackingInfo tabbed
 * layout. Both lists are fetched once at the page hook level and passed in as
 * props, so switching tabs never triggers a refetch.
 */
export function BundleIssuePanel({
  recentData,
  isLoadingRecent,
  createdData,
  isLoadingCreated,
  isErrorCreated,
  onSelect,
}: BundleIssuePanelProps) {
  const recentCount = recentData?.results?.length ?? 0;
  const createdCount = createdData?.results?.length ?? 0;
  const scannerName = recentData?.scanner_info?.scanner_name;

  // List vs grouped view for the "Ready to Issue" list (session-local only).
  const [readyView, setReadyView] = React.useState<CreatedBundlesView>("list");
  // Show the toggle only when there are bundles to arrange.
  const showViewToggle =
    !isLoadingCreated && !isErrorCreated && createdCount > 0;

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
            {showViewToggle && (
              <div className="mb-2 flex justify-end">
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={readyView}
                  onValueChange={(v) =>
                    v && setReadyView(v as CreatedBundlesView)
                  }
                  aria-label="Bundle list view"
                >
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                    List
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grouped" aria-label="Grouped view">
                    <LayoutList className="h-4 w-4" />
                    Grouped
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
            <ScrollArea className={SCROLL_HEIGHT}>
              <CreatedBundlesList
                data={createdData}
                isLoading={isLoadingCreated}
                isError={isErrorCreated}
                view={readyView}
                onSelect={onSelect}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recent-issues">
            <ScrollArea className={cn(SCROLL_HEIGHT, "pr-3")}>
              <BundleIssueInfo data={recentData} isLoading={isLoadingRecent} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

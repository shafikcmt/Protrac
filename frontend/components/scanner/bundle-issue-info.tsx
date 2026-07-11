"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { schemas } from "@/types/api/client";
import { z } from "zod";
import { StyleSizeGroups } from "@/components/scanner/style-size-groups";
import type { RecentIssuesView } from "@/components/scanner/bundle-issue-panel";

type BundleIssueInfoResponse = z.infer<typeof schemas.BundleIssueInfoResponse>;
type RecentIssue = BundleIssueInfoResponse["results"][number];

interface BundleIssueInfoProps {
  data?: BundleIssueInfoResponse;
  isLoading: boolean;
  /** Flat list ("list") or grouped-by-Style·Size ("grouped"). */
  view: RecentIssuesView;
  /** Selected bundle ids (for transfer). */
  selectedIds: Set<number>;
  /** Toggle a row's selection. */
  onToggleSelect: (bundleId: number) => void;
}

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

/** Only bundles still sitting on a sewing line can be transferred. */
function isTransferable(item: RecentIssue): boolean {
  return item.status === "issued_to_sewing";
}

/** Short, at-a-glance label + badge style for a bundle's current status, so a
 *  row visibly explains why it is (or isn't) selectable for transfer. */
function statusMeta(status: string): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  switch (status) {
    case "issued_to_sewing":
      return { label: "Issued", variant: "default" };
    case "completed":
      return { label: "Completed", variant: "outline" };
    case "created":
      return { label: "Created", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}

/**
 * Body-only content for the "Recent Issues" tab. Rows carry a checkbox (enabled
 * only for transferable bundles) so one or more can be selected and moved to a
 * different sewing line. The surrounding Card, header, scope badge, view toggle,
 * transfer action bar and scroll area are provided by the parent.
 */
export function BundleIssueInfo({
  data,
  isLoading,
  view,
  selectedIds,
  onToggleSelect,
}: BundleIssueInfoProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            {i < 4 && <Separator />}
          </div>
        ))}
      </div>
    );
  }

  const bundles = data?.results || [];

  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Package className="h-8 w-8 mb-2" />
        <p className="text-sm">No recent bundle issues</p>
      </div>
    );
  }

  const rows = (items: RecentIssue[]) => (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id ?? item.bundle_id}>
          <RecentIssueRow
            item={item}
            selected={selectedIds.has(item.bundle_id)}
            onToggleSelect={onToggleSelect}
          />
          {index < items.length - 1 && <Separator className="mt-3" />}
        </div>
      ))}
    </div>
  );

  if (view === "grouped") {
    return (
      <StyleSizeGroups
        items={bundles}
        renderItems={(items) => <div className="p-3">{rows(items)}</div>}
      />
    );
  }

  return rows(bundles);
}

function RecentIssueRow({
  item,
  selected,
  onToggleSelect,
}: {
  item: RecentIssue;
  selected: boolean;
  onToggleSelect: (bundleId: number) => void;
}) {
  const selectable = isTransferable(item);
  const status = statusMeta(item.status);
  return (
    <div className={cn("flex gap-2", !selectable && "opacity-60")}>
      {selectable ? (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(item.bundle_id)}
          aria-label={`Select bundle ${item.tracking_code}`}
          title="Select for transfer"
          className="mt-1"
        />
      ) : (
        // Not a dead/greyed checkbox: a neutral lock marker keeps row alignment
        // and signals the bundle can no longer be transferred (see status badge).
        <span
          className="mt-1 flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          title="Not transferable — no longer issued to a line"
          aria-hidden="true"
        >
          <Lock className="size-3" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="font-mono text-xs">
                {item.tracking_code}
              </Badge>
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
            </div>
            <p className="text-sm font-medium">
              {item.order_number} • {item.cut_part_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Issued to: {item.issued_to_sewing_line}
            </p>
          </div>
          <div className="text-right">
            {item.created_at && (
              <>
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(item.created_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(item.created_at)}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Qty: {item.quantity}</span>
          <span>•</span>
          <span>Style: {item.style_name}</span>
          <span>•</span>
          <span>
            {item.color_name} / {item.size_name}
          </span>
        </div>
      </div>
    </div>
  );
}

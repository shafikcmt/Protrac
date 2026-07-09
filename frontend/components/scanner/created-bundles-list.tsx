"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PackageX, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type Bundle = z.infer<typeof schemas.Bundle>;
type PaginatedBundleList = z.infer<typeof schemas.PaginatedBundleList>;

export type CreatedBundlesView = "list" | "grouped";

interface CreatedBundlesListProps {
  data?: PaginatedBundleList;
  isLoading: boolean;
  isError: boolean;
  /** Flat table ("list") or grouped-by-Style·Size ("grouped"). */
  view: CreatedBundlesView;
  /** Fill the scan form's Tracking Code field with this bundle's code. */
  onSelect: (trackingCode: string) => void;
}

/** Auto-collapse groups when there are more than this many, to keep it usable. */
const AUTO_COLLAPSE_THRESHOLD = 6;

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Body-only content for the "Ready to Issue" tab. The surrounding Card, header,
 * count badge, view toggle and scroll area are provided by the parent
 * (BundleIssuePanel). Rows are click-to-autofill in both views.
 */
export function CreatedBundlesList({
  data,
  isLoading,
  isError,
  view,
  onSelect,
}: CreatedBundlesListProps) {
  const bundles = data?.results ?? [];

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-6 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  /* ── Error ── */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <PackageX className="h-8 w-8 mb-2" />
        <p className="text-sm">Couldn&apos;t load created bundles.</p>
      </div>
    );
  }

  /* ── Empty ── */
  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <PackageX className="h-8 w-8 mb-2" />
        <p className="text-sm">No created bundles found</p>
      </div>
    );
  }

  return view === "grouped" ? (
    <GroupedView bundles={bundles} onSelect={onSelect} />
  ) : (
    <FlatView bundles={bundles} onSelect={onSelect} />
  );
}

/* ── Flat list view (default) ── */
function FlatView({
  bundles,
  onSelect,
}: {
  bundles: Bundle[];
  onSelect: (trackingCode: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tracking Code</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Style</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Part</TableHead>
          <TableHead>Bundle #</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bundles.map((bundle) => (
          <BundleRow key={bundle.id} bundle={bundle} onSelect={onSelect}>
            <TableCell className="text-sm font-medium">
              {bundle.order_number}
            </TableCell>
            <TableCell className="text-sm">{bundle.style_name}</TableCell>
            <TableCell className="text-sm">{bundle.size_name}</TableCell>
            <TableCell className="text-sm">{bundle.color_name}</TableCell>
            <TableCell className="text-sm">{bundle.part_name || "—"}</TableCell>
            <BundleTailCells bundle={bundle} />
          </BundleRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Grouped-by-Style·Size view ── */
function GroupedView({
  bundles,
  onSelect,
}: {
  bundles: Bundle[];
  onSelect: (trackingCode: string) => void;
}) {
  // Group by Style · Size, preserving first-seen order (data is -created_at).
  const groups = React.useMemo(() => {
    const map = new Map<string, { style: string; size: string; items: Bundle[] }>();
    for (const b of bundles) {
      const key = `${b.style_name} · ${b.size_name}`;
      const g = map.get(key);
      if (g) g.items.push(b);
      else map.set(key, { style: b.style_name, size: b.size_name, items: [b] });
    }
    return Array.from(map, ([key, value]) => ({ key, ...value }));
  }, [bundles]);

  // Default expanded when few groups; auto-collapsed when many.
  const defaultOpen = groups.length <= AUTO_COLLAPSE_THRESHOLD;
  const [openKeys, setOpenKeys] = React.useState<Set<string>>(
    () => new Set(defaultOpen ? groups.map((g) => g.key) : [])
  );

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isOpen = openKeys.has(group.key);
        return (
          <Collapsible
            key={group.key}
            open={isOpen}
            onOpenChange={() => toggle(group.key)}
            className="rounded-lg border bg-card/40"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/40 rounded-lg">
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  !isOpen && "-rotate-90"
                )}
              />
              <span className="text-sm font-semibold">{group.style}</span>
              <span className="text-xs text-muted-foreground">· {group.size}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {group.items.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking Code</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Bundle #</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((bundle) => (
                    <BundleRow key={bundle.id} bundle={bundle} onSelect={onSelect}>
                      <TableCell className="text-sm font-medium">
                        {bundle.order_number}
                      </TableCell>
                      <TableCell className="text-sm">{bundle.color_name}</TableCell>
                      <TableCell className="text-sm">
                        {bundle.part_name || "—"}
                      </TableCell>
                      <BundleTailCells bundle={bundle} />
                    </BundleRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

/* ── Shared row: leading Tracking Code cell + click-to-autofill wrapper ── */
function BundleRow({
  bundle,
  onSelect,
  children,
}: {
  bundle: Bundle;
  onSelect: (trackingCode: string) => void;
  children: React.ReactNode;
}) {
  return (
    <TableRow
      onClick={() => onSelect(bundle.tracking_code)}
      className="cursor-pointer"
      title="Click to fill the Tracking Code field"
    >
      <TableCell>
        <span className="font-mono text-xs">{bundle.tracking_code}</span>
      </TableCell>
      {children}
    </TableRow>
  );
}

/* ── Shared trailing cells: Bundle #, Qty, Created ── */
function BundleTailCells({ bundle }: { bundle: Bundle }) {
  return (
    <>
      <TableCell>
        <span className="font-mono text-xs">{bundle.display_bundle_number}</span>
      </TableCell>
      <TableCell className="text-right">
        <Badge
          variant="outline"
          className="h-5 min-w-8 rounded-sm px-1 font-mono text-xs tabular-nums"
        >
          {bundle.garment_quantity?.toLocaleString() ?? "—"}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(bundle.created_at)}
      </TableCell>
    </>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackagePlus, PackageX } from "lucide-react";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type Bundle = z.infer<typeof schemas.Bundle>;
type PaginatedBundleList = z.infer<typeof schemas.PaginatedBundleList>;

interface CreatedBundlesListProps {
  data?: PaginatedBundleList;
  isLoading: boolean;
  isError: boolean;
  /** Fill the scan form's Tracking Code field with this bundle's code. */
  onSelect: (trackingCode: string) => void;
}

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

export function CreatedBundlesList({
  data,
  isLoading,
  isError,
  onSelect,
}: CreatedBundlesListProps) {
  const bundles = data?.results ?? [];

  const Header = (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <PackagePlus className="h-5 w-5" />
        Bundles Ready to Issue
        {!isLoading && !isError && (
          <Badge variant="outline" className="ml-auto">
            {bundles.length}
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
  );

  /* ── Loading ── */
  if (isLoading) {
    return (
      <Card>
        {Header}
        <CardContent>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Error ── */
  if (isError) {
    return (
      <Card>
        {Header}
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <PackageX className="h-8 w-8 mb-2" />
            <p className="text-sm">Couldn&apos;t load created bundles.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Empty ── */
  if (bundles.length === 0) {
    return (
      <Card>
        {Header}
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <PackageX className="h-8 w-8 mb-2" />
            <p className="text-sm">No created bundles found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── List ── */
  return (
    <Card>
      {Header}
      <CardContent>
        <ScrollArea className="h-[400px]">
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
              {bundles.map((bundle: Bundle) => (
                <TableRow
                  key={bundle.id}
                  onClick={() => onSelect(bundle.tracking_code)}
                  className="cursor-pointer"
                  title="Click to fill the Tracking Code field"
                >
                  <TableCell>
                    <span className="font-mono text-xs">
                      {bundle.tracking_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {bundle.order_number}
                  </TableCell>
                  <TableCell className="text-sm">{bundle.style_name}</TableCell>
                  <TableCell className="text-sm">{bundle.size_name}</TableCell>
                  <TableCell className="text-sm">{bundle.color_name}</TableCell>
                  <TableCell className="text-sm">
                    {bundle.part_name || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">
                      {bundle.display_bundle_number}
                    </span>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

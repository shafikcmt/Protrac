"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Package, Shirt, Clock, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type PartReceiveInfoResponse = z.infer<typeof schemas.PartReceiveInfoResponse>;
type AssemblyTrackingIssueInfoResponse = z.infer<
  typeof schemas.AssemblyTrackingIssueInfoResponse
>;

interface AssemblyTrackingInfoProps {
  assemblyPartReceiveData?: PartReceiveInfoResponse;
  garmentIssueData?: AssemblyTrackingIssueInfoResponse;
  isLoadingAssemblyInfo: boolean;
  isLoadingGarmentInfo: boolean;
  /** Manually refetch both history queries — safety net in case live
      invalidation is ever delayed. */
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/* Consistent colour per part name for the badges */
const PART_TONES: Array<{ bg: string; text: string; ring: string }> = [
  { bg: "bg-blue-500/12", text: "text-blue-600 dark:text-blue-300", ring: "ring-blue-500/30" },
  { bg: "bg-violet-500/12", text: "text-violet-600 dark:text-violet-300", ring: "ring-violet-500/30" },
  { bg: "bg-amber-500/12", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-500/30" },
  { bg: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-500/30" },
  { bg: "bg-rose-500/12", text: "text-rose-600 dark:text-rose-300", ring: "ring-rose-500/30" },
  { bg: "bg-cyan-500/12", text: "text-cyan-600 dark:text-cyan-300", ring: "ring-cyan-500/30" },
];

function partTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PART_TONES[h % PART_TONES.length];
}

export function AssemblyTrackingInfo({
  assemblyPartReceiveData,
  garmentIssueData,
  isLoadingAssemblyInfo,
  isLoadingGarmentInfo,
  onRefresh,
  isRefreshing,
}: AssemblyTrackingInfoProps) {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied " + code);
  };

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

  const LoadingSkeleton = () => (
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

  const EmptyState = ({
    icon: Icon,
    message,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    message: string;
  }) => (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );

  // Raw payload (typed loosely — endpoint shape is dynamic)
  const inventoryItems = (assemblyPartReceiveData as any)?.inventory_items || [];
  const inventoryCount =
    (assemblyPartReceiveData as any)?.inventory_count ?? inventoryItems.length;
  const recentScans = (assemblyPartReceiveData as any)?.recent_scans || [];

  // Latest scan per (order_id + part_name), DESC by created_at — used for the
  // per-part "Update" line.
  const latestScanByOrderPart = React.useMemo(() => {
    const m = new Map<string, any>();
    const sorted = [...recentScans].sort(
      (a: any, b: any) =>
        new Date(b?.created_at || 0).getTime() -
        new Date(a?.created_at || 0).getTime()
    );
    for (const s of sorted) {
      const b = s?.bundle;
      const o = b?.order;
      if (!b || !o) continue;
      const key = `${o.id}-${String(b.part_name || "")}`;
      if (!m.has(key)) m.set(key, s);
    }
    return m;
  }, [recentScans]);

  // Latest scan time per order — used to sort groups by recency and to resolve
  // the active order below.
  const latestTimeByOrder = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const s of recentScans) {
      const oid = s?.bundle?.order?.id;
      if (oid == null) continue;
      const t = new Date(s?.created_at || 0).getTime();
      if (!m.has(oid) || t > (m.get(oid) as number)) m.set(oid, t);
    }
    return m;
  }, [recentScans]);

  // Most-recently-scanned order that is ALSO still present in the rendered list.
  // Orders hidden/completed are dropped server-side from inventory_items (and so
  // from `groups`), so picking the latest scan across ALL recentScans could point
  // at an order rendered nowhere — leaving no card with the Active badge even
  // though a visible active order clearly exists. Restrict the pick to orders
  // present in inventoryItems (= the orderIds that make up `groups`).
  const activeOrderId = React.useMemo(() => {
    const presentOrderIds = new Set<number>();
    for (const it of inventoryItems) {
      if (it?.order_id != null) presentOrderIds.add(it.order_id);
    }
    let active: number | null = null;
    let latest = -Infinity;
    for (const [oid, t] of latestTimeByOrder) {
      if (!presentOrderIds.has(oid)) continue;
      if (t > latest) {
        latest = t;
        active = oid;
      }
    }
    return active;
  }, [inventoryItems, latestTimeByOrder]);

  // Group inventory items by order/style, then sort groups so the active
  // (most recently scanned) order is always on top.
  const groups = React.useMemo(() => {
    const map = new Map<number, any>();
    for (const it of inventoryItems) {
      const oid = it.order_id;
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          order_number: it.order_number,
          style: it.style,
          color: it.color,
          size: it.size,
          season: it.season,
          parts: [] as any[],
        });
      }
      map.get(oid).parts.push(it);
    }

    const arr = Array.from(map.values());
    for (const g of arr) {
      g.parts.sort((a: any, b: any) =>
        String(a.part).localeCompare(String(b.part))
      );
    }

    arr.sort((a, b) => {
      if (a.orderId === activeOrderId) return -1;
      if (b.orderId === activeOrderId) return 1;
      const ta = latestTimeByOrder.get(a.orderId) ?? -Infinity;
      const tb = latestTimeByOrder.get(b.orderId) ?? -Infinity;
      return tb - ta;
    });

    return arr;
  }, [inventoryItems, activeOrderId, latestTimeByOrder]);

  // Keep only orders/styles that still have work: any part with units left to
  // receive (target − received > 0) or parts on hand not yet issued
  // (available > 0). Fully received + fully issued orders drop off the list.
  const visibleGroups = React.useMemo(
    () =>
      groups.filter((g) =>
        g.parts.some((p: any) => {
          const target = Number(p.order_quantity ?? p.total_quantity ?? 0);
          const received = Number(p.total_quantity ?? 0);
          const available = Number(
            p.available_quantity ?? received - Number(p.issued_quantity ?? 0)
          );
          return target - received > 0 || available > 0;
        })
      ),
    [groups]
  );

  const garmentIssues = garmentIssueData?.results || [];
  const garmentIssueCount =
    (garmentIssueData as any)?.count ?? garmentIssues.length;

  const safePct = (value: number, total: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  };

  /* ── A single part row ── */
  const PartRow = ({ part }: { part: any }) => {
    // Total = order target (uniform per order); Received = cumulative received.
    const target = Number(part.order_quantity ?? part.total_quantity ?? 0);
    const received = Number(part.total_quantity ?? 0);
    const issued = Number(part.issued_quantity ?? 0);
    const available = Number(part.available_quantity ?? received - issued);
    const remaining = Math.max(0, target - received);

    const receivedPct = safePct(received, target);
    const tone = partTone(String(part.part || ""));

    const scanKey = `${part.order_id}-${String(part.part || "")}`;
    const lastScan = latestScanByOrderPart.get(scanKey);

    const barColor =
      receivedPct >= 100 ? "#10b981" : receivedPct >= 50 ? "#3b82f6" : "#f59e0b";

    return (
      <div className="rounded-lg border bg-card/40 px-3 py-2 transition-colors hover:bg-accent/40">
        {/* Row 1 — part identity + last scan */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span
           className={cn(
              "shrink-0 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset",
              tone?.bg,
              tone?.text,
              tone?.ring
            )}
          >
            {part.part}
          </span>
          <div className="min-w-0">
            {lastScan?.created_at ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {String(lastScan.event_type || "").replaceAll("_", " ")} ·{" "}
                {formatTime(lastScan.created_at)} · {formatDate(lastScan.created_at)}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/70">No recent scan</p>
            )}
          </div>
        </div>

        {/* Row 2 — 50% progress bar | 50% stats */}
        <div className="mt-1.5 flex items-center gap-4">
          {/* Left half: progress bar */}
          <div className="w-1/2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${receivedPct}%`, background: barColor }}
                />
              </div>
              <span className="w-9 text-right text-xs font-semibold tabular-nums">{receivedPct}%</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-muted-foreground">
              {remaining > 0 ? `${remaining} to receive` : "complete"}
            </div>
          </div>

          {/* Right half: stats */}
          <div className="grid w-1/2 grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] font-medium uppercase text-blue-600 dark:text-blue-400">Avail</div>
              <div className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">{available}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase text-indigo-600 dark:text-indigo-400">Recv</div>
              <div className="text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{received}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase text-emerald-600 dark:text-emerald-400">Issued</div>
              <div className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{issued}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase text-muted-foreground">Total</div>
              <div className="text-sm font-bold tabular-nums">{target}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── A group card (one order/style) ── */
  const GroupCard = ({ group, active }: { group: any; active: boolean }) => (
    <div
      className={cn(
        "rounded-xl border p-3",
        active
          ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20 shadow-sm"
          : "bg-muted/20"
      )}
    >
      {/* Group header */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">{group.order_number}</span>
            <button
              type="button"
              onClick={() => copyCode(group.order_number)}
              aria-label={`Copy ${group.order_number}`}
              title="Copy order number"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {active && (
              <Badge className="h-5 gap-1 bg-emerald-500 px-1.5 text-[10px] text-white hover:bg-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Active
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {group.style} • {group.color} / {group.size}
            {group.season ? ` • ${group.season}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[11px]">
          {group.parts.length} part{group.parts.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-2">
        {group.parts.map((part: any, i: number) => (
          <PartRow key={`${group.orderId}-${part.part}-${i}`} part={part} />
        ))}
      </div>
    </div>
  );

  return (
    <Card className="py-4 gap-3">
      <CardHeader className="px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Assembly Tracking History
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh history"
              title="Refresh history"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
          )}
          {(assemblyPartReceiveData as any)?.scanner_info && (
            <Badge variant="outline" className={cn(onRefresh ? "" : "ml-auto")}>
              {(assemblyPartReceiveData as any).scanner_info.scanner_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4">
        <Tabs defaultValue="assembly-parts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assembly-parts" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Assembly Parts
              {inventoryCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {inventoryCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="garment-issues" className="flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Garment Issues
              {garmentIssueCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {garmentIssueCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assembly-parts">
            <ScrollArea className="h-[420px] pr-3">
              {isLoadingAssemblyInfo ? (
                <LoadingSkeleton />
              ) : visibleGroups.length === 0 ? (
                <EmptyState icon={Package} message="No active orders" />
              ) : (
                <div className="space-y-3">
                  {/* All active orders — most recently scanned pinned on top */}
                  {visibleGroups.map((g) => (
                    <GroupCard
                      key={g.orderId}
                      group={g}
                      active={g.orderId === activeOrderId}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Garment issues tab unchanged */}
          <TabsContent value="garment-issues">
            <ScrollArea className="h-[420px]">
              {isLoadingGarmentInfo ? (
                <LoadingSkeleton />
              ) : garmentIssues.length === 0 ? (
                <EmptyState icon={Shirt} message="No garment issues for assembly" />
              ) : (
                <div className="space-y-3">
                  {garmentIssues.map((garment: any, index: number) => (
                    <div key={`garment-${index}`}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {garment.tracking_code}
                              </Badge>
                            </div>

                            <p className="text-sm font-medium">Garment from {garment.sewing_line}</p>
                            <p className="text-xs text-muted-foreground">Issued for assembly</p>
                          </div>

                          <div className="text-right">
                            {garment.created_at && (
                              <>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(garment.created_at)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(garment.created_at)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {index < garmentIssues.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

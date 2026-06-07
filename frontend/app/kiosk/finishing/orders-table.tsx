"use client";

import { useState, useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface FinishingOrder {
  id: number;
  order_number: string;
  customer_name: string;
  style_name: string;
  size_name?: string | null;
  delivery_date?: string | null;
  input_garments: number;
  output_garments: number;
  in_progress_garments: number;
  completion_rate?: number;
  qc_stats: {
    total_qc: number;
    passed_qc: number;
    failed_qc: number;
    qc_rate: number;
  };
}

type SortField = "delivery_date" | "wip" | "completion_rate" | "input_garments";
type SortDir = "asc" | "desc";

function getStatusBadge(order: FinishingOrder) {
  const pct = (order.completion_rate ?? 0) * 100;

  if (pct >= 100) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400">
        Done
      </Badge>
    );
  }

  if (order.delivery_date) {
    const days = differenceInDays(parseISO(order.delivery_date), new Date());
    if (days < 0) {
      return (
        <Badge variant="destructive">
          Expired
        </Badge>
      );
    }
    if (days === 0) {
      return (
        <Badge variant="destructive">
          Due Today
        </Badge>
      );
    }
    if (days <= 3) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
          Expiring Soon
        </Badge>
      );
    }
  }

  return (
    <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400">
      In Progress
    </Badge>
  );
}

function SortIcon({
  field,
  active,
  dir,
}: {
  field: SortField;
  active: SortField;
  dir: SortDir;
}) {
  if (field !== active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

interface OrdersTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finishingOrders: any[];
  isLoading: boolean;
}

export function OrdersTable({ finishingOrders: rawOrders, isLoading }: OrdersTableProps) {
  const finishingOrders = rawOrders as FinishingOrder[];
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("delivery_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? finishingOrders.filter(
          (o) =>
            o.order_number.toLowerCase().includes(q) ||
            o.style_name.toLowerCase().includes(q) ||
            o.customer_name.toLowerCase().includes(q)
        )
      : finishingOrders;

    return [...rows].sort((a, b) => {
      let av: number, bv: number;

      if (sortField === "delivery_date") {
        // null dates sort last
        if (!a.delivery_date && !b.delivery_date) return 0;
        if (!a.delivery_date) return 1;
        if (!b.delivery_date) return -1;
        av = parseISO(a.delivery_date).getTime();
        bv = parseISO(b.delivery_date).getTime();
      } else if (sortField === "wip") {
        av = a.in_progress_garments;
        bv = b.in_progress_garments;
      } else if (sortField === "completion_rate") {
        av = a.completion_rate ?? 0;
        bv = b.completion_rate ?? 0;
      } else {
        av = a.input_garments;
        bv = b.input_garments;
      }

      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [finishingOrders, search, sortField, sortDir]);

  const thClass =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">
            Order Progress
            {finishingOrders.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {finishingOrders.length} orders
              </span>
            )}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order, style…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={thClass}>Order No</TableHead>
                <TableHead className={thClass}>Style</TableHead>
                <TableHead className={thClass}>Size</TableHead>
                <TableHead
                  className={cn(thClass, "text-right")}
                  onClick={() => toggleSort("input_garments")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Input
                    <SortIcon field="input_garments" active={sortField} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className={cn(thClass, "text-right")}>Output</TableHead>
                <TableHead
                  className={cn(thClass, "text-right")}
                  onClick={() => toggleSort("wip")}
                >
                  <span className="flex items-center justify-end gap-1">
                    WIP
                    <SortIcon field="wip" active={sortField} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className={cn(thClass, "text-right")}
                  onClick={() => toggleSort("completion_rate")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Done %
                    <SortIcon field="completion_rate" active={sortField} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className={cn(thClass, "text-right")}
                  onClick={() => toggleSort("delivery_date")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Delivery
                    <SortIcon field="delivery_date" active={sortField} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className={cn(thClass, "text-center")}>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && finishingOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading orders…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    {search ? "No orders match your search." : "No finishing orders found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  const rate = order.completion_rate ?? 0;
                  const pct = (rate * 100).toFixed(1);
                  const isDone = rate >= 1;
                  const isUrgent =
                    !isDone &&
                    order.delivery_date &&
                    differenceInDays(parseISO(order.delivery_date), new Date()) <= 0;

                  return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        "transition-colors",
                        isDone && "bg-green-50/40 dark:bg-green-950/10",
                        isUrgent && "bg-red-50/40 dark:bg-red-950/10"
                      )}
                    >
                      <TableCell className="font-mono font-medium text-sm whitespace-nowrap">
                        {order.order_number}
                      </TableCell>
                      <TableCell className="text-sm">{order.style_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.size_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {order.input_garments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {order.output_garments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {order.in_progress_garments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={cn(
                            "font-semibold",
                            isDone
                              ? "text-green-600 dark:text-green-400"
                              : Number(pct) >= 75
                              ? "text-blue-600 dark:text-blue-400"
                              : ""
                          )}
                        >
                          {pct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                        {order.delivery_date ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(order)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

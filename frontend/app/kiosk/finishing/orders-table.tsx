"use client";

import { useMemo } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SizeRow {
  size_name: string;
  input: number;
  output: number;
  wip: number;
  rate: number;
}

interface OrderGroup {
  order_number: string;
  style_name: string;
  customer_name: string;
  delivery_date: string | null;
  total_input: number;
  total_output: number;
  total_wip: number;
  completion_rate: number;
  sizes: SizeRow[];
}

type StatusKind = "expired" | "due-today" | "expiring-soon" | "in-progress" | "done";

function getStatus(order: OrderGroup): StatusKind {
  if (order.completion_rate >= 1) return "done";
  if (!order.delivery_date) return "in-progress";
  const days = differenceInDays(parseISO(order.delivery_date), new Date());
  if (days < 0) return "expired";
  if (days === 0) return "due-today";
  if (days <= 3) return "expiring-soon";
  return "in-progress";
}

const STATUS_PRIORITY: Record<StatusKind, number> = {
  expired: 0,
  "due-today": 1,
  "expiring-soon": 2,
  "in-progress": 3,
  done: 4,
};

const STATUS_LABEL: Record<StatusKind, string> = {
  expired: "Expired",
  "due-today": "Due Today",
  "expiring-soon": "Expiring Soon",
  "in-progress": "In Progress",
  done: "Done",
};

const STATUS_BADGE_CLASS: Record<StatusKind, string> = {
  expired: "bg-red-500 text-white",
  "due-today": "bg-red-500 text-white",
  "expiring-soon": "bg-amber-400 text-black",
  "in-progress": "bg-blue-600 text-white",
  done: "bg-green-500 text-white",
};

const STATUS_BORDER_CLASS: Record<StatusKind, string> = {
  expired: "border-l-red-500",
  "due-today": "border-l-red-500",
  "expiring-soon": "border-l-amber-400",
  "in-progress": "border-l-blue-500",
  done: "border-l-green-500",
};

const STATUS_DATE_CLASS: Record<StatusKind, string> = {
  expired: "text-red-400",
  "due-today": "text-red-400",
  "expiring-soon": "text-amber-400",
  "in-progress": "text-slate-300",
  done: "text-slate-300",
};

const MAX_CARDS = 12;

interface OrdersTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finishingOrders: any[];
  isLoading: boolean;
}

export function OrdersTable({ finishingOrders: rawOrders, isLoading }: OrdersTableProps) {
  const { groups, total } = useMemo(() => {
    const map = new Map<string, OrderGroup>();

    for (const row of rawOrders) {
      const key = row.order_number as string;
      if (!map.has(key)) {
        map.set(key, {
          order_number: key,
          style_name: row.style_name,
          customer_name: row.customer_name,
          delivery_date: row.delivery_date ?? null,
          total_input: 0,
          total_output: 0,
          total_wip: 0,
          completion_rate: 0,
          sizes: [],
        });
      }
      const group = map.get(key)!;
      group.total_input += row.input_garments ?? 0;
      group.total_output += row.output_garments ?? 0;
      group.total_wip += row.in_progress_garments ?? 0;
      group.sizes.push({
        size_name: row.size_name ?? "—",
        input: row.input_garments ?? 0,
        output: row.output_garments ?? 0,
        wip: row.in_progress_garments ?? 0,
        rate: (row.completion_rate ?? 0) * 100,
      });
    }

    for (const g of map.values()) {
      g.completion_rate = g.total_input > 0 ? g.total_output / g.total_input : 0;
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      const pa = STATUS_PRIORITY[getStatus(a)];
      const pb = STATUS_PRIORITY[getStatus(b)];
      if (pa !== pb) return pa - pb;
      if (a.delivery_date && b.delivery_date) {
        return parseISO(a.delivery_date).getTime() - parseISO(b.delivery_date).getTime();
      }
      return 0;
    });

    return { groups: sorted.slice(0, MAX_CARDS), total: sorted.length };
  }, [rawOrders]);

  if (isLoading && rawOrders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="text-2xl font-bold mb-2">Loading…</div>
          <div className="text-sm">Fetching finishing data</div>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="text-2xl font-bold mb-2">No Orders</div>
          <div className="text-sm">No active finishing orders found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-3 content-start">
        {groups.map((order) => {
          const status = getStatus(order);
          const ratePct = (order.completion_rate * 100).toFixed(1);
          const formattedDate = order.delivery_date
            ? format(parseISO(order.delivery_date), "MMM dd, yyyy")
            : null;

          return (
            <div
              key={order.order_number}
              className={cn(
                "rounded-xl border border-slate-700 bg-slate-800 border-l-[6px] p-4 flex flex-col gap-3",
                STATUS_BORDER_CLASS[status]
              )}
            >
              {/* Header: order number + badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-2xl font-black text-white leading-tight truncate">
                    {order.order_number}
                  </div>
                  <div className="text-sm text-slate-400 truncate mt-0.5">
                    {order.style_name}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-0.5 text-sm font-bold whitespace-nowrap mt-0.5",
                    STATUS_BADGE_CLASS[status]
                  )}
                >
                  {STATUS_LABEL[status]}
                </span>
              </div>

              {/* Delivery date */}
              <div className={cn("text-sm font-medium", STATUS_DATE_CLASS[status])}>
                {formattedDate ? `📦 Delivery: ${formattedDate}` : "📦 No delivery date"}
              </div>

              {/* Size breakdown */}
              <div className="border-t border-slate-600 pt-2 space-y-1">
                {/* Column headers */}
                <div className="grid grid-cols-5 text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  <span>Size</span>
                  <span className="text-right">In</span>
                  <span className="text-right">Out</span>
                  <span className="text-right">WIP</span>
                  <span className="text-right">Done%</span>
                </div>

                {order.sizes.map((s, i) => (
                  <div key={i} className="grid grid-cols-5 text-sm tabular-nums">
                    <span className="font-semibold text-white truncate">{s.size_name}</span>
                    <span className="text-right font-semibold text-white">
                      {s.input.toLocaleString()}
                    </span>
                    <span className="text-right font-semibold text-white">
                      {s.output.toLocaleString()}
                    </span>
                    <span className="text-right font-bold text-amber-400">
                      {s.wip.toLocaleString()}
                    </span>
                    <span className="text-right font-bold text-green-400">
                      {s.rate.toFixed(0)}%
                    </span>
                  </div>
                ))}

                {/* Total row — only when multiple sizes */}
                {order.sizes.length > 1 && (
                  <div className="grid grid-cols-5 text-sm tabular-nums border-t border-slate-600 pt-1 mt-1 font-black">
                    <span className="text-white">Total</span>
                    <span className="text-right text-white">
                      {order.total_input.toLocaleString()}
                    </span>
                    <span className="text-right text-white">
                      {order.total_output.toLocaleString()}
                    </span>
                    <span className="text-right text-amber-400">
                      {order.total_wip.toLocaleString()}
                    </span>
                    <span className="text-right text-green-400">{ratePct}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="shrink-0 text-center text-sm text-slate-500 py-1">
        {groups.length < total ? (
          <span>
            Showing{" "}
            <span className="font-bold text-slate-300">{groups.length}</span> of{" "}
            <span className="font-bold text-slate-300">{total}</span> orders — priority: Expired first
          </span>
        ) : (
          <span>
            Showing all{" "}
            <span className="font-bold text-slate-300">{total}</span> order{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

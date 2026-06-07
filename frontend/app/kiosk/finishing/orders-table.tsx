"use client";

import { useState, useMemo } from "react";
import { parseISO, format } from "date-fns";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OrderGroup,
  StatusKind,
  getStatus,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_BORDER_CLASS,
  STATUS_DATE_CLASS,
} from "./finishing-types";

const ALL_STATUSES: StatusKind[] = [
  "expired",
  "due-today",
  "expiring-soon",
  "in-progress",
  "done",
];

interface OrdersTableProps {
  groups: OrderGroup[];
  isLoading: boolean;
}

export function OrdersTable({ groups, isLoading }: OrdersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKind | "all">("all");

  const filtered = useMemo(() => {
    let rows = groups;
    if (statusFilter !== "all") {
      rows = rows.filter((g) => getStatus(g) === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (g) =>
          g.order_number.toLowerCase().includes(q) ||
          g.style_name.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [groups, search, statusFilter]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
      {/* Filter bar */}
      <div className="shrink-0 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, style…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg
              border border-gray-200 dark:border-slate-700
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            )}
          >
            All ({groups.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = groups.filter((g) => getStatus(g) === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                  statusFilter === s
                    ? STATUS_BADGE_CLASS[s]
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                )}
              >
                {STATUS_LABEL[s]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {isLoading && groups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl font-bold text-gray-400 dark:text-slate-500">Loading…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 dark:text-slate-500">
            <div className="text-xl font-bold mb-1">No orders match</div>
            <div className="text-sm">Adjust your search or filter</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
            {filtered.map((order) => {
              const status = getStatus(order);
              const ratePct = (order.completion_rate * 100).toFixed(1);
              const formattedDate = order.delivery_date
                ? format(parseISO(order.delivery_date), "MMM dd, yyyy")
                : null;

              return (
                <div
                  key={order.order_number}
                  className={cn(
                    "rounded-xl border border-gray-200 dark:border-slate-700",
                    "bg-white dark:bg-slate-800",
                    "border-l-[6px] p-4 flex flex-col gap-2",
                    STATUS_BORDER_CLASS[status]
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl font-black text-gray-900 dark:text-white leading-tight truncate">
                        {order.order_number}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {order.style_name}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap",
                        STATUS_BADGE_CLASS[status]
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  {/* Delivery */}
                  <div className={cn("text-xs font-medium", STATUS_DATE_CLASS[status])}>
                    {formattedDate
                      ? `📦 Delivery: ${formattedDate}`
                      : "📦 No delivery date"}
                  </div>

                  {/* Size breakdown */}
                  <div className="border-t border-gray-100 dark:border-slate-600 pt-2 space-y-1">
                    <div className="grid grid-cols-5 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-1">
                      <span>Size</span>
                      <span className="text-right">In</span>
                      <span className="text-right">Out</span>
                      <span className="text-right">WIP</span>
                      <span className="text-right">Done%</span>
                    </div>

                    {order.sizes.map((s, i) => (
                      <div key={i} className="grid grid-cols-5 text-sm tabular-nums">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {s.size_name}
                        </span>
                        <span className="text-right font-semibold text-gray-700 dark:text-slate-200">
                          {s.input.toLocaleString()}
                        </span>
                        <span className="text-right font-semibold text-gray-700 dark:text-slate-200">
                          {s.output.toLocaleString()}
                        </span>
                        <span className="text-right font-bold text-amber-500 dark:text-amber-400">
                          {s.wip.toLocaleString()}
                        </span>
                        <span className="text-right font-bold text-green-600 dark:text-green-400">
                          {s.rate.toFixed(0)}%
                        </span>
                      </div>
                    ))}

                    {order.sizes.length > 1 && (
                      <div className="grid grid-cols-5 text-sm tabular-nums border-t border-gray-100 dark:border-slate-600 pt-1 font-black">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-right text-gray-900 dark:text-white">
                          {order.total_input.toLocaleString()}
                        </span>
                        <span className="text-right text-gray-900 dark:text-white">
                          {order.total_output.toLocaleString()}
                        </span>
                        <span className="text-right text-amber-500 dark:text-amber-400">
                          {order.total_wip.toLocaleString()}
                        </span>
                        <span className="text-right text-green-600 dark:text-green-400">
                          {ratePct}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

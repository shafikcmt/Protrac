import { differenceInDays, parseISO } from "date-fns";

export interface SizeRow {
  size_name: string;
  input: number;
  output: number;
  wip: number;
  rate: number;
}

export interface OrderGroup {
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

export type StatusKind =
  | "expired"
  | "due-today"
  | "expiring-soon"
  | "in-progress"
  | "done";

export function getStatus(order: OrderGroup): StatusKind {
  if (order.completion_rate >= 1) return "done";
  if (!order.delivery_date) return "in-progress";
  const days = differenceInDays(parseISO(order.delivery_date), new Date());
  if (days < 0) return "expired";
  if (days === 0) return "due-today";
  if (days <= 3) return "expiring-soon";
  return "in-progress";
}

export const STATUS_PRIORITY: Record<StatusKind, number> = {
  expired: 0,
  "due-today": 1,
  "expiring-soon": 2,
  "in-progress": 3,
  done: 4,
};

export const STATUS_LABEL: Record<StatusKind, string> = {
  expired: "Expired",
  "due-today": "Due Today",
  "expiring-soon": "Expiring Soon",
  "in-progress": "In Progress",
  done: "Done",
};

export const STATUS_BADGE_CLASS: Record<StatusKind, string> = {
  expired: "bg-red-500 text-white",
  "due-today": "bg-red-500 text-white",
  "expiring-soon": "bg-amber-400 text-black",
  "in-progress": "bg-blue-600 text-white",
  done: "bg-green-500 text-white",
};

export const STATUS_BORDER_CLASS: Record<StatusKind, string> = {
  expired: "border-l-red-500",
  "due-today": "border-l-red-500",
  "expiring-soon": "border-l-amber-400",
  "in-progress": "border-l-blue-500",
  done: "border-l-green-500",
};

export const STATUS_DATE_CLASS: Record<StatusKind, string> = {
  expired: "text-red-500 dark:text-red-400",
  "due-today": "text-red-500 dark:text-red-400",
  "expiring-soon": "text-amber-600 dark:text-amber-400",
  "in-progress": "text-gray-600 dark:text-slate-300",
  done: "text-gray-600 dark:text-slate-300",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupOrders(rawOrders: any[]): OrderGroup[] {
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

  return Array.from(map.values()).sort((a, b) => {
    const pa = STATUS_PRIORITY[getStatus(a)];
    const pb = STATUS_PRIORITY[getStatus(b)];
    if (pa !== pb) return pa - pb;
    if (a.delivery_date && b.delivery_date) {
      return (
        parseISO(a.delivery_date).getTime() -
        parseISO(b.delivery_date).getTime()
      );
    }
    return 0;
  });
}

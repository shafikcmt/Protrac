"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

export interface LineStyleCompletionRecord {
  id: number;
  production_line: number;
  production_line_name: string;
  order: number;
  order_detail: {
    id: number;
    buyer: string | null;
    style: string | null;
    size: string | null;
    color: string | null;
    order_number: string;
  };
  completed_by: number | null;
  completed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(
    /\/+$/,
    ""
  );

function authHeaders(): Record<string, string> {
  const { tokens } = useAuthStore.getState();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokens?.access) {
    headers["Authorization"] = `Bearer ${tokens.access}`;
  }
  return headers;
}

async function fetchCompletions(): Promise<LineStyleCompletionRecord[]> {
  const res = await fetch(
    `${getBaseUrl()}/api/tracking/reports/line-style-completion/`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useLineStyleCompletions() {
  return useQuery<LineStyleCompletionRecord[]>({
    queryKey: ["line-style-completions"],
    queryFn: fetchCompletions,
    refetchOnWindowFocus: false,
  });
}

export async function markStyleComplete(
  production_line: number,
  order: number,
  notes?: string
): Promise<LineStyleCompletionRecord> {
  const res = await fetch(
    `${getBaseUrl()}/api/tracking/reports/line-style-completion/`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ production_line, order, notes: notes ?? "" }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function undoStyleComplete(id: number): Promise<void> {
  const res = await fetch(
    `${getBaseUrl()}/api/tracking/reports/line-style-completion/${id}/`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  );
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
}

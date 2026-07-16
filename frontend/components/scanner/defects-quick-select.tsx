"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { compareDefectCodes } from "@/lib/defect-codes";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface QuickSelectDefect {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
}

/** Short label = the defect name with its "CODE-" prefix stripped, e.g.
    "A-SKIP STC" -> "SKIP STC". Falls back to the full name. */
function shortLabel(defect: QuickSelectDefect): string {
  if (defect.code && defect.name.startsWith(`${defect.code}-`)) {
    return defect.name.slice(defect.code.length + 1);
  }
  return defect.name;
}

interface DefectsQuickSelectProps {
  defects: QuickSelectDefect[];
  selectedDefects: number[];
  onDefectsChange: (defectIds: number[]) => void;
  tone: "fail" | "rework";
}

/** A compact grid of tappable defect chips (letter code + short label) for
    quickly marking one or more defects on a Fail/Rework. Replaces the old
    searchable dialog; only coded register defects are offered (no free-text
    creation, which was the source of junk defect rows). */
export function DefectsQuickSelect({
  defects,
  selectedDefects,
  onDefectsChange,
  tone,
}: DefectsQuickSelectProps) {
  const [search, setSearch] = React.useState("");

  // Only defects that carry a register code, ordered by that code.
  const coded = React.useMemo(
    () =>
      defects
        .filter((d) => !!d.code)
        .sort((a, b) => compareDefectCodes(a.code || "", b.code || "")),
    [defects]
  );

  // Client-side filter over the already-fetched list — match on code or label
  // (case-insensitive) so the operator can narrow the grid instead of scrolling.
  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coded;
    return coded.filter(
      (d) =>
        (d.code || "").toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q)
    );
  }, [coded, search]);

  const toggle = (id: number) => {
    onDefectsChange(
      selectedDefects.includes(id)
        ? selectedDefects.filter((x) => x !== id)
        : [...selectedDefects, id]
    );
  };

  const selectedClass =
    tone === "fail"
      ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
      : "border-orange-600 bg-orange-600 text-white hover:bg-orange-700";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Select defect(s)
        </label>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {selectedDefects.length} selected
          </Badge>
          {selectedDefects.length > 0 && (
            <button
              type="button"
              onClick={() => onDefectsChange([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selected defects — each removable via its own ✕, so a mistakenly
          added defect can be dropped without hunting for it in the grid. */}
      {selectedDefects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border bg-card/40 p-2">
          {selectedDefects.map((id) => {
            const defect = coded.find((d) => d.id === id);
            if (!defect) return null;
            return (
              <span
                key={id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-white",
                  tone === "fail" ? "bg-red-600" : "bg-orange-600"
                )}
              >
                <span className="font-bold tabular-nums">{defect.code}</span>
                <span className="max-w-[7rem] truncate">
                  {shortLabel(defect)}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${defect.name}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-white/25"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search / filter — code or label, client-side over the fetched list */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search defect code or label…"
          autoComplete="off"
          className="h-9 pl-8 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="max-h-[320px] overflow-y-auto rounded-lg border bg-card/40 p-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {visible.map((defect) => {
            const isSelected = selectedDefects.includes(defect.id);
            return (
              <button
                key={defect.id}
                type="button"
                onClick={() => toggle(defect.id)}
                title={defect.name}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? selectedClass
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded px-1 font-bold tabular-nums",
                    isSelected
                      ? "bg-white/25"
                      : tone === "fail"
                      ? "bg-red-500/12 text-red-700 dark:text-red-300"
                      : "bg-orange-500/12 text-orange-700 dark:text-orange-300"
                  )}
                >
                  {defect.code}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {shortLabel(defect)}
                </span>
              </button>
            );
          })}
        </div>
        {coded.length === 0 && (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No defect codes configured.
          </p>
        )}
        {coded.length > 0 && visible.length === 0 && (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No defect matches &ldquo;{search}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}

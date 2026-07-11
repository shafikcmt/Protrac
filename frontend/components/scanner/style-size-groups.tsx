"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimum shape needed to group by Style + Size. */
export interface StyleSizeItem {
  style_name: string;
  size_name: string;
}

/** Groups with more than this many sections start collapsed, to stay usable. */
const AUTO_COLLAPSE_THRESHOLD = 6;

/**
 * Groups a list by Style · Size into collapsible sections with a per-group count
 * badge, auto-collapsing when there are many groups. Shared by the "Ready to
 * Issue" and "Recent Issues" grouped views so both behave identically; each
 * caller supplies its own row rendering via `renderItems`.
 */
export function StyleSizeGroups<T extends StyleSizeItem>({
  items,
  renderItems,
  getCount,
}: {
  items: T[];
  renderItems: (groupItems: T[]) => React.ReactNode;
  /** Badge number per group; defaults to the group's item count. */
  getCount?: (groupItems: T[]) => number;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, { style: string; size: string; items: T[] }>();
    for (const it of items) {
      const key = `${it.style_name} · ${it.size_name}`;
      const g = map.get(key);
      if (g) g.items.push(it);
      else
        map.set(key, { style: it.style_name, size: it.size_name, items: [it] });
    }
    return Array.from(map, ([key, value]) => ({ key, ...value }));
  }, [items]);

  const [openKeys, setOpenKeys] = React.useState<Set<string>>(
    () =>
      new Set(
        groups.length <= AUTO_COLLAPSE_THRESHOLD ? groups.map((g) => g.key) : []
      )
  );

  // Re-seed open state only when the actual set of groups changes (e.g. after a
  // data refresh brings different styles/sizes), so a 30s refetch never clobbers
  // the operator's expand/collapse choices.
  const keysSig = groups.map((g) => g.key).join("|");
  const prevSig = React.useRef(keysSig);
  React.useEffect(() => {
    if (prevSig.current !== keysSig) {
      prevSig.current = keysSig;
      setOpenKeys(
        new Set(
          groups.length <= AUTO_COLLAPSE_THRESHOLD
            ? groups.map((g) => g.key)
            : []
        )
      );
    }
  }, [keysSig, groups]);

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
        const count = getCount ? getCount(group.items) : group.items.length;
        return (
          <Collapsible
            key={group.key}
            open={isOpen}
            onOpenChange={() => toggle(group.key)}
            className="rounded-lg border bg-card/40"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent/40">
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  !isOpen && "-rotate-90"
                )}
              />
              <span className="text-sm font-semibold">{group.style}</span>
              <span className="text-xs text-muted-foreground">
                · {group.size}
              </span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {count}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>{renderItems(group.items)}</CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

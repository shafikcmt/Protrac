"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, RotateCcw, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BulkTargetEntry } from "./use-line-targets";

interface BulkLineTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sewingLines: { id: number; name: string }[];
  existingTargets: any[];
  onSave: (payload: { date: string; targets: BulkTargetEntry[] }) => void;
  isSaving: boolean;
}

export function BulkLineTargetDialog({
  open,
  onOpenChange,
  sewingLines,
  existingTargets,
  onSave,
  isSaving,
}: BulkLineTargetDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [rows, setRows] = useState<BulkTargetEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setRows(
      sewingLines.map((line) => {
        const existing = existingTargets.find(
          (t) => t.line === line.id && t.date === dateStr
        );
        return {
          line_id: line.id,
          line_name: line.name,
          target_quantity: existing?.target_quantity ?? null,
          work_hours: existing?.work_hours ?? 8,
          worker_count: existing?.worker_count ?? null,
        };
      })
    );
  }, [open, selectedDate, sewingLines, existingTargets]);

  const updateRow = (
    index: number,
    field: keyof BulkTargetEntry,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [field]: value === "" ? null : Number(value) }
          : row
      )
    );
  };

  const resetRow = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, target_quantity: null, work_hours: 8, worker_count: null }
          : row
      )
    );
  };

  const applyWorkHoursToAll = (hours: number) => {
    setRows((prev) => prev.map((row) => ({ ...row, work_hours: hours })));
  };

  const handleSave = () => {
    onSave({
      date: format(selectedDate, "yyyy-MM-dd"),
      targets: rows,
    });
    onOpenChange(false);
  };

  const filledCount = rows.filter(
    (r) => r.target_quantity && r.target_quantity > 0
  ).length;
  const totalTarget = rows.reduce(
    (sum, r) => sum + (r.target_quantity || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Set Line Targets</DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Set production targets for all sewing lines in one go.
                </DialogDescription>
              </div>
            </div>

            {/* Date picker */}
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      setSelectedDate(d);
                      setCalOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Summary bar */}
          {filledCount > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="gap-1">
                {filledCount} / {rows.length} lines set
              </Badge>
              <Badge variant="outline" className="gap-1 tabular-nums">
                {totalTarget.toLocaleString()} total units
              </Badge>
            </div>
          )}
        </DialogHeader>

        <Separator />

        {/* Quick fill bar */}
        <div className="flex items-center gap-3 px-6 py-3 bg-muted/30 text-sm text-muted-foreground">
          <span>Apply work hours to all lines:</span>
          {[6, 8, 10, 12].map((h) => (
            <Button
              key={h}
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => applyWorkHoursToAll(h)}
            >
              {h}h
            </Button>
          ))}
        </div>

        <Separator />

        {/* Table */}
        <ScrollArea className="max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr>
                <th className="text-left px-6 py-2.5 font-medium text-muted-foreground w-36">
                  Line
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Target Qty
                  <span className="text-xs font-normal ml-1 text-destructive">*</span>
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Work Hours
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Workers
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Target/hr
                </th>
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const perHour =
                  row.target_quantity && row.work_hours
                    ? Math.round(row.target_quantity / row.work_hours)
                    : null;
                const isSet = row.target_quantity && row.target_quantity > 0;

                return (
                  <tr
                    key={row.line_id}
                    className={cn(
                      "border-b transition-colors",
                      isSet
                        ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                        : "hover:bg-muted/20"
                    )}
                  >
                    <td className="px-6 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.line_name}</span>
                        {isSet && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.target_quantity ?? ""}
                        onChange={(e) =>
                          updateRow(index, "target_quantity", e.target.value)
                        }
                        className="w-full text-right h-8 tabular-nums"
                      />
                    </td>

                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        placeholder="8"
                        value={row.work_hours ?? ""}
                        onChange={(e) =>
                          updateRow(index, "work_hours", e.target.value)
                        }
                        className="w-full text-right h-8 tabular-nums"
                      />
                    </td>

                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={1}
                        placeholder="—"
                        value={row.worker_count ?? ""}
                        onChange={(e) =>
                          updateRow(index, "worker_count", e.target.value)
                        }
                        className="w-full text-right h-8 tabular-nums"
                      />
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      {perHour ? (
                        <Badge
                          variant="secondary"
                          className="tabular-nums font-mono"
                        >
                          {perHour}/hr
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {isSet && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Clear row"
                          onClick={() => resetRow(index)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No sewing lines configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Rows with 0 or empty Target Qty will be skipped.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || filledCount === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving
                ? "Saving..."
                : `Save ${filledCount > 0 ? filledCount + " lines" : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

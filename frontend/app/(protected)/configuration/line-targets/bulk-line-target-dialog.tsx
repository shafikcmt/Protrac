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

interface RowState {
  line_id: number;
  line_name: string;
  target_qty_str: string;
  work_hours_str: string;
  worker_count_str: string;
}

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
  const [rows, setRows] = useState<RowState[]>([]);

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
          target_qty_str: existing?.target_quantity ? String(existing.target_quantity) : "",
          work_hours_str: existing?.work_hours ? String(existing.work_hours) : "8",
          worker_count_str: existing?.worker_count ? String(existing.worker_count) : "",
        };
      })
    );
  }, [open, selectedDate, sewingLines, existingTargets]);

  const updateRow = (index: number, field: keyof RowState, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const resetRow = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, target_qty_str: "", work_hours_str: "8", worker_count_str: "" }
          : row
      )
    );
  };

  const applyWorkHoursToAll = (hours: number) => {
    setRows((prev) => prev.map((row) => ({ ...row, work_hours_str: String(hours) })));
  };

  const handleSave = () => {
    onSave({
      date: format(selectedDate, "yyyy-MM-dd"),
      targets: rows.map((row) => ({
        line_id: row.line_id,
        line_name: row.line_name,
        target_quantity: parseFloat(row.target_qty_str) || null,
        work_hours: parseFloat(row.work_hours_str) || 8,
        worker_count: parseFloat(row.worker_count_str) || null,
      })),
    });
    onOpenChange(false);
  };

  const filledCount = rows.filter((r) => (parseFloat(r.target_qty_str) || 0) > 0).length;
  const totalTarget = rows.reduce((sum, r) => sum + (parseFloat(r.target_qty_str) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
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
                <Button variant="outline" size="sm" className="gap-2 shrink-0 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
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
        <ScrollArea className="flex-1 overflow-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[40px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr>
                <th className="text-left px-6 py-2.5 font-medium text-muted-foreground">
                  Line
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                  Target Qty
                  <span className="text-xs font-normal ml-1 text-destructive">*</span>
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                  Work Hours
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                  Workers
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">
                  Target/hr
                </th>
                <th className="px-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const qty = parseFloat(row.target_qty_str) || 0;
                const hrs = parseFloat(row.work_hours_str) || 0;
                const isSet = qty > 0;
                const perHour = qty > 0 && hrs > 0 ? Math.round(qty / hrs) : null;

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
                    <td className="px-6 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.line_name}</span>
                        {isSet && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.target_qty_str}
                        onChange={(e) =>
                          updateRow(index, "target_qty_str", e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-right tabular-nums font-medium text-sm px-3 border-input focus-visible:ring-2 focus-visible:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        step={0.5}
                        placeholder="8"
                        value={row.work_hours_str}
                        onChange={(e) =>
                          updateRow(index, "work_hours_str", e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-right tabular-nums text-sm px-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="—"
                        value={row.worker_count_str}
                        onChange={(e) =>
                          updateRow(index, "worker_count_str", e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-right tabular-nums text-sm px-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
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

                    <td className="px-2 py-2 text-center">
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
        <div className="px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0 bg-background">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

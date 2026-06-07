"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { BulkTargetEntry } from "./use-line-targets";

interface BulkLineTargetFormProps {
  sewingLines: { id: number; name: string }[];
  existingTargets: any[];
  onSave: (payload: { date: string; targets: BulkTargetEntry[] }) => void;
  isSaving: boolean;
}

export function BulkLineTargetForm({
  sewingLines,
  existingTargets,
  onSave,
  isSaving,
}: BulkLineTargetFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rows, setRows] = useState<BulkTargetEntry[]>([]);

  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const newRows = sewingLines.map((line) => {
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
    });
    setRows(newRows);
  }, [selectedDate, sewingLines, existingTargets]);

  const updateRow = (index: number, field: keyof BulkTargetEntry, value: any) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value === "" ? null : Number(value) } : row
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

  const handleSave = () => {
    onSave({
      date: format(selectedDate, "yyyy-MM-dd"),
      targets: rows,
    });
  };

  const filledCount = rows.filter((r) => r.target_quantity && r.target_quantity > 0).length;
  const totalTarget = rows.reduce((sum, r) => sum + (r.target_quantity || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Set Line Targets</CardTitle>
            <CardDescription>
              Set production targets for all sewing lines at once.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("gap-2", !selectedDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {filledCount > 0 && (
              <>
                <Badge variant="secondary">{filledCount} lines</Badge>
                <Badge variant="outline">{totalTarget.toLocaleString()} units</Badge>
              </>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || filledCount === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium w-40">Line</th>
                <th className="text-right px-4 py-2 font-medium w-36">
                  Target Qty{" "}
                  <span className="text-muted-foreground font-normal">(required)</span>
                </th>
                <th className="text-right px-4 py-2 font-medium w-32">Work Hours</th>
                <th className="text-right px-4 py-2 font-medium w-32">Workers</th>
                <th className="text-right px-4 py-2 font-medium w-24">Target/hr</th>
                <th className="w-12 px-2" />
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
                        ? "bg-green-50/40 dark:bg-green-950/10"
                        : "hover:bg-muted/20"
                    )}
                  >
                    <td className="px-4 py-2">
                      <span className="font-medium">{row.line_name}</span>
                      {isSet && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs text-green-600 border-green-300"
                        >
                          set
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.target_quantity ?? ""}
                        onChange={(e) =>
                          updateRow(index, "target_quantity", e.target.value)
                        }
                        className="w-full text-right h-8"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        placeholder="8"
                        value={row.work_hours ?? ""}
                        onChange={(e) =>
                          updateRow(index, "work_hours", e.target.value)
                        }
                        className="w-full text-right h-8"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="—"
                        value={row.worker_count ?? ""}
                        onChange={(e) =>
                          updateRow(index, "worker_count", e.target.value)
                        }
                        className="w-full text-right h-8"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {perHour ? (
                        <Badge variant="secondary" className="tabular-nums">
                          {perHour}/hr
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {isSet && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Clear this row"
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
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No sewing lines configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

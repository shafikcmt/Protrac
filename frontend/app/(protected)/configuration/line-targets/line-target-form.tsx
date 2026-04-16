"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { schemas } from "@/types/api/client";

type LineTarget = z.infer<typeof schemas.LineTarget>;
type ProductionLine = z.infer<typeof schemas.ProductionLine>;

const formSchema = z.object({
  line: z.number({ required_error: "Please select a production line" }),
  date: z.string({ required_error: "Please select a date" }),
  target_quantity: z.number().min(1, "Target quantity must be at least 1"),
  work_hours: z.number().min(1, "Work hours must be at least 1").optional(),
  worker_count: z.number().min(1, "Worker count must be at least 1").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LineTargetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineTarget: LineTarget | null;
  productionLines: ProductionLine[];
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

export function LineTargetForm({
  open,
  onOpenChange,
  lineTarget,
  productionLines,
  onSubmit,
  isLoading,
}: LineTargetFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      line: undefined,
      date: "",
      target_quantity: 0,
      work_hours: undefined,
      worker_count: undefined,
    },
  });

  // Reset form when dialog opens/closes or lineTarget changes
  useEffect(() => {
    if (open) {
      if (lineTarget) {
        form.reset({
          line: lineTarget.line,
          date: lineTarget.date,
          target_quantity: lineTarget.target_quantity,
          work_hours: lineTarget.work_hours || undefined,
          worker_count: lineTarget.worker_count || undefined,
        });
      } else {
        form.reset({
          line: undefined,
          date: format(new Date(), "yyyy-MM-dd"),
          target_quantity: 0,
          work_hours: 8,
          worker_count: undefined,
        });
      }
    }
  }, [open, lineTarget, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const isEditing = !!lineTarget;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Line Target" : "Create Line Target"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the daily production target for this line."
              : "Set a daily production target for a production line."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4">
            <FormField
              control={form.control}
              name="line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production Line</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a production line" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productionLines.map((line) => (
                        <SelectItem
                          key={line.id}
                          value={line.id.toString()}>
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}>
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0"
                      align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter target quantity"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="work_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Hours (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter work hours"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="worker_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Worker Count (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter worker count"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                  ? "Update Target"
                  : "Create Target"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

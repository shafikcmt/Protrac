"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { schemas } from "@/types/api/client";

type Line = z.infer<typeof schemas.ProductionLine>;
type LineRequest = z.infer<typeof schemas.ProductionLineRequest>;

interface LineFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line?: Line | null;
  onSubmit: (data: LineRequest) => void;
  isLoading?: boolean;
}

export function LineForm({
  open,
  onOpenChange,
  line,
  onSubmit,
  isLoading,
}: LineFormProps) {
  const form = useForm<LineRequest>({
    resolver: zodResolver(schemas.ProductionLineRequest),
    defaultValues: {
      name: "",
      line_type: "sewing",
    },
  });
  // Reset form when line changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: line?.name || "",
        line_type: line?.line_type || "sewing",
      });
    }
  }, [line, open, form]);
  const handleSubmit = (data: LineRequest) => {
    onSubmit(data);
  };

  const isEditing = !!line;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditing ? "Edit Line" : "Create Line"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col">
            <div className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="line_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select line type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cutting">Cutting</SelectItem>
                        <SelectItem value="sewing">Sewing</SelectItem>
                        <SelectItem value="finishing">Finishing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter line name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6 py-4 border-t">
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
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { schemas } from "@/types/api/client";
import { getNextDefectCode } from "@/lib/defect-codes";

type Defect = z.infer<typeof schemas.Defect>;
type DefectRequest = z.infer<typeof schemas.DefectRequest>;

interface DefectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defect?: Defect | null;
  /** All existing defects — used to auto-suggest the next code on create. */
  existingDefects?: Defect[];
  onSubmit: (data: DefectRequest) => void;
  isLoading?: boolean;
}

export function DefectForm({
  open,
  onOpenChange,
  defect,
  existingDefects = [],
  onSubmit,
  isLoading,
}: DefectFormProps) {
  const form = useForm<DefectRequest>({
    resolver: zodResolver(schemas.DefectRequest),
    defaultValues: {
      code: "",
      name: "",
      description: undefined,
    },
  });

  // Reset form when defect changes or dialog opens/closes. When creating a NEW
  // defect, pre-fill the code with the next one in sequence (A, B … Z, Aa …) —
  // still editable if the user wants a custom code. When editing, show the
  // existing code as-is and never auto-suggest.
  useEffect(() => {
    if (open) {
      const suggestedCode = defect
        ? defect.code || ""
        : getNextDefectCode(
            existingDefects.map((d) => d.code || "").filter(Boolean)
          );
      form.reset({
        code: suggestedCode,
        name: defect?.name || "",
        description: defect?.description || undefined,
      });
    }
    // existingDefects is intentionally excluded — we only recompute the suggestion
    // when the dialog opens or the target defect changes, not on every list refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defect, open, form]);
  const handleSubmit = (data: DefectRequest) => {
    onSubmit(data);
  };

  const isEditing = !!defect;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            {isEditing ? "Edit Defect" : "Create Defect"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col">
            <div className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter defect name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. A, B, Aa"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter defect description"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : value);
                        }}
                        disabled={isLoading}
                        rows={3}
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

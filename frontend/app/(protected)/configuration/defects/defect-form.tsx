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

type Defect = z.infer<typeof schemas.Defect>;
type DefectRequest = z.infer<typeof schemas.DefectRequest>;

interface DefectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defect?: Defect | null;
  onSubmit: (data: DefectRequest) => void;
  isLoading?: boolean;
}

export function DefectForm({
  open,
  onOpenChange,
  defect,
  onSubmit,
  isLoading,
}: DefectFormProps) {
  const form = useForm<DefectRequest>({
    resolver: zodResolver(schemas.DefectRequest),
    defaultValues: {
      name: "",
      description: undefined,
    },
  });

  // Reset form when defect changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: defect?.name || "",
        description: defect?.description || undefined,
      });
    }
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

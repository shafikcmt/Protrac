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
import { schemas } from "@/types/api/client";

type Size = z.infer<typeof schemas.Size>;
type SizeRequest = z.infer<typeof schemas.SizeRequest>;

interface SizeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: Size | null;
  onSubmit: (data: SizeRequest) => void;
  isLoading?: boolean;
}

export function SizeForm({
  open,
  onOpenChange,
  size,
  onSubmit,
  isLoading,
}: SizeFormProps) {
  const form = useForm<SizeRequest>({
    resolver: zodResolver(schemas.SizeRequest),
    defaultValues: {
      name: "",
      index: undefined,
    },
  });

  // Reset form when size changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: size?.name || "",
        index: size?.index || undefined,
      });
    }
  }, [size, open, form]);
  const handleSubmit = (data: SizeRequest) => {
    onSubmit(data);
  };

  const isEditing = !!size;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditing ? "Edit Size" : "Create Size"}</DialogTitle>
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
                        placeholder="Enter size name"
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
                name="index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Index (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter size index"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === "" ? undefined : parseInt(value, 10)
                          );
                        }}
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

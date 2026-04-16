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

type Buyer = z.infer<typeof schemas.Buyer>;
type BuyerRequest = z.infer<typeof schemas.BuyerRequest>;

interface BuyerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer?: Buyer | null;
  onSubmit: (data: BuyerRequest) => void;
  isLoading?: boolean;
}

export function BuyerForm({
  open,
  onOpenChange,
  buyer,
  onSubmit,
  isLoading,
}: BuyerFormProps) {
  const form = useForm<BuyerRequest>({
    resolver: zodResolver(schemas.BuyerRequest),
    defaultValues: {
      name: "",
    },
  });

  // Reset form when buyer changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: buyer?.name || "",
      });
    }
  }, [buyer, open, form]);
  const handleSubmit = (data: BuyerRequest) => {
    onSubmit(data);
  };

  const isEditing = !!buyer;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditing ? "Edit Buyer" : "Create Buyer"}</DialogTitle>
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
                        placeholder="Enter buyer name"
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

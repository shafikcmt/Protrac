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
import { Loader2 } from "lucide-react";
import { schemas } from "@/types/api/client";

type Spread = z.infer<typeof schemas.Spread>;
type SpreadRequest = z.infer<typeof schemas.SpreadRequest>;

interface SpreadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spread?: Spread | null;
  onSubmit: (data: SpreadRequest) => void;
  isLoading?: boolean;
}

export function SpreadForm({
  open,
  onOpenChange,
  spread,
  onSubmit,
  isLoading,
}: SpreadFormProps) {
  const form = useForm<SpreadRequest>({
    resolver: zodResolver(schemas.SpreadRequest),
    defaultValues: {
      number: "",
    },
  });

  // Reset form when spread changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        number: spread?.number || "",
      });
    }
  }, [spread, open, form]);

  const handleSubmit = (data: SpreadRequest) => {
    onSubmit(data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {spread ? "Edit Spread" : "Create New Spread"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spread Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter spread number"
                      {...field}
                      disabled={isLoading}
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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {spread ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

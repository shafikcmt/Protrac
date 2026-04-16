"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { Scan, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { schemas } from "@/types/api/client";

type FormData = z.infer<typeof schemas.BundleIssueScanRequest>;

interface BundleIssueScanFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  sewingLines: Array<{
    id: number;
    name: string;
    line_type: string;
  }>;
  isLoadingLines: boolean;
}

export function BundleIssueScanForm({
  onSubmit,
  isLoading,
  sewingLines,
  isLoadingLines,
}: BundleIssueScanFormProps) {
  const trackingCodeInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schemas.BundleIssueScanRequest),
    defaultValues: {
      tracking_code: "",
      sewing_line: undefined,
    },
  });

  // Auto-focus the tracking code input
  useEffect(() => {
    trackingCodeInputRef.current?.focus();
  }, []);

  // Handle form submission
  const handleSubmit = (data: FormData) => {
    onSubmit(data);

    // Clear tracking code after successful submission
    form.setValue("tracking_code", "");

    // Re-focus the input for next scan
    setTimeout(() => {
      trackingCodeInputRef.current?.focus();
    }, 100);
  };

  // Handle Enter key press for auto-submit
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      const trackingCode = form.getValues("tracking_code");
      const sewingLine = form.getValues("sewing_line");

      if (trackingCode && sewingLine) {
        form.handleSubmit(handleSubmit)();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bundle Issue Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4">
            {/* Sewing Line Selection */}
            <FormField
              control={form.control}
              name="sewing_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sewing Line</FormLabel>{" "}
                  <FormControl>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      disabled={isLoadingLines}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select sewing line..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sewingLines.map((line) => (
                          <SelectItem
                            key={line.id}
                            value={line.id.toString()}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tracking Code Input */}
            <FormField
              control={form.control}
              name="tracking_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Code</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Scan className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        ref={trackingCodeInputRef}
                        placeholder="Scan or enter tracking code..."
                        className="pl-10 text-lg"
                        maxLength={50}
                        onKeyPress={handleKeyPress}
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg">
              {isLoading ? "Processing..." : "Issue Bundle"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

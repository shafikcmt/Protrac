"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { Scan, Workflow } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const assemblyTrackingScanSchema = z.object({
  tracking_code: z.string().min(1, "Tracking code is required").max(50),
});

type FormData = z.infer<typeof assemblyTrackingScanSchema>;

interface AssemblyTrackingScanFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  getEndpointInfo: (trackingCode: string) => {
    type: string;
    endpoint: string;
    description: string;
  } | null;
}

export function AssemblyTrackingScanForm({
  onSubmit,
  isLoading,
  getEndpointInfo,
}: AssemblyTrackingScanFormProps) {
  const trackingCodeInputRef = useRef<HTMLInputElement>(null);
  const [currentEndpointInfo, setCurrentEndpointInfo] =
    useState<ReturnType<typeof getEndpointInfo>>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(assemblyTrackingScanSchema),
    defaultValues: {
      tracking_code: "",
    },
  });

  const trackingCode = form.watch("tracking_code");

  // Update endpoint info when tracking code changes
  useEffect(() => {
    setCurrentEndpointInfo(getEndpointInfo(trackingCode));
  }, [trackingCode, getEndpointInfo]);

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

      if (trackingCode) {
        form.handleSubmit(handleSubmit)();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Assembly Tracking Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4">
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
            />            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg">
              {isLoading 
                ? "Processing..." 
                : currentEndpointInfo
                  ? `Submit ${currentEndpointInfo.type === "garment-issue" ? "Garment" : "Assembly Part"}`
                  : "Submit Scan"
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { Scan, CheckCircle, XCircle, RotateCcw } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { DefectsQuickSelect } from "./defects-quick-select";

const sewingQCFormSchema = z.object({
  tracking_code: z.string().min(1, "Tracking code is required"),
  qc_status: z.enum(["pass", "fail", "rework"]),
  defect_ids: z.array(z.number()).optional(),
});

type FormData = z.infer<typeof sewingQCFormSchema>;

interface SewingQCScanFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  defects: Array<{
    id: number;
    code?: string | null;
    name: string;
    description?: string | null;
  }>;
  isLoadingDefects: boolean;
}

export function SewingQCScanForm({
  onSubmit,
  isLoading,
  defects,
}: SewingQCScanFormProps) {
  const trackingCodeRef = useRef<HTMLInputElement>(null);
  const [selectedDefects, setSelectedDefects] = useState<number[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(sewingQCFormSchema),
    defaultValues: {
      tracking_code: "",
      qc_status: "pass",
      defect_ids: [],
    },
  });

  const qcStatus = form.watch("qc_status");
  const needsDefects = qcStatus === "fail" || qcStatus === "rework";

  // Auto-focus tracking code input on component mount
  useEffect(() => {
    trackingCodeRef.current?.focus();
  }, []);

  const resetForm = () => {
    form.reset();
    setSelectedDefects([]);
    setTimeout(() => {
      trackingCodeRef.current?.focus();
    }, 100);
  };

  const handleSubmit = (data: FormData) => {
    // Re-evaluation is now detected automatically on the backend from the
    // garment's QC history — no manual flag. Defects only apply to fail/rework.
    onSubmit({
      ...data,
      defect_ids: needsDefects ? selectedDefects : [],
    });
    resetForm();
  };

  const getStatusColor = (status: string, isSelected: boolean) => {
    if (!isSelected) return "";
    switch (status) {
      case "pass":
        return "bg-green-600 text-white hover:bg-green-700";
      case "fail":
        return "bg-red-600 text-white hover:bg-red-700";
      case "rework":
        return "bg-orange-600 text-white hover:bg-orange-700";
      default:
        return "";
    }
  };

  return (
    <Card className="py-4 gap-3">
      <CardHeader className="px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Sewing QC Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4">
            {/* QC Status Selection */}
            <FormField
              control={form.control}
              name="qc_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>QC Status</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "pass", label: "Pass", icon: CheckCircle },
                        { value: "fail", label: "Fail", icon: XCircle },
                        { value: "rework", label: "Rework", icon: RotateCcw },
                      ].map(({ value, label, icon: Icon }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={
                            field.value === value ? "default" : "outline"
                          }
                          className={`flex items-center gap-2 ${
                            field.value === value
                              ? getStatusColor(value, true)
                              : "hover:bg-muted"
                          }`}
                          onClick={() => {
                            field.onChange(value);
                            if (value === "pass") setSelectedDefects([]);
                          }}>
                          <Icon className="h-4 w-4" />
                          {label}
                        </Button>
                      ))}
                    </div>
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
                    <Input
                      {...field}
                      ref={trackingCodeRef}
                      placeholder="Scan or enter tracking code"
                      autoComplete="off"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          form.handleSubmit(handleSubmit)();
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inline defect quick-select — only for Fail / Rework */}
            {needsDefects && (
              <DefectsQuickSelect
                defects={defects}
                selectedDefects={selectedDefects}
                onDefectsChange={setSelectedDefects}
                tone={qcStatus as "fail" | "rework"}
              />
            )}

            <Separator />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg">
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing QC Check...
                </>
              ) : (
                <>
                  <Scan className="mr-2 h-4 w-4" />
                  Submit QC Check
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { Scan, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DefectsSelectionDialog } from "./defects-selection-dialog";
import { schemas } from "@/types/api/client";

const finishingQCFormSchema = z.object({
  tracking_code: z.string().min(1, "Tracking code is required"),
  qc_status: z.enum(["pass", "fail", "rework"]),
  defect_ids: z.array(z.number()).optional(),
  is_reevaluation: z.boolean(),
});

type FormData = z.infer<typeof finishingQCFormSchema>;

interface FinishingQCScanFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  defects: Array<{
    id: number;
    name: string;
    description?: string | null;
  }>;
  isLoadingDefects: boolean;
}

export function FinishingQCScanForm({
  onSubmit,
  isLoading,
  defects,
  isLoadingDefects,
}: FinishingQCScanFormProps) {
  const trackingCodeRef = useRef<HTMLInputElement>(null);
  const [selectedDefects, setSelectedDefects] = useState<number[]>([]);
  const [showDefectsDialog, setShowDefectsDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<FormData | null>(
    null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(finishingQCFormSchema),
    defaultValues: {
      tracking_code: "",
      qc_status: "pass",
      defect_ids: [],
      is_reevaluation: false,
    },
  });

  const qcStatus = form.watch("qc_status");
  const isReevaluation = form.watch("is_reevaluation");

  // Auto-focus tracking code input on component mount
  useEffect(() => {
    trackingCodeRef.current?.focus();
  }, []);

  const handleSubmit = (data: FormData) => {
    // If status is pass, submit directly
    if (data.qc_status === "pass") {
      onSubmit({ ...data, defect_ids: [] });
      resetForm();
      return;
    }

    // If status is fail or rework, show defects dialog
    setPendingSubmission(data);
    setShowDefectsDialog(true);
  };

  const handleDefectsConfirm = () => {
    if (pendingSubmission) {
      onSubmit({ ...pendingSubmission, defect_ids: selectedDefects });
      resetForm();
      setShowDefectsDialog(false);
      setPendingSubmission(null);
    }
  };

  const resetForm = () => {
    form.reset();
    setSelectedDefects([]);

    // Focus back to tracking code input
    setTimeout(() => {
      trackingCodeRef.current?.focus();
    }, 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4" />;
      case "fail":
        return <XCircle className="h-4 w-4" />;
      case "rework":
        return <RotateCcw className="h-4 w-4" />;
      default:
        return null;
    }
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Finishing QC Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6">
              {/* QC Status Selection - Now at the top */}
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
                            onClick={() => field.onChange(value)}>
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

              {/* Re-evaluation Checkbox */}
              <FormField
                control={form.control}
                name="is_reevaluation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Re-evaluation</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Check if this is a re-evaluation of a previously scanned
                        item
                      </p>
                    </div>
                  </FormItem>
                )}
              />

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
                    {isReevaluation && (
                      <Badge
                        variant="secondary"
                        className="ml-2">
                        Re-evaluation
                      </Badge>
                    )}
                    {(qcStatus === "fail" || qcStatus === "rework") && (
                      <Badge
                        variant="secondary"
                        className={`ml-2 ${
                          qcStatus === "fail"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                        Will ask for defects
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Defects Selection Dialog */}
      <DefectsSelectionDialog
        open={showDefectsDialog}
        onOpenChange={setShowDefectsDialog}
        defects={defects}
        selectedDefects={selectedDefects}
        onDefectsChange={setSelectedDefects}
        onConfirm={handleDefectsConfirm}
        isLoading={isLoading}
        qcStatus={pendingSubmission?.qc_status as "fail" | "rework"}
      />
    </>
  );
}

"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { Plus, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartCombobox } from "./part-combobox";
import { BuyerCombobox } from "./buyer-combobox";
import { SeasonCombobox } from "./season-combobox";
import { schemas } from "@/types/api/client";

type Style = z.infer<typeof schemas.StyleWithParts>;
type StyleRequest = z.infer<typeof schemas.StyleWithPartsRequest>;

type StyleFormData = {
  name: string;
  buyer?: number;
  season?: number;
  parts: { partId: number }[];
};

interface StyleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style?: Style | null;
  onSubmit: (data: StyleRequest) => void;
  isLoading?: boolean;
}

export function StyleForm({
  open,
  onOpenChange,
  style,
  onSubmit,
  isLoading,
}: StyleFormProps) {
  const form = useForm<StyleFormData>({
    defaultValues: {
      name: "",
      buyer: undefined,
      season: undefined,
      parts: [],
    },
  });

  const {
    fields: partFields,
    append: addPart,
    remove: removePart,
  } = useFieldArray({
    control: form.control,
    name: "parts",
  });

  // Reset form when style changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: style?.name || "",
        buyer: style?.buyer || undefined,
        season: style?.season || undefined,
        parts: style?.parts?.map((partId) => ({ partId })) || [],
      });
    }
  }, [style, open, form]);

  const handleSubmit = (data: StyleFormData) => {
    const styleRequest: StyleRequest = {
      name: data.name,
      buyer: data.buyer!,
      season: data.season!,
      parts: data.parts.map((p) => p.partId),
    };
    onSubmit(styleRequest);
  };

  const isEditing = !!style;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:min-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Style" : "Create Style"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Style Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter style name"
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
                    name="buyer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer</FormLabel>
                        <FormControl>
                          <BuyerCombobox
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select or create buyer"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="season"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Season</FormLabel>
                        <FormControl>
                          <SeasonCombobox
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select or create season"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Parts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Parts
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPart({ partId: 0 })}
                      disabled={isLoading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Part
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {partFields.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded">
                      No parts added. Click "Add Part" to get started.
                    </div>
                  )}
                  {partFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`parts.${index}.partId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <PartCombobox
                                value={field.value || undefined}
                                onValueChange={field.onChange}
                                placeholder="Select or create part"
                                disabled={isLoading}
                                excludeIds={form
                                  .getValues("parts")
                                  .map((p) => p.partId)
                                  .filter(
                                    (id) => id !== 0 && id !== field.value
                                  )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePart(index)}
                        disabled={isLoading}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="mt-6">
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

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { schemas } from "@/types/api/client";
import { z } from "zod";

type Bundle = z.infer<typeof schemas.Bundle>;

interface BundleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle?: Bundle | null;
  bundles?: Bundle[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BundleDeleteDialog({
  open,
  onOpenChange,
  bundle,
  bundles = [],
  onConfirm,
  isLoading,
}: BundleDeleteDialogProps) {
  const isMultiple = bundles.length > 0;
  const count = isMultiple ? bundles.length : 1;
  const title = isMultiple ? "Delete bundles" : "Delete bundle";
  const description = isMultiple
    ? `Are you sure you want to delete these ${count} bundles? This action cannot be undone.`
    : `Are you sure you want to delete the bundle "${bundle?.tracking_code}"? This action cannot be undone.`;

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

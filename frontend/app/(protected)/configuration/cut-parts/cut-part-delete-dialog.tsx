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
import { z } from "zod";
import { schemas } from "@/types/api/client";

type CutPart = z.infer<typeof schemas.Part>;

interface CutPartDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cutPart?: CutPart | null;
  cutParts?: CutPart[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CutPartDeleteDialog({
  open,
  onOpenChange,
  cutPart,
  cutParts,
  onConfirm,
  isLoading,
}: CutPartDeleteDialogProps) {
  const isBulkDelete = cutParts && cutParts.length > 0;
  const count = isBulkDelete ? cutParts.length : 1;
  const cutPartName = cutPart?.name;

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBulkDelete ? `Delete ${count} Cut Parts` : "Delete Cut Part"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected cut parts? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium">{cutPartName}</span>? This action
                cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}>
            {isLoading
              ? "Deleting..."
              : isBulkDelete
              ? `Delete ${count} Cut Parts`
              : "Delete Cut Part"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

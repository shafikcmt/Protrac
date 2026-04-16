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

type Color = z.infer<typeof schemas.Color>;

interface ColorDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color?: Color | null;
  colors?: Color[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ColorDeleteDialog({
  open,
  onOpenChange,
  color,
  colors,
  onConfirm,
  isLoading,
}: ColorDeleteDialogProps) {
  const isBulkDelete = colors && colors.length > 0;
  const count = isBulkDelete ? colors.length : 1;
  const colorName = color?.name;

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
            {isBulkDelete ? `Delete ${count} Colors` : "Delete Color"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected colors? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium">{colorName}</span>? This action
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
              ? `Delete ${count} Colors`
              : "Delete Color"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

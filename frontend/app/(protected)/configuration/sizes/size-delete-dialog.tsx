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

type Size = z.infer<typeof schemas.Size>;

interface SizeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: Size | null;
  sizes?: Size[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SizeDeleteDialog({
  open,
  onOpenChange,
  size,
  sizes,
  onConfirm,
  isLoading,
}: SizeDeleteDialogProps) {
  const isBulkDelete = sizes && sizes.length > 0;
  const count = isBulkDelete ? sizes.length : 1;
  const sizeName = size?.name;

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
            {isBulkDelete ? `Delete ${count} Sizes` : "Delete Size"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected sizes? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium">{sizeName}</span>? This action
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
              ? `Delete ${count} Sizes`
              : "Delete Size"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

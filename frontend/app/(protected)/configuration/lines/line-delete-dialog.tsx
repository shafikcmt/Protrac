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

type Line = z.infer<typeof schemas.ProductionLine>;

interface LineDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line?: Line | null;
  lines?: Line[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LineDeleteDialog({
  open,
  onOpenChange,
  line,
  lines,
  onConfirm,
  isLoading,
}: LineDeleteDialogProps) {
  const isBulkDelete = lines && lines.length > 0;
  const count = isBulkDelete ? lines.length : 1;
  const lineName = line?.name;

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
            {isBulkDelete ? `Delete ${count} Lines` : "Delete Line"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected lines? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium">{lineName}</span>? This action
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
              ? `Delete ${count} Lines`
              : "Delete Line"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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

type Style = z.infer<typeof schemas.StyleWithParts>;

interface StyleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style?: Style | null;
  styles?: Style[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function StyleDeleteDialog({
  open,
  onOpenChange,
  style,
  styles,
  onConfirm,
  isLoading,
}: StyleDeleteDialogProps) {
  const isBulkDelete = styles && styles.length > 0;
  const count = isBulkDelete ? styles.length : 1;
  const styleName = style?.name;

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
            {isBulkDelete ? `Delete ${count} Styles` : "Delete Style"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected styles? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete the style{" "}
                <span className="font-medium">{styleName}</span>? This action
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
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

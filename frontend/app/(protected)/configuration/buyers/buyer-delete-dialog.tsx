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

type Buyer = z.infer<typeof schemas.Buyer>;

interface BuyerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer?: Buyer | null;
  buyers?: Buyer[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BuyerDeleteDialog({
  open,
  onOpenChange,
  buyer,
  buyers,
  onConfirm,
  isLoading,
}: BuyerDeleteDialogProps) {
  const isBulkDelete = buyers && buyers.length > 0;
  const count = isBulkDelete ? buyers.length : 1;
  const buyerName = buyer?.name;

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
            {isBulkDelete ? `Delete ${count} Buyers` : "Delete Buyer"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected buyers? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium">{buyerName}</span>? This action
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
              ? `Delete ${count} Buyers`
              : "Delete Buyer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

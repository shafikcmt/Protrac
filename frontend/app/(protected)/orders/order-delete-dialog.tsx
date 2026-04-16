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

type Order = z.infer<typeof schemas.Order>;

interface OrderDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
  orders?: Order[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function OrderDeleteDialog({
  open,
  onOpenChange,
  order,
  orders = [],
  onConfirm,
  isLoading,
}: OrderDeleteDialogProps) {
  const isBulkDelete = orders.length > 0;
  const itemCount = isBulkDelete ? orders.length : 1;
  const itemText = itemCount === 1 ? "order" : "orders";

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemText}</AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {itemCount} {itemText}? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete the order{" "}
                <span className="font-semibold">{order?.order_number}</span>?
                This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}>
            {isLoading ? "Deleting..." : `Delete ${itemText}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

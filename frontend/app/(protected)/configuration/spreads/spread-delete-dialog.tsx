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
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type Spread = z.infer<typeof schemas.Spread>;

interface SpreadDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spread?: Spread | null;
  spreads?: Spread[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SpreadDeleteDialog({
  open,
  onOpenChange,
  spread,
  spreads = [],
  onConfirm,
  isLoading,
}: SpreadDeleteDialogProps) {
  const isMultiple = spreads.length > 0;
  const count = isMultiple ? spreads.length : 1;
  const spreadName = spread?.number || "";

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {isMultiple ? `${count} Spreads` : "Spread"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple ? (
              <>
                Are you sure you want to delete {count} spreads? This action
                cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete the spread{" "}
                <span className="font-medium">{spreadName}</span>? This action
                cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

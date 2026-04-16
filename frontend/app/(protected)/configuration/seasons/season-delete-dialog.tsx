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

type Season = z.infer<typeof schemas.Season>;

interface SeasonDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season?: Season | null;
  seasons?: Season[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SeasonDeleteDialog({
  open,
  onOpenChange,
  season,
  seasons,
  onConfirm,
  isLoading,
}: SeasonDeleteDialogProps) {
  const isBulkDelete = seasons && seasons.length > 0;
  const count = isBulkDelete ? seasons.length : 1;
  const seasonName = season?.name;

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
            {isBulkDelete ? `Delete ${count} Seasons` : "Delete Season"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete {count} selected seasons? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium">{seasonName}</span>? This action
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
              ? `Delete ${count} Seasons`
              : "Delete Season"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

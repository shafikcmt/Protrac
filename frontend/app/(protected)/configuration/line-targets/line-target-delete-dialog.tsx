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

type LineTarget = z.infer<typeof schemas.LineTarget>;

interface LineTargetDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineTarget: LineTarget | null;
  lineTargets: LineTarget[];
  onConfirm: () => void;
  isLoading: boolean;
}

export function LineTargetDeleteDialog({
  open,
  onOpenChange,
  lineTarget,
  lineTargets,
  onConfirm,
  isLoading,
}: LineTargetDeleteDialogProps) {
  const isBulkDelete = lineTargets.length > 0;
  const itemCount = isBulkDelete ? lineTargets.length : 1;
  const itemName = isBulkDelete
    ? `${itemCount} line targets`
    : `line target for ${lineTarget?.line_name}`;

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the{" "}
            {itemName}.
            {isBulkDelete && (
              <div className="mt-2 text-sm">
                <strong>Selected items:</strong>
                <ul className="mt-1 max-h-32 overflow-y-auto">
                  {lineTargets.slice(0, 5).map((target) => (
                    <li
                      key={target.id}
                      className="truncate">
                      • {target.line_name} - {target.date}
                    </li>
                  ))}
                  {lineTargets.length > 5 && (
                    <li>... and {lineTargets.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

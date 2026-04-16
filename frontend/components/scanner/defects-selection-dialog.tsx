"use client";

import { useState, useEffect } from "react";
import { X, Plus, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDefects } from "@/app/(protected)/configuration/defects/use-defects";

interface DefectsSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defects: Array<{
    id: number;
    name: string;
    description?: string | null;
  }>;
  selectedDefects: number[];
  onDefectsChange: (defectIds: number[]) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  qcStatus: "fail" | "rework";
}

export function DefectsSelectionDialog({
  open,
  onOpenChange,
  defects,
  selectedDefects,
  onDefectsChange,
  onConfirm,
  isLoading = false,
  qcStatus,
}: DefectsSelectionDialogProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingCreation, setPendingCreation] = useState<string | null>(null);

  // Use the defects hook for creating new defects
  const { createDefect, isCreating } = useDefects();

  // Auto-select newly created defect
  useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newDefect = defects.find(
        (defect) => defect.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newDefect && !selectedDefects.includes(newDefect.id)) {
        onDefectsChange([...selectedDefects, newDefect.id]);
        setPendingCreation(null);
      }
    }
  }, [defects, isCreating, pendingCreation, selectedDefects, onDefectsChange]);

  // Filter defects based on search query
  const filteredDefects = defects.filter((defect) =>
    defect.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing defect exactly
  const exactMatch = defects.some(
    (defect) => defect.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateDefect = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createDefect({
          name: searchQuery.trim(),
          description: `Created during QC ${qcStatus}`,
        });
        setSearchQuery("");
        setSearchOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleDefectSelect = (defectId: number) => {
    const isSelected = selectedDefects.includes(defectId);
    if (isSelected) {
      onDefectsChange(selectedDefects.filter((id) => id !== defectId));
    } else {
      onDefectsChange([...selectedDefects, defectId]);
    }
    setSearchOpen(false);
  };
  const handleDefectToggle = (defectId: number, checked: boolean) => {
    const newSelectedDefects = checked
      ? [...selectedDefects, defectId]
      : selectedDefects.filter((id) => id !== defectId);
    onDefectsChange(newSelectedDefects);
  };

  const handleSelectAll = () => {
    const allDefectIds = defects.map((d) => d.id);
    onDefectsChange(allDefectIds);
  };

  const handleClearAll = () => {
    onDefectsChange([]);
  };

  const getStatusColor = () => {
    return qcStatus === "fail" ? "text-red-600" : "text-orange-600";
  };

  const getStatusBgColor = () => {
    return qcStatus === "fail"
      ? "bg-red-50 border-red-200"
      : "bg-orange-50 border-orange-200";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-visible">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle
            className={`flex items-center gap-2 ${getStatusColor()}`}>
            Select Defects for {qcStatus === "fail" ? "QC Fail" : "QC Rework"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Add Defect Combobox */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Defect</label>
          <Popover
            modal
            open={searchOpen}
            onOpenChange={setSearchOpen}>

              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between">
                  Search or add defect...
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
               <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search defects..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    autoFocus
                  />
                  <CommandList
                    className="max-h-64 overflow-y-auto"
                    onWheelCapture={(e) => e.stopPropagation()}
                  >


                    {filteredDefects.length === 0 && !searchQuery && (
                      <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1">
                        No defects found.
                      </CommandEmpty>
                    )}
                    {filteredDefects.length === 0 &&
                      searchQuery &&
                      !exactMatch && (
                        <CommandEmpty className="px-0 py-2">
                          <div className="px-2">
                            <p className="text-sm text-muted-foreground mb-1">
                              Not found, create new?
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCreateDefect}
                              disabled={isCreating}
                              className="w-full justify-start">
                              <Plus className="mr-1 h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {isCreating
                                  ? "Creating..."
                                  : `Create "${searchQuery}"`}
                              </span>
                            </Button>
                          </div>
                        </CommandEmpty>
                      )}
                    {filteredDefects.length > 0 && (
                      <CommandGroup>
                        {filteredDefects.map((defect) => (
                        <CommandItem
                              key={defect.id}
                              value={defect.name}
                              onSelect={() => handleDefectSelect(defect.id)}
                            >

                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedDefects.includes(defect.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <span className="font-medium">{defect.name}</span>
                              {defect.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {defect.description}
                                </p>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Summary and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={getStatusBgColor()}>
                {selectedDefects.length} defect
                {selectedDefects.length !== 1 ? "s" : ""} selected
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedDefects.length === defects.length}>
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedDefects.length === 0}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Selected Defects List */}
          {selectedDefects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Defects</label>
              <div className="rounded-md border p-3">
                <div className="flex flex-wrap gap-2">
                  {selectedDefects.map((defectId) => {
                    const defect = defects.find((d) => d.id === defectId);
                    if (!defect) return null;
                    return (
                      <Badge
                        key={defectId}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1">
                        {defect.name}
                        <button
                          type="button"
                          className="ml-1 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDefectToggle(defectId, false);
                          }}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Use the search above to quickly find and add defects, or create new
            ones if they don't exist.
          </p>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={
              qcStatus === "fail"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-600 hover:bg-orange-700"
            }>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              `Confirm ${qcStatus === "fail" ? "Failure" : "Rework"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

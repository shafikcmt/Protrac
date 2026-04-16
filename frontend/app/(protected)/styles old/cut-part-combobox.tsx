"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCutParts } from "../configuration/cut-parts/use-cut-parts";

interface CutPartComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CutPartCombobox({
  value,
  onValueChange,
  placeholder = "Select cut part...",
  disabled = false,
  className,
}: CutPartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { cutParts, createCutPart, isCreating } = useCutParts();

  const selectedCutPart = cutParts.find((cutPart) => cutPart.id === value);

  // Auto-select newly created cut part
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newCutPart = cutParts.find(
        (cutPart) =>
          cutPart.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newCutPart) {
        onValueChange(newCutPart.id);
        setPendingCreation(null);
      }
    }
  }, [cutParts, isCreating, pendingCreation, onValueChange]);

  // Filter cut parts based on search query
  const filteredCutParts = cutParts.filter((cutPart) =>
    cutPart.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing cut part exactly
  const exactMatch = cutParts.some(
    (cutPart) => cutPart.name.toLowerCase() === searchQuery.toLowerCase()
  );
  const handleCreateCutPart = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createCutPart({ name: searchQuery.trim() });
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleSelect = (cutPartId: number) => {
    onValueChange(cutPartId === value ? 0 : cutPartId);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}>
          {selectedCutPart ? selectedCutPart.name : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] max-w-[250px] p-0">
        <Command>
          <CommandInput
            placeholder="Search cut parts..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredCutParts.length === 0 && !searchQuery && (
              <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1 truncate">
                No cut parts found.
              </CommandEmpty>
            )}
            {filteredCutParts.length === 0 && searchQuery && !exactMatch && (
              <CommandEmpty className="px-0 py-2">
                <div className="px-2">
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    Not found, create new?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateCutPart}
                    disabled={isCreating}
                    className="w-full justify-start">
                    <Plus className="mr-1 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isCreating ? "Creating..." : `Create ${searchQuery}`}
                    </span>
                  </Button>
                </div>
              </CommandEmpty>
            )}
            {filteredCutParts.length > 0 && (
              <CommandGroup>
                {filteredCutParts.map((cutPart) => (
                  <CommandItem
                    key={cutPart.id}
                    value={cutPart.id.toString()}
                    onSelect={() => handleSelect(cutPart.id)}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === cutPart.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{cutPart.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

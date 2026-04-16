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
import { useParts } from "./use-parts";

interface PartComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  excludeIds?: number[];
}

export function PartCombobox({
  value,
  onValueChange,
  placeholder = "Select part...",
  disabled = false,
  className,
  excludeIds = [],
}: PartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { parts, createPart, isCreating } = useParts();

  const selectedPart = parts.find((part) => part.id === value);

  // Auto-select newly created part
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newPart = parts.find(
        (part) => part.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newPart) {
        onValueChange(newPart.id);
        setPendingCreation(null);
        setOpen(false);
      }
    }
  }, [parts, pendingCreation, isCreating, onValueChange]);

  const filteredParts = parts.filter(
    (part) =>
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !excludeIds.includes(part.id)
  );

  const handleCreatePart = async () => {
    if (searchQuery.trim()) {
      setPendingCreation(searchQuery.trim());
      await createPart({ name: searchQuery.trim() });
    }
  };

  const canCreateNew =
    searchQuery.trim().length > 0 &&
    !parts.some(
      (part) => part.name.toLowerCase() === searchQuery.toLowerCase()
    );

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
          {selectedPart ? selectedPart.name : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start">
        <Command>
          <CommandInput
            placeholder="Search parts..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredParts.length === 0 && searchQuery.length === 0 && (
              <CommandEmpty>No parts found.</CommandEmpty>
            )}
            {filteredParts.length === 0 && searchQuery.length > 0 && (
              <CommandEmpty>
                No parts found matching "{searchQuery}".
              </CommandEmpty>
            )}
            {filteredParts.length > 0 && (
              <CommandGroup>
                {filteredParts.map((part) => (
                  <CommandItem
                    key={part.id}
                    value={part.name}
                    onSelect={() => {
                      onValueChange(part.id);
                      setOpen(false);
                      setSearchQuery("");
                    }}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === part.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {part.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreatePart}
                  disabled={isCreating}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating ? "Creating..." : `Create "${searchQuery}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

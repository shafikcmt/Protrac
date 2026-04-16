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
import { useSizes } from "../configuration/sizes/use-sizes";

interface SizeComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SizeCombobox({
  value,
  onValueChange,
  placeholder = "Select size...",
  disabled = false,
  className,
}: SizeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { sizes, createSize, isCreating } = useSizes();

  const selectedSize = sizes.find((size) => size.id === value);

  // Auto-select newly created size
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newSize = sizes.find(
        (size) =>
          size.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newSize) {
        onValueChange(newSize.id);
        setPendingCreation(null);
      }
    }
  }, [sizes, isCreating, pendingCreation, onValueChange]);

  // Filter sizes based on search query
  const filteredSizes = sizes.filter((size) =>
    size.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing size exactly
  const exactMatch = sizes.some(
    (size) => size.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateSize = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createSize({ name: searchQuery.trim() });
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleSelect = (sizeId: number) => {
    onValueChange(sizeId === value ? 0 : sizeId);
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
          {selectedSize ? selectedSize.name : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] max-w-[250px] p-0">
        <Command>
          <CommandInput
            placeholder="Search sizes..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredSizes.length === 0 && !searchQuery && (
              <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1 truncate">
                No sizes found.
              </CommandEmpty>
            )}
            {filteredSizes.length === 0 && searchQuery && !exactMatch && (
              <CommandEmpty className="px-0 py-2">
                <div className="px-2">
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    Not found, create new?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateSize}
                    disabled={isCreating}
                    className="w-full justify-start">
                    <Plus className="mr-1 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isCreating ? "Creating..." : `Create "${searchQuery}"`}
                    </span>
                  </Button>
                </div>
              </CommandEmpty>
            )}
            {filteredSizes.length > 0 && (
              <CommandGroup>
                {filteredSizes.map((size) => (
                  <CommandItem
                    key={size.id}
                    value={size.id.toString()}
                    onSelect={() => handleSelect(size.id)}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === size.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{size.name}</span>
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

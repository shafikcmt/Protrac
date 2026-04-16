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
import { useColors } from "../configuration/colors/use-colors";

interface ColorComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ColorCombobox({
  value,
  onValueChange,
  placeholder = "Select color...",
  disabled = false,
  className,
}: ColorComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { colors, createColor, isCreating } = useColors();

  const selectedColor = colors.find((color) => color.id === value);

  // Auto-select newly created color
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newColor = colors.find(
        (color) => color.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newColor) {
        onValueChange(newColor.id);
        setPendingCreation(null);
      }
    }
  }, [colors, isCreating, pendingCreation, onValueChange]);

  // Filter colors based on search query
  const filteredColors = colors.filter((color) =>
    color.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing color exactly
  const exactMatch = colors.some(
    (color) => color.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateColor = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createColor({ name: searchQuery.trim() });
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleSelect = (colorId: number) => {
    onValueChange(colorId === value ? 0 : colorId);
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
          {selectedColor ? selectedColor.name : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] max-w-[250px] p-0">
        <Command>
          <CommandInput
            placeholder="Search colors..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredColors.length === 0 && !searchQuery && (
              <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1 truncate">
                No colors found.
              </CommandEmpty>
            )}
            {filteredColors.length === 0 && searchQuery && !exactMatch && (
              <CommandEmpty className="px-0 py-2">
                <div className="px-2">
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    Not found, create new?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateColor}
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
            {filteredColors.length > 0 && (
              <CommandGroup>
                {filteredColors.map((color) => (
                  <CommandItem
                    key={color.id}
                    value={color.id.toString()}
                    onSelect={() => handleSelect(color.id)}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === color.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{color.name}</span>
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

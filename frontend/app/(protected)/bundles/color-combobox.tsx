"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
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

export interface ColorOption {
  id: number;
  name: string;
}

interface ColorComboboxProps {
  value?: number;
  onValueChangeAction: (value: number) => void;
  /** Colors available for the current selection. Supplied by the parent so this
   * never fetches the global color list. */
  options: ColorOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function ColorCombobox({
  value,
  onValueChangeAction,
  options,
  placeholder = "All colors",
  disabled = false,
  isLoading = false,
  className,
}: ColorComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedColor = options.find((color) => color.id === value);

  const filteredColors = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((color) => color.name.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Reset the search box whenever the popover closes.
  React.useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const handleSelect = (colorId: number) => {
    // Selecting the active color clears the filter.
    onValueChangeAction(colorId === value ? 0 : colorId);
    setOpen(false);
  };

  return (
    <Popover
      modal
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
          disabled={disabled || isLoading}
        >
          <span className="truncate">
            {isLoading
              ? "Loading colors..."
              : selectedColor
                ? selectedColor.name
                : placeholder}
          </span>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search colors..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <CommandList className="max-h-60 overflow-y-auto">
            {filteredColors.length === 0 && (
              <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
                {options.length === 0
                  ? "No colors in this order."
                  : "No colors found."}
              </CommandEmpty>
            )}

            {filteredColors.length > 0 && (
              <CommandGroup>
                {/* Explicit reset row so the filter can be cleared without
                    re-selecting the active color. */}
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onValueChangeAction(0);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">All colors</span>
                </CommandItem>

                {filteredColors.map((color) => (
                  <CommandItem
                    key={color.id}
                    value={String(color.id)}
                    onSelect={() => handleSelect(color.id)}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
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

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
import { useSpreads } from "@/app/(protected)/configuration/spreads/use-spreads";

interface SpreadComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SpreadCombobox({
  value,
  onValueChange,
  placeholder = "Select spread...",
  disabled = false,
  className,
}: SpreadComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { spreads, createSpread, isCreating } = useSpreads();

  const selectedSpread = spreads.find((spread) => spread.id === value);

  // Auto-select newly created spread
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newSpread = spreads.find(
        (spread) =>
          spread.number.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newSpread) {
        onValueChange(newSpread.id);
        setPendingCreation(null);
      }
    }
  }, [spreads, isCreating, pendingCreation, onValueChange]);

  // Filter spreads based on search query
  const filteredSpreads = spreads.filter((spread) =>
    spread.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing spread exactly
  const exactMatch = spreads.some(
    (spread) => spread.number.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateSpread = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createSpread({ number: searchQuery.trim() });
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleSelect = (spreadId: number) => {
    onValueChange(spreadId === value ? 0 : spreadId);
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
          {selectedSpread ? selectedSpread.number : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] max-w-[250px] p-0">
        <Command>
          <CommandInput
            placeholder="Search spreads..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredSpreads.length === 0 && !searchQuery && (
              <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1 truncate">
                No spreads found.
              </CommandEmpty>
            )}
            {filteredSpreads.length === 0 && searchQuery && !exactMatch && (
              <CommandEmpty className="px-0 py-2">
                <div className="px-2">
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    Not found, create new?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateSpread}
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
            {filteredSpreads.length > 0 && (
              <CommandGroup>
                {filteredSpreads.map((spread) => (
                  <CommandItem
                    key={spread.id}
                    value={spread.id.toString()}
                    onSelect={() => handleSelect(spread.id)}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === spread.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{spread.number}</span>
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

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
import { useBuyers } from "../configuration/buyers/use-buyers";

interface BuyerComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BuyerCombobox({
  value,
  onValueChange,
  placeholder = "Select buyer...",
  disabled = false,
  className,
}: BuyerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { buyers, createBuyer, isCreating } = useBuyers();

  const selectedBuyer = buyers.find((buyer) => buyer.id === value);

  // Auto-select newly created buyer
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newBuyer = buyers.find(
        (buyer) => buyer.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newBuyer) {
        onValueChange(newBuyer.id);
        setPendingCreation(null);
      }
    }
  }, [buyers, isCreating, pendingCreation, onValueChange]);

  // Filter buyers based on search query
  const filteredBuyers = buyers.filter((buyer) =>
    buyer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing buyer exactly
  const exactMatch = buyers.some(
    (buyer) => buyer.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateBuyer = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createBuyer({ name: searchQuery.trim() });
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleSelect = (buyerId: number) => {
    onValueChange(buyerId === value ? 0 : buyerId);
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
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {selectedBuyer ? selectedBuyer.name : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] max-w-[250px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search buyers..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <CommandList className="max-h-60 overflow-y-auto">
            {filteredBuyers.length === 0 && !searchQuery && (
              <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1 truncate">
                No buyers found.
              </CommandEmpty>
            )}

            {filteredBuyers.length === 0 && searchQuery && !exactMatch && (
              <CommandEmpty className="px-0 py-2">
                <div className="px-2">
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    Not found, create new?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateBuyer}
                    disabled={isCreating}
                    className="w-full justify-start"
                  >
                    <Plus className="mr-1 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isCreating ? "Creating..." : `Create "${searchQuery}"`}
                    </span>
                  </Button>
                </div>
              </CommandEmpty>
            )}

            {filteredBuyers.length > 0 && (
              <CommandGroup>
                {filteredBuyers.map((buyer) => (
                  <CommandItem
                    key={buyer.id}
                    value={buyer.name} // ✅ IMPORTANT: enables search match on text
                    onSelect={() => handleSelect(buyer.id)}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === buyer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{buyer.name}</span>
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

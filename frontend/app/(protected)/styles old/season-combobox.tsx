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
import { useSeasons } from "../configuration/seasons/use-seasons";

interface SeasonComboboxProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SeasonCombobox({
  value,
  onValueChange,
  placeholder = "Select season...",
  disabled = false,
  className,
}: SeasonComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingCreation, setPendingCreation] = React.useState<string | null>(
    null
  );

  const { seasons, createSeason, isCreating } = useSeasons();

  const selectedSeason = seasons.find((season) => season.id === value);

  // Auto-select newly created season
  React.useEffect(() => {
    if (pendingCreation && !isCreating) {
      const newSeason = seasons.find(
        (season) =>
          season.name.toLowerCase() === pendingCreation.toLowerCase()
      );
      if (newSeason) {
        onValueChange(newSeason.id);
        setPendingCreation(null);
      }
    }
  }, [seasons, isCreating, pendingCreation, onValueChange]);

  // Filter seasons based on search query
  const filteredSeasons = seasons.filter((season) =>
    season.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if the search query matches an existing season exactly
  const exactMatch = seasons.some(
    (season) => season.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCreateSeason = async () => {
    if (searchQuery.trim() && !exactMatch) {
      try {
        setPendingCreation(searchQuery.trim());
        createSeason({ name: searchQuery.trim() });
        setSearchQuery("");
        setOpen(false);
      } catch (error) {
        setPendingCreation(null);
        // Error handling is done in the hook
      }
    }
  };

  const handleSelect = (seasonId: number) => {
    onValueChange(seasonId === value ? 0 : seasonId);
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
          {selectedSeason ? selectedSeason.name : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] max-w-[250px] p-0">
        <Command>
          <CommandInput
            placeholder="Search seasons..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredSeasons.length === 0 && !searchQuery && (
              <CommandEmpty className="px-3 text-sm text-muted-foreground mb-1 truncate">
                No seasons found.
              </CommandEmpty>
            )}
            {filteredSeasons.length === 0 && searchQuery && !exactMatch && (
              <CommandEmpty className="px-0 py-2">
                <div className="px-2">
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    Not found, create new?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateSeason}
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
            {filteredSeasons.length > 0 && (
              <CommandGroup>
                {filteredSeasons.map((season) => (
                  <CommandItem
                    key={season.id}
                    value={season.id.toString()}
                    onSelect={() => handleSelect(season.id)}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === season.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{season.name}</span>
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

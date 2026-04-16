"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatDate(date: Date | undefined) {
  if (!date || !isValid(date)) {
    return "";
  }

  return format(date, "d MMMM yyyy");
}

function parseDateFromInput(input: string): Date | undefined {
  if (!input.trim()) {
    return undefined;
  }

  // Try to parse dd/MM/yyyy format (also accepts dd-MM-yyyy and dd.MM.yyyy)
  const normalizedInput = input.replace(/[-\.]/g, "/");

  try {
    const parsedDate = parse(normalizedInput, "dd/MM/yyyy", new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  } catch (error) {
    // If parsing fails, return undefined
  }

  return undefined;
}

function isValidDate(date: Date | undefined) {
  return date !== undefined && isValid(date);
}

export type DatePickerInputProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  defaultValue?: Date;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
  disabled?: boolean;
};

export function DatePickerInput({
  value,
  onChange,
  defaultValue,
  placeholder = "Select a date",
  className,
  align = "end",
  disabled = false,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    value ?? defaultValue
  );
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [inputValue, setInputValue] = React.useState(formatDate(date));

  // Sync external value changes
  React.useEffect(() => {
    setDate(value);
    setMonth(value);
    setInputValue(formatDate(value));
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setInputValue(formatDate(selectedDate));
    setOpen(false);
    onChange?.(selectedDate);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setInputValue(input);
  };
  const handleInputBlur = () => {
    const parsedDate = parseDateFromInput(inputValue);
    if (isValidDate(parsedDate)) {
      setDate(parsedDate);
      setMonth(parsedDate);
      setInputValue(formatDate(parsedDate));
      onChange?.(parsedDate);
    } else {
      // If parsing fails, revert to the previous valid value
      setInputValue(formatDate(date));
    }
  };
  return (
    <div className="relative">
      <Input
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("bg-background pr-10", className)}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            disabled={disabled}>
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">Open calendar</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align={align}
          alignOffset={-8}
          sideOffset={10}>
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            onSelect={handleDateSelect}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

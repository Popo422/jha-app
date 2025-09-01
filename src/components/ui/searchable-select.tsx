"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  inModal?: boolean; // New prop for modal-friendly behavior
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  emptyText = "No options found.",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  inModal = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  // Scroll to selected item when dropdown opens
  React.useEffect(() => {
    if (open && value) {
      // Small delay to ensure the DOM is rendered
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-value="${value}"]`);
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 100);
    }
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate flex-1 min-w-0">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-0",
          inModal && "z-[9999]" // Higher z-index for modals
        )}
        align="start"
        onOpenAutoFocus={(e) => {
          // Prevent auto focus issues in modals
          if (inModal) {
            e.preventDefault();
          }
        }}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 text-left"
          />
          <CommandList className="max-h-[200px] overflow-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (!option.disabled) {
                      onValueChange?.(option.value);
                      setOpen(false);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate flex-1">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
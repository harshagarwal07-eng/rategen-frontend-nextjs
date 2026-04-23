"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandInput } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IOption } from "@/types/common";
import { useDebounce } from "@/hooks/use-debounce";

/* ---------------------------------- Types --------------------------------- */

type Props = {
  options: IOption[];
  value?: string;
  onChange: (value: string) => void;
  maxResults?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  visibleItems?: number;
  disabled?: boolean;
  emptyMessage?: string;
  rightIcon?: React.ReactNode;
};

/* -------------------------- VirtualizedAutocomplete ------------------------- */

export function VirtualizedAutocomplete({
  options,
  value,
  onChange,
  maxResults = 20,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  visibleItems = 8,
  disabled = false,
  emptyMessage = "No options available",
  rightIcon,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [scrollIndex, setScrollIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounce search to avoid excessive filtering
  const debouncedSearch = useDebounce(search, 200);

  // Memoized filtered and limited results
  const filteredOptions = React.useMemo(() => {
    if (!debouncedSearch.trim()) {
      return options.slice(0, maxResults);
    }

    const searchLower = debouncedSearch.toLowerCase();
    return options
      .filter(
        (option) => option.label.toLowerCase().includes(searchLower) || option.value.toLowerCase().includes(searchLower)
      )
      .slice(0, maxResults);
  }, [options, debouncedSearch, maxResults]);

  // Calculate visible items based on scroll position
  const visibleOptions = React.useMemo(() => {
    const start = Math.max(0, scrollIndex);
    const end = Math.min(filteredOptions.length, start + visibleItems + 2);
    return filteredOptions.slice(start, end);
  }, [filteredOptions, scrollIndex, visibleItems]);

  // Memoized selected option
  const selectedOption = React.useMemo(
    () => (value ? options.find((o) => o.value === value) : undefined),
    [options, value]
  );

  // Reset scroll when search changes
  React.useEffect(() => {
    setScrollIndex(0);
  }, [debouncedSearch]);

  // Clear search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setScrollIndex(0);
    }
  }, [open]);

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      if (disabled) return;
      onChange(currentValue);
      setOpen(false);
    },
    [onChange, disabled]
  );

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.target as HTMLDivElement;
    const itemHeight = 35; // Approximate item height
    const newScrollIndex = Math.floor(container.scrollTop / itemHeight);
    setScrollIndex(Math.max(0, newScrollIndex - 1));
  }, []);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setScrollIndex((prev) => Math.min(filteredOptions.length - visibleItems, prev + 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setScrollIndex((prev) => Math.max(0, prev - 1));
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    },
    [open, filteredOptions.length, visibleItems]
  );

  const itemHeight = 35;
  const containerHeight = Math.min(visibleItems * itemHeight, filteredOptions.length * itemHeight);
  const totalHeight = filteredOptions.length * itemHeight;
  const offsetY = scrollIndex * itemHeight;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 border-2",
            open && "border border-ring ring-ring/50 ring-[3px]",
            !value && "text-muted-foreground/40",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onKeyDown={handleKeyDown}
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>

          {rightIcon ? (
            <span className="ml-2 flex-shrink-0 text-muted-foreground">{rightIcon}</span>
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
          )}
        </Button>
      </PopoverTrigger>

      {!disabled && (
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder={searchPlaceholder} className="h-9" value={search} onValueChange={setSearch} />

            <div className="border-t">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {options.length === 0 ? emptyMessage : "No results found."}
                </div>
              ) : (
                <>
                  <div
                    ref={containerRef}
                    className="relative overflow-auto"
                    style={{ height: containerHeight }}
                    onScroll={handleScroll}
                  >
                    {scrollIndex > 0 && <div style={{ height: offsetY }} />}

                    {visibleOptions.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                          value === option.value && "bg-accent"
                        )}
                        style={{ height: itemHeight }}
                        onClick={() => handleSelect(option.value)}
                      >
                        <div className="flex-1 truncate">{option.label}</div>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 flex-shrink-0",
                            value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    ))}

                    {scrollIndex + visibleOptions.length < filteredOptions.length && (
                      <div
                        style={{
                          height: totalHeight - offsetY - visibleOptions.length * itemHeight,
                        }}
                      />
                    )}
                  </div>

                  {filteredOptions.length === maxResults && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                      Showing first {maxResults} results. Refine your search for more specific results.
                    </div>
                  )}
                </>
              )}
            </div>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}

import React from "react";
import { Column } from "@tanstack/react-table";
import { Button } from "../button";
import { Badge } from "../badge";
import { CircleX, Funnel } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../command";
import { Check } from "lucide-react";
import { IOption } from "@/types/common";
import { Separator } from "../separator";

interface DataTableDBFilterProps<TData> {
  column: Column<TData, unknown>;
  title: string;
  onSearch?: (query: string) => Promise<IOption[]>;
}

export function DataTableDBFilter<TData>({
  column,
  title,
  onSearch,
}: DataTableDBFilterProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState<IOption[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const columnFilterValue = column?.getFilterValue() as string[];
  const selectedValues = React.useMemo(
    () => new Set(Array.isArray(columnFilterValue) ? columnFilterValue : []),
    [columnFilterValue]
  );

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Keep last successful results when popover reopens
  const lastSuccessfulResults = React.useRef<IOption[]>([]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return; // Don't search when popover is closed

    const timer = setTimeout(async () => {
      if (searchQuery) {
        setLoading(true);
        try {
          const results = (await onSearch?.(searchQuery)) ?? [];

          setOptions(results);
          lastSuccessfulResults.current = results;
        } catch (error) {
          console.error("❌ Error fetching options:", error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        // When search is cleared, show last successful results
        setOptions(lastSuccessfulResults.current);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch, open]);

  const onOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // When opening, show last successful results
      setOptions(lastSuccessfulResults.current);
    }
  }, []);

  const onItemSelect = React.useCallback(
    (option: { label: string; value: string }, isSelected: boolean) => {
      if (!column) return;

      const newSelectedValues = new Set(selectedValues);
      if (isSelected) {
        newSelectedValues.delete(option.value);
      } else {
        newSelectedValues.add(option.value);
      }
      const filterValues = Array.from(newSelectedValues);
      column.setFilterValue(filterValues.length ? filterValues : undefined);
    },
    [column, selectedValues]
  );

  const onResetClick = React.useCallback(
    (event: React.MouseEvent) => {
      event?.stopPropagation();
      column?.setFilterValue(undefined);
    },
    [column]
  );

  const onResetSelect = React.useCallback(() => {
    column?.setFilterValue(undefined);
  }, [column]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          {selectedValues?.size > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              onClick={onResetClick}
              className="focus-visible:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:outline-none"
            >
              <CircleX className="size-4" />
            </div>
          ) : (
            <Funnel className="size-4" />
          )}
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .concat(
                      Array.from(selectedValues)
                        .filter(
                          (value) => !options.find((opt) => opt.value === value)
                        )
                        .map((value) => ({ label: value, value }))
                    )
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-10 border-input"
          />
          <CommandList>
            {options.length === 0 ? (
              <CommandEmpty>
                {loading ? "Loading..." : "No results found."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.has(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => onItemSelect(option, isSelected)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className={cn("h-4 w-4")} />
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {selectedValues?.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={onResetSelect}
                    className="justify-center text-left"
                  >
                    <CircleX className="mr-2 h-4 w-4" />
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

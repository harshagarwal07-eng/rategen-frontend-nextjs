"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MapPin, Search as SearchIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { fdGetSearchFilterOptions } from "@/data-access/fixed-departures";
import { cn } from "@/lib/utils";

interface FDCountryPickerProps {
  selected: string[];
  onChange: (names: string[]) => void;
  className?: string;
}

export function FDCountryPicker({ selected, onChange, className }: FDCountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: filterOptions, isLoading } = useQuery({
    queryKey: ["fd-search-filter-options"],
    queryFn: fdGetSearchFilterOptions,
  });

  const countries = useMemo(() => {
    const names = new Set<string>();
    for (const c of filterOptions?.cities_with_packages ?? []) {
      if (c.country_name) names.add(c.country_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [filterOptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.toLowerCase().includes(q));
  }, [countries, search]);

  const toggle = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter((s) => s !== name));
    else onChange([...selected, name]);
  };

  const display =
    selected.length === 0
      ? "Where are you going?"
      : selected.length === 1
        ? selected[0]
        : `${selected[0]} +${selected.length - 1} more`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-full hover:bg-muted/50 transition-colors text-left w-full",
            className,
          )}
        >
          <MapPin className="size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Destination
            </div>
            <div
              className={cn(
                "text-sm font-medium truncate",
                selected.length === 0 && "text-muted-foreground font-normal",
              )}
            >
              {display}
            </div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <SearchIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="pl-9 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-72">
          <div className="p-2">
            {isLoading && (
              <div className="text-sm text-muted-foreground py-6 text-center">Loading...</div>
            )}
            {!isLoading && countries.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No countries with packages yet
              </div>
            )}
            {!isLoading && countries.length > 0 && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No matches
              </div>
            )}
            {filtered.map((name) => (
              <label
                key={name}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(name)}
                  onCheckedChange={() => toggle(name)}
                />
                <span className="text-sm">{name}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="p-2 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

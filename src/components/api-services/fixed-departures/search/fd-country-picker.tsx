"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MapPin, Search as SearchIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { fdGetCountries } from "@/data-access/fixed-departures";
import { cn } from "@/lib/utils";

interface FDCountryPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function FDCountryPicker({ selected, onChange, className }: FDCountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["fd-meta-countries"],
    queryFn: fdGetCountries,
  });

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.country_name.toLowerCase().includes(q));
  }, [countries, search]);

  const selectedNames = useMemo(() => {
    return countries.filter((c) => selected.includes(c.id)).map((c) => c.country_name);
  }, [countries, selected]);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const display =
    selectedNames.length === 0
      ? "Where are you going?"
      : selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames[0]} +${selectedNames.length - 1} more`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left w-full",
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
                selectedNames.length === 0 && "text-muted-foreground font-normal",
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
            {!isLoading && filteredCountries.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No countries found
              </div>
            )}
            {filteredCountries.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                />
                <span className="text-sm">{c.country_name}</span>
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

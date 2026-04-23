"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { Search, X, Funnel, XCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { IOption } from "@/types/common";
import { fetchCountriesBySearch, fetchCitiesBySearch } from "@/lib/table-utils";
import { fetchSources } from "@/data-access/source";
import { AGENCY_CATEGORIES } from "@/constants/data";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import useUser from "@/hooks/use-user";

export interface KanbanFilters {
  search: string;
  countries: string[];
  cities: string[];
  categories: string[];
  sources: string[];
}

interface KanbanToolbarProps {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
}

// --- Reusable async search filter ---
function AsyncFilterPopover({
  title,
  selected,
  onSearch,
  onChange,
}: {
  title: string;
  selected: string[];
  onSearch: (q: string) => Promise<IOption[]>;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<IOption[]>([]);
  const lastResults = useRef<IOption[]>([]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setOptions(lastResults.current);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    onSearch(debouncedQuery)
      .then((results) => {
        setOptions(results);
        lastResults.current = results;
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, onSearch, open]);

  const toggle = (opt: IOption) => {
    const next = new Set(selectedSet);
    if (next.has(opt.value)) next.delete(opt.value);
    else next.add(opt.value);
    onChange(Array.from(next));
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Merge selected values that may not be in current search results (keep labels if possible)
  const allVisible = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o]));
    for (const v of selected) {
      if (!map.has(v)) map.set(v, { label: v, value: v });
    }
    return options.concat(
      Array.from(map.values()).filter((o) => selected.includes(o.value) && !options.find((x) => x.value === o.value))
    );
  }, [options, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed text-xs">
          {selectedSet.size > 0 ? (
            <span role="button" tabIndex={0} onClick={clearFilter} className="opacity-70 hover:opacity-100">
              <XCircle className="size-3.5" />
            </span>
          ) : (
            <Funnel className="size-3.5" />
          )}
          {title}
          {selectedSet.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              {selectedSet.size > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal text-xs">
                  {selectedSet.size} selected
                </Badge>
              ) : (
                allVisible
                  .filter((o) => selectedSet.has(o.value))
                  .map((o) => (
                    <Badge key={o.value} variant="secondary" className="rounded-sm px-1 font-normal text-xs">
                      {o.label}
                    </Badge>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${title.toLowerCase()}...`}
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            {options.length === 0 ? (
              <CommandEmpty>{loading ? "Loading..." : "No results found."}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = selectedSet.has(opt.value);
                  return (
                    <CommandItem key={opt.value} onSelect={() => toggle(opt)}>
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="text-xs">{opt.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {selectedSet.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-xs">
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

// --- Static multi-select filter ---
function StaticFilterPopover({
  title,
  selected,
  options,
  onChange,
}: {
  title: string;
  selected: string[];
  options: IOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (opt: IOption) => {
    const next = new Set(selectedSet);
    if (next.has(opt.value)) next.delete(opt.value);
    else next.add(opt.value);
    onChange(Array.from(next));
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed text-xs">
          {selectedSet.size > 0 ? (
            <span role="button" tabIndex={0} onClick={clearFilter} className="opacity-70 hover:opacity-100">
              <XCircle className="size-3.5" />
            </span>
          ) : (
            <Funnel className="size-3.5" />
          )}
          {title}
          {selectedSet.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              {selectedSet.size > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal text-xs">
                  {selectedSet.size} selected
                </Badge>
              ) : (
                options
                  .filter((o) => selectedSet.has(o.value))
                  .map((o) => (
                    <Badge key={o.value} variant="secondary" className="rounded-sm px-1 font-normal text-xs">
                      {o.label}
                    </Badge>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="h-9" />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {options.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <CommandItem key={opt.value} onSelect={() => toggle(opt)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedSet.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-xs">
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

// --- Main toolbar ---
export function KanbanToolbar({ filters, onChange }: KanbanToolbarProps) {
  const { user } = useUser();
  const dmcId = user?.dmc?.id ?? "";
  const fetchSourceOptions = useCallback((q: string) => fetchSources(dmcId, q), [dmcId]);
  const hasActiveFilters =
    filters.countries.length > 0 ||
    filters.cities.length > 0 ||
    filters.categories.length > 0 ||
    filters.sources.length > 0;

  const set = (patch: Partial<KanbanFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 shrink-0">
      {/* Search */}
      <div className="relative w-52">
        <Search className="size-3.5 absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 text-xs h-8"
          placeholder="Search agents..."
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        {filters.search && (
          <button
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => set({ search: "" })}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Country */}
      <AsyncFilterPopover
        title="Country"
        selected={filters.countries}
        onSearch={fetchCountriesBySearch}
        onChange={(v) => set({ countries: v })}
      />

      {/* City */}
      <AsyncFilterPopover
        title="City"
        selected={filters.cities}
        onSearch={fetchCitiesBySearch}
        onChange={(v) => set({ cities: v })}
      />

      {/* Category */}
      <StaticFilterPopover
        title="Category"
        selected={filters.categories}
        options={AGENCY_CATEGORIES}
        onChange={(v) => set({ categories: v })}
      />

      {/* Source */}
      <AsyncFilterPopover
        title="Source"
        selected={filters.sources}
        onSearch={fetchSourceOptions}
        onChange={(v) => set({ sources: v })}
      />

      {/* Reset all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => onChange({ search: filters.search, countries: [], cities: [], categories: [], sources: [] })}
        >
          <X className="size-3 mr-1" />
          Reset filters
        </Button>
      )}
    </div>
  );
}

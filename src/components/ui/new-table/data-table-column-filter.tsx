"use client";

import { Filter, Check, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Column } from "@tanstack/react-table";
import * as React from "react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface SortOption {
  label: string;
  direction: "asc" | "desc";
}

export interface FilterGroup {
  title: string;
  column: Column<any, any>;
  options?: FilterOption[];
  onSearch?: (query: string) => Promise<FilterOption[]>;
}

interface DataTableColumnFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title: string;
  options?: FilterOption[];
  onSearch?: (query: string) => Promise<FilterOption[]>;
  groups?: FilterGroup[];
  sortOptions?: SortOption[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accordion group panel — used in multi-group filter mode
// ─────────────────────────────────────────────────────────────────────────────
interface FilterGroupPanelProps {
  group: FilterGroup;
  /** Skip the accordion header and always show content expanded */
  autoExpand?: boolean;
}

function FilterGroupPanel({ group, autoExpand = false }: FilterGroupPanelProps) {
  const filterValue = group.column.getFilterValue();
  const selected = React.useMemo(
    () => new Set<string>(Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue as string] : []),
    [filterValue]
  );

  const [expanded, setExpanded] = React.useState(() => autoExpand || selected.size > 0);
  const [query, setQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<FilterOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const lastResults = React.useRef<FilterOption[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load results on expand and on query change (empty query = load all)
  React.useEffect(() => {
    if (!group.onSearch || !expanded) return;
    const delay = query ? 300 : 0;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await group.onSearch!(query);
        setSearchResults(results);
        if (results.length > 0) lastResults.current = results;
      } catch {
        setSearchResults(lastResults.current);
      } finally {
        setLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [query, group.onSearch, expanded]);

  const handleSelect = (value: string) => {
    const next = new Set(selected);
    next.has(value) ? next.delete(value) : next.add(value);
    group.column.setFilterValue(next.size ? Array.from(next) : undefined);
  };

  const rawOptions = group.onSearch ? searchResults : (group.options ?? []);

  // Selected items always appear first in the list
  const displayOptions = React.useMemo(() => {
    const inResults = rawOptions.filter((o) => selected.has(o.value));
    const notInResults = rawOptions.filter((o) => !selected.has(o.value));
    // Include selected items missing from current search results
    const ghostSelected = Array.from(selected)
      .filter((v) => !rawOptions.some((o) => o.value === v))
      .map((v) => lastResults.current.find((o) => o.value === v) ?? { value: v, label: v });
    return [...ghostSelected, ...inResults, ...notInResults];
  }, [rawOptions, selected]);

  return (
    <div>
      {/* Accordion header — hidden when autoExpand */}
      {!autoExpand && (
        <button
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                !expanded && "-rotate-90"
              )}
            />
            <span className={cn(selected.size > 0 && "text-primary")}>{group.title}</span>
            {selected.size > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal bg-primary/15 text-primary">
                {selected.size}
              </Badge>
            )}
          </div>
        </button>
      )}

      {/* Content */}
      {(autoExpand || expanded) && (
        <div>
          {/* Search input — thin bordered box, hidden during initial load */}
          {group.onSearch && !(loading && displayOptions.length === 0) && (
            <div className="px-2 py-1.5">
              <div className={cn("flex items-center gap-1.5 rounded border px-2 py-1 transition-colors", query ? "border-primary" : "")}>
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  variant="cell"
                  placeholder={`Search ${group.title.toLowerCase()}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="text-xs"
                  autoFocus={autoExpand}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-[180px] overflow-y-auto">
            {loading && displayOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading...</div>
            ) : displayOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {group.onSearch ? (query ? "No results." : "No options.") : "No options."}
              </div>
            ) : (
              <div>
                {displayOptions.map((option) => {
                  const isSelected = selected.has(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-accent",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span
                        className={cn(
                          "truncate",
                          isSelected ? "text-primary font-medium" : "text-foreground"
                        )}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selected.size > 0 && (
            <div className="border-t px-3 py-1.5">
              <button
                onClick={() => group.column.setFilterValue(undefined)}
                className="flex w-full items-center justify-center gap-1.5 rounded-sm py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3 w-3" />
                Clear {selected.size} selected
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function DataTableColumnFilter<TData, TValue>({
  column,
  title,
  options = [],
  onSearch,
  groups,
  sortOptions,
  enableSorting = true,
  enableFiltering = true,
}: DataTableColumnFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false);

  const sortDirection = column?.getIsSorted() || false;
  const canSort = enableSorting && (column?.getCanSort() ?? false);

  const filterValue = column?.getFilterValue();
  const selected = React.useMemo(
    () => new Set<string>(Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue as string] : []),
    [filterValue]
  );

  const totalGroupSelected = React.useMemo(() => {
    if (!groups?.length) return 0;
    return groups.reduce((sum, g) => {
      const v = g.column.getFilterValue();
      return sum + new Set<string>(Array.isArray(v) ? v : v ? [v as string] : []).size;
    }, 0);
  }, [groups]);

  // Single search filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<FilterOption[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const lastSearchResults = React.useRef<FilterOption[]>([]);

  // Load on open and on query change (empty query = load all)
  React.useEffect(() => {
    if (!onSearch || !open) return;
    const delay = searchQuery ? 300 : 0;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await onSearch(searchQuery);
        setSearchResults(results);
        lastSearchResults.current = results;
      } catch {
        setSearchResults(lastSearchResults.current);
      } finally {
        setSearchLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearch, open]);

  React.useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const isMultiGroup = !!groups?.length;
  const isSingleSearch = !isMultiGroup && !!onSearch;
  const isSingleStatic = !isMultiGroup && !isSingleSearch && options.length > 0;

  const canFilter = enableFiltering && (isSingleStatic || isSingleSearch || isMultiGroup);
  const totalSelected = isMultiGroup ? totalGroupSelected : selected.size;

  if (!canSort && !canFilter) {
    return <div className="font-medium">{title}</div>;
  }

  const handleSelect = (value: string) => {
    const next = new Set(selected);
    next.has(value) ? next.delete(value) : next.add(value);
    column?.setFilterValue(next.size ? Array.from(next) : undefined);
  };

  const handleClearFilter = () => {
    column?.setFilterValue(undefined);
  };

  const handleSort = (direction: "asc" | "desc" | false) => {
    if (!column) return;
    if (direction === false) {
      column.clearSorting();
    } else {
      column.toggleSorting(direction === "desc");
    }
    if (!canFilter) setOpen(false);
  };

  const handleClearAllGroups = () => {
    groups?.forEach((g) => g.column.setFilterValue(undefined));
    setOpen(false);
  };

  const effectiveSortOptions: SortOption[] = sortOptions ?? [
    { label: "Sort Ascending", direction: "asc" },
    { label: "Sort Descending", direction: "desc" },
  ];

  // Selected-first sorted options for isSingleSearch
  const sortedSearchResults = React.useMemo(() => {
    const sel = searchResults.filter((o) => selected.has(o.value));
    const unsel = searchResults.filter((o) => !selected.has(o.value));
    const ghost = Array.from(selected)
      .filter((v) => !searchResults.some((o) => o.value === v))
      .map((v) => lastSearchResults.current.find((o) => o.value === v) ?? { value: v, label: v });
    return [...ghost, ...sel, ...unsel];
  }, [searchResults, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-full data-[state=open]:bg-accent flex items-center justify-between gap-1.5 px-2 [&_svg:not([class*='size-'])]:size-3.5",
            (totalSelected > 0 || sortDirection) && "text-primary"
          )}
        >
          <span className="font-medium">{title}</span>
          <div className="flex items-center gap-1">
            {canSort && sortDirection === "asc" && <ArrowUp className="text-primary" />}
            {canSort && sortDirection === "desc" && <ArrowDown className="text-primary" />}
            {canSort && !sortDirection && <ArrowUpDown className="text-muted-foreground" />}
            {canFilter && (
              <>
                <Filter className={cn(totalSelected > 0 ? "text-primary" : "text-muted-foreground")} />
                {totalSelected > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">
                    {totalSelected}
                  </Badge>
                )}
              </>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn("p-0 overflow-hidden", isMultiGroup ? "w-[220px]" : "w-[200px]")}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* ── Sorting ────────────────────────────────────── */}
        {canSort && (
          <div className="p-1">
            {effectiveSortOptions.map((opt) => {
              const isActive = sortDirection === opt.direction;
              return (
                <button
                  key={opt.direction}
                  onClick={() => handleSort(isActive ? false : opt.direction)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                    isActive ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  {opt.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="flex-1 text-left">{opt.label}</span>
                  {isActive && <Check className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
            {sortDirection && (
              <button
                onClick={() => handleSort(false)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                <span>Clear sorting</span>
              </button>
            )}
          </div>
        )}

        {canSort && canFilter && <div className="border-t" />}

        {/* ── Single static filter ────────────────────────── */}
        {isSingleStatic && (
          <Command>
            <CommandList>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.has(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className={cn("gap-2 py-1.5", isSelected && "bg-primary/5")}
                    >
                      <div
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className={cn("text-xs", isSelected && "text-primary font-medium")}>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {selected.size > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleClearFilter}
                      className="justify-center text-center text-xs text-muted-foreground"
                    >
                      Clear filter
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        )}

        {/* ── Single search (async autocomplete) ─────────── */}
        {isSingleSearch && (
          <div>
            {/* Search input — thin bordered box, hidden during initial load */}
            {!(searchLoading && sortedSearchResults.length === 0) && (
              <div className="px-2 py-2">
                <div className={cn("flex items-center gap-1.5 rounded border px-2 py-1.5 transition-colors", searchQuery ? "border-primary" : "")}>
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Input
                    variant="cell"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-[180px] overflow-y-auto">
              {searchLoading && sortedSearchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">Loading...</div>
              ) : sortedSearchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {searchQuery ? "No results." : "No options."}
                </div>
              ) : (
                <div className="py-1">
                  {sortedSearchResults.map((option) => {
                    const isSelected = selected.has(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-accent",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span className={cn("truncate", isSelected ? "text-primary font-medium" : "text-foreground")}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selected.size > 0 && (
              <div className="border-t px-3 py-1.5">
                <button
                  onClick={handleClearFilter}
                  className="flex w-full items-center justify-center gap-1.5 rounded-sm py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear {selected.size} selected
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Multi-group accordion filter ────────────────── */}
        {isMultiGroup && (
          <div>
            {groups!.map((group, i) => (
              <FilterGroupPanel
                key={`${group.title}-${i}`}
                group={group}
                autoExpand={groups!.length === 1}
              />
            ))}
            {/* Clear all — only shown for multi-group (single group handles its own clear) */}
            {groups!.length > 1 && totalGroupSelected > 0 && (
              <div>
                <button
                  onClick={handleClearAllGroups}
                  className="flex w-full justify-center py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

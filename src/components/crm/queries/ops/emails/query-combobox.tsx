"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, Check, ChevronDown, X, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchQueries } from "./use-gmail-queries";
import type { ActiveQuerySummary } from "@/data-access/crm-queries";

interface QueryComboboxProps {
  dmcId?: string;
  queries?: ActiveQuerySummary[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  onAttach?: (queryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: "inline" | "button";
}

export function QueryCombobox({
  dmcId,
  queries: initialQueries = [],
  value,
  onChange,
  onAttach,
  placeholder,
  disabled = false,
  variant = "button",
}: QueryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: searchResults, isLoading } = useSearchQueries(
    dmcId,
    debouncedSearch,
    open
  );
  const queries = searchResults ?? initialQueries;
  const isAttachMode = !!onAttach;
  const selected = queries.find((q) => q.query_id === value) ?? initialQueries.find((q) => q.query_id === value);

  const handleSelect = (queryId: string) => {
    if (isAttachMode) {
      onAttach(queryId);
      setOpen(false);
    } else {
      onChange?.(queryId === value ? null : queryId);
      setOpen(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };

  const effectivePlaceholder =
    placeholder ??
    (isAttachMode ? "Attach to query…" : "Select query (optional)");

  const isInline = variant === "inline";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 w-full text-left transition-colors disabled:opacity-50",
            isInline
              ? "h-7 px-0 py-0 text-sm bg-transparent hover:bg-transparent focus:outline-none"
              : "h-9 px-3 rounded-lg border border-border/60 text-xs hover:bg-muted/60 bg-card"
          )}
        >
          {!isInline && (
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="flex-1 min-w-0 flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  #{selected.query_id.toUpperCase()}
                </span>
                <span className="truncate text-muted-foreground text-xs">
                  {selected.traveler_name}
                </span>
                {!isInline && (
                  <X
                    className="h-3 w-3 ml-auto shrink-0 text-muted-foreground/60 hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.(null);
                    }}
                  />
                )}
              </>
            ) : (
              <span className={cn("truncate", isInline ? "text-muted-foreground/60" : "text-muted-foreground text-xs")}>
                {effectivePlaceholder}
              </span>
            )}
          </span>
          {!isInline && !selected && (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0 shadow-xl"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="relative border-b">
            <CommandInput
              placeholder="Search by query ID or traveler…"
              className="h-10 text-sm pr-8"
              value={search}
              onValueChange={setSearch}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            )}
          </div>
          <CommandList className="max-h-[260px]">
            <CommandEmpty className="py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                {isLoading ? "Searching…" : "No queries found"}
              </p>
              {!debouncedSearch && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Type to search by query ID or traveler name
                </p>
              )}
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {!isAttachMode && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange?.(null);
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground gap-2 rounded-md mb-1 h-8"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear selection
                </CommandItem>
              )}
              {queries.map((q) => {
                const isSelected = value === q.query_id;
                return (
                  <CommandItem
                    key={q.id}
                    value={`${q.query_id} ${q.traveler_name}`}
                    onSelect={() => handleSelect(q.query_id)}
                    className={cn(
                      "flex items-center gap-3 py-2.5 px-2.5 rounded-lg cursor-pointer mb-0.5",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        q.query_id.slice(-3).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[11px] font-semibold px-1.5 py-0.5 rounded",
                          isSelected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-foreground"
                        )}>
                          #{q.query_id.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{q.traveler_name}</span>
                        {q.travel_country_names?.length ? (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{q.travel_country_names.join(", ")}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

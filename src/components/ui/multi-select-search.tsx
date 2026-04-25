"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronsUpDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectSearchProps {
  fetchFn: (search: string) => Promise<MultiSelectOption[]>;
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
  initialLabelMap?: Record<string, string>;
}

export function MultiSelectSearch({
  fetchFn,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  minChars = 0,
  debounceMs = 300,
  initialLabelMap,
}: MultiSelectSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  // Accumulate labels across search changes so chips remain labeled even after search clears
  const [labelMap, setLabelMap] = useState<Record<string, string>>(initialLabelMap ?? {});

  // Merge new entries from initialLabelMap when it changes (e.g. async hydration in edit mode)
  useEffect(() => {
    if (!initialLabelMap) return;
    setLabelMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [k, v] of Object.entries(initialLabelMap)) {
        if (next[k] !== v) {
          next[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialLabelMap]);

  const debouncedSearch = useDebounce(search, debounceMs);

  useEffect(() => {
    if (!open) return;
    if (minChars > 0 && debouncedSearch.length < minChars) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchFn(debouncedSearch)
      .then((res) => {
        if (cancelled) return;
        setResults(res);
        setLabelMap((prev) => {
          const next = { ...prev };
          for (const r of res) next[r.id] = r.label;
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, fetchFn, minChars]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const toggle = useCallback(
    (id: string, label: string) => {
      setLabelMap((prev) => ({ ...prev, [id]: label }));
      if (value.includes(id)) {
        onChange(value.filter((v) => v !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [value, onChange]
  );

  const remove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "min-h-10 h-auto w-full justify-between px-3 py-1.5 font-normal border-2",
            value.length === 0 && "text-muted-foreground/40",
            open && "border-ring ring-ring/50 ring-[3px]"
          )}
        >
          <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0">
            {value.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              value.map((id) => {
                const label = labelMap[id] ?? id;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs font-normal py-0 px-2 flex items-center gap-1 max-w-[180px]"
                  >
                    <span className="truncate">{label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${label}`}
                      className="ml-0.5 rounded-full hover:bg-destructive/20 cursor-pointer"
                      onMouseDown={(e) => remove(id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") remove(id, e as unknown as React.MouseEvent);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {loading
                ? "Loading..."
                : minChars > 0 && search.length < minChars
                ? `Type ${minChars}+ characters to search`
                : "No results found."}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {results.map((opt) => {
                const selected = value.includes(opt.id);
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    onSelect={() => toggle(opt.id, opt.label)}
                    className="cursor-pointer"
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {value.length > 0 && (
            <div className="border-t px-2 py-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{value.length} selected</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
                Clear all
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

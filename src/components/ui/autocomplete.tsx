"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IOption } from "@/types/common";
import { useDebounce } from "@/hooks/use-debounce";
import { Country } from "react-phone-number-input";
import { FlagComponent } from "./phone-input";

type Props = {
  mode?: "client" | "server";
  value?: string;
  onChange: (value: string) => void;

  // client mode
  options?: IOption[];

  // server mode
  onSearch?: (query: string) => Promise<IOption[]>;
  fetchByValue?: (value: string) => Promise<IOption | null>;

  maxResults?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  showCountryFlag?: boolean;
  disabled?: boolean;
  rightIcon?: React.ReactNode;
  emptyMessage?: string;
};

export function Autocomplete({
  mode = "client",
  value,
  onChange,
  options = [],
  onSearch,
  fetchByValue,
  maxResults = 20,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  showCountryFlag,
  disabled = false,
  rightIcon,
  emptyMessage = "No result found.",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<IOption[]>([]);
  const [selectedOption, setSelectedOption] = React.useState<IOption | null>(null);
  const [loading, setLoading] = React.useState(false);

  const debouncedSearch = useDebounce(search, 300);

  /* ---------------- CLIENT MODE ---------------- */
  React.useEffect(() => {
    console.count("[FD-DEBUG] Autocomplete:client-mode-effect");
    if (mode !== "client") return;

    if (!debouncedSearch.trim()) {
      setResults(options.slice(0, maxResults));
      return;
    }

    const q = debouncedSearch.toLowerCase();
    setResults(
      options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)).slice(0, maxResults)
    );
  }, [mode, options, debouncedSearch, maxResults]);

  /* ---------------- SERVER MODE SEARCH ---------------- */
  React.useEffect(() => {
    console.count("[FD-DEBUG] Autocomplete:server-search-effect");
    if (mode !== "server" || !onSearch || disabled || !open) return;

    let cancelled = false;
    // When dropdown is open, fetch results (initial list when nothing typed, or search results)
    const query = debouncedSearch.trim();

    (async () => {
      setLoading(true);
      try {
        const res = await onSearch(query);
        if (!cancelled) setResults(res.slice(0, maxResults));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, debouncedSearch, onSearch, maxResults, disabled, open]);

  /* ---------------- HYDRATE SELECTED VALUE (EDIT MODE) ---------------- */
  React.useEffect(() => {
    console.count("[FD-DEBUG] Autocomplete:hydrate-effect (PRIME SUSPECT)");
    console.log("[FD-DEBUG] hydrate deps:", { value, mode, optionsLen: options.length, optionsRef: options, fetchByValue: !!fetchByValue });
    if (!value) {
      setSelectedOption(null);
      return;
    }

    // client mode hydrate
    if (mode === "client") {
      const opt = options.find((o) => o.value === value);
      if (opt) setSelectedOption(opt);
      return;
    }

    // server mode hydrate (critical)
    if (mode === "server" && fetchByValue) {
      fetchByValue(value).then((opt) => {
        if (opt) {
          console.count("[FD-DEBUG] Autocomplete:setSelectedOption-from-fetchByValue");
          setSelectedOption(opt);
        }
      });
    }
  }, [value, mode, options, fetchByValue]);

  /* ---------------- CLEANUP ---------------- */
  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  // Keyboard navigation improvements
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  }, []);

  const handleSelect = (val: string) => {
    if (disabled) return;

    const opt = results.find((o) => o.value === val);
    if (!opt) return;

    setSelectedOption(opt);
    onChange(val);
    setOpen(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => !disabled && setOpen(v)} modal>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 border-2",
            open && "border-ring ring-ring/50 ring-[3px]",
            !value && "text-muted-foreground/40"
          )}
          onKeyDown={handleKeyDown}
        >
          {selectedOption?.label || placeholder}
          {rightIcon ? (
            <span className="ml-2 flex-shrink-0">{rightIcon}</span>
          ) : (
            <ChevronsUpDown className="opacity-50" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            disabled={disabled}
            placeholder={searchPlaceholder}
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />

          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : !debouncedSearch && mode === "client" ? "Start typing..." : emptyMessage}
            </CommandEmpty>

            <CommandGroup>
              {results.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={handleSelect} className="cursor-pointer">
                  <div className="flex-1 truncate flex gap-2">
                    {showCountryFlag && <FlagComponent country={option.code as Country} countryName={option.value} />}
                    {option.label}
                  </div>
                  <Check className={cn("ml-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
            {results.length === maxResults && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                Showing first {maxResults} results. Refine your search for more specific results.
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

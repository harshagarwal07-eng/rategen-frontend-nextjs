"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCountryOptions } from "@/hooks/use-country-city-options";
import { cn } from "@/lib/utils";

type Props = {
  value: string[]; // ISO 3166-1 alpha-2 codes
  onChange: (codes: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function CountryMultiSelect({
  value,
  onChange,
  placeholder = "Select countries…",
  disabled,
}: Props) {
  const { data: countries = [], isLoading } = useCountryOptions();
  const [open, setOpen] = useState(false);

  const byCode = useMemo(() => {
    const m = new Map<string, string>();
    countries.forEach((c) => {
      if (c.code) m.set(c.code, c.label);
    });
    return m;
  }, [countries]);

  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else onChange([...value, code]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled || isLoading}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length > 0 ? `${value.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries…" />
            <CommandList>
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup>
                {countries.map((c) => {
                  const code = c.code ?? "";
                  if (!code) return null;
                  const selected = value.includes(code);
                  return (
                    <CommandItem
                      key={c.value}
                      value={`${c.label} ${code}`}
                      onSelect={() => toggle(code)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1">{c.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{code}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {byCode.get(code) ?? code}
              <button
                type="button"
                onClick={() => toggle(code)}
                disabled={disabled}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

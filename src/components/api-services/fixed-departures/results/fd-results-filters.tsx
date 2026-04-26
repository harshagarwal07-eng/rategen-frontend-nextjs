"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search as SearchIcon, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fdGetSearchFilterOptions } from "@/data-access/fixed-departures";
import { FDMonthPicker } from "../search/fd-month-picker";
import { cn } from "@/lib/utils";

const AGE_GROUP_OPTIONS = [
  { value: "family", label: "Family" },
  { value: "adults", label: "Adults only" },
  { value: "custom", label: "Custom" },
];

const DURATION_OPTIONS = [
  { value: "1-4", label: "1 – 4 nights" },
  { value: "5-10", label: "5 – 10 nights" },
  { value: "11-15", label: "11 – 15 nights" },
  { value: "16plus", label: "16+ nights" },
];

export interface FDFilterValues {
  countries: string[]; // country names
  cities: string[]; // city ids
  months: string[];
  departureCity: string;
  ageGroups: string[];
  durations: string[];
}

interface FDResultsFiltersProps {
  values: FDFilterValues;
  onChange: (next: FDFilterValues) => void;
}

export function FDResultsFilters({ values, onChange }: FDResultsFiltersProps) {
  const { data: filterOptions } = useQuery({
    queryKey: ["fd-search-filter-options"],
    queryFn: fdGetSearchFilterOptions,
  });

  const allCities = useMemo(
    () => filterOptions?.cities_with_packages ?? [],
    [filterOptions],
  );
  const departureCities = filterOptions?.departure_cities ?? [];

  const allCountries = useMemo(() => {
    const names = new Set<string>();
    for (const c of allCities) {
      if (c.country_name) names.add(c.country_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allCities]);

  const cityOptions = useMemo(() => {
    if (values.countries.length === 0) return allCities;
    const set = new Set(values.countries);
    return allCities.filter((c) => set.has(c.country_name));
  }, [allCities, values.countries]);

  const cityNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of allCities) m.set(c.id, c.name);
    return m;
  }, [allCities]);

  const activeCount =
    values.countries.length +
    values.cities.length +
    values.months.length +
    values.ageGroups.length +
    values.durations.length +
    (values.departureCity ? 1 : 0);

  const toggleArray = (key: keyof FDFilterValues, val: string) => {
    const arr = values[key] as string[];
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    onChange({ ...values, [key]: next });
  };

  const removePill = (kind: "country" | "city" | "month" | "departureCity" | "age" | "duration", val: string) => {
    if (kind === "country") {
      onChange({ ...values, countries: values.countries.filter((c) => c !== val) });
    } else if (kind === "city") {
      onChange({ ...values, cities: values.cities.filter((c) => c !== val) });
    } else if (kind === "month") {
      onChange({ ...values, months: values.months.filter((m) => m !== val) });
    } else if (kind === "departureCity") {
      onChange({ ...values, departureCity: "" });
    } else if (kind === "age") {
      onChange({ ...values, ageGroups: values.ageGroups.filter((a) => a !== val) });
    } else if (kind === "duration") {
      onChange({ ...values, durations: values.durations.filter((d) => d !== val) });
    }
  };

  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  };

  const clearAll = () =>
    onChange({
      countries: [],
      cities: [],
      months: [],
      departureCity: "",
      ageGroups: [],
      durations: [],
    });

  return (
    <Card className="border-border/60 shadow-sm p-0 overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {activeCount > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={clearAll}
          >
            Clear all
          </button>
        )}
      </div>

      {activeCount > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {values.countries.map((c) => (
            <Pill key={`co-${c}`} label={c} onRemove={() => removePill("country", c)} />
          ))}
          {values.cities.map((id) => (
            <Pill
              key={`ci-${id}`}
              label={cityNameById.get(id) ?? id}
              onRemove={() => removePill("city", id)}
            />
          ))}
          {values.months.map((m) => (
            <Pill key={`mo-${m}`} label={formatMonthLabel(m)} onRemove={() => removePill("month", m)} />
          ))}
          {values.departureCity && (
            <Pill
              label={`From ${values.departureCity}`}
              onRemove={() => removePill("departureCity", "")}
            />
          )}
          {values.ageGroups.map((g) => (
            <Pill
              key={`ag-${g}`}
              label={AGE_GROUP_OPTIONS.find((o) => o.value === g)?.label ?? g}
              onRemove={() => removePill("age", g)}
            />
          ))}
          {values.durations.map((d) => (
            <Pill
              key={`du-${d}`}
              label={DURATION_OPTIONS.find((o) => o.value === d)?.label ?? d}
              onRemove={() => removePill("duration", d)}
            />
          ))}
        </div>
      )}

      <div className="border-t border-border/60" />

      <FilterSection
        label="Countries"
        activeCount={values.countries.length}
      >
        <CountriesPicker
          countries={allCountries}
          selected={values.countries}
          onChange={(next) => onChange({ ...values, countries: next })}
        />
      </FilterSection>

      <FilterSection
        label="Cities"
        activeCount={values.cities.length}
      >
        <CitiesPicker
          cities={cityOptions}
          selected={values.cities}
          onChange={(next) => onChange({ ...values, cities: next })}
        />
      </FilterSection>

      <FilterSection label="Travel Months" activeCount={values.months.length}>
        <FDMonthPicker
          selected={values.months}
          onChange={(m) => onChange({ ...values, months: m })}
        />
      </FilterSection>

      <FilterSection
        label="Departure City"
        activeCount={values.departureCity ? 1 : 0}
      >
        <RadioGroup
          value={values.departureCity || "_any"}
          onValueChange={(v) =>
            onChange({ ...values, departureCity: v === "_any" ? "" : v })
          }
          className="space-y-1 max-h-56 overflow-y-auto"
        >
          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer">
            <RadioGroupItem value="_any" id="dep-any" />
            <Label htmlFor="dep-any" className="text-sm font-normal cursor-pointer">
              Any city
            </Label>
          </label>
          {departureCities.length === 0 && (
            <div className="text-xs text-muted-foreground px-1 py-1">No options</div>
          )}
          {departureCities.map((city) => (
            <label
              key={city}
              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
            >
              <RadioGroupItem value={city} id={`dep-${city}`} />
              <Label htmlFor={`dep-${city}`} className="text-sm font-normal cursor-pointer">
                {city}
              </Label>
            </label>
          ))}
        </RadioGroup>
      </FilterSection>

      <FilterSection label="Age Group" activeCount={values.ageGroups.length}>
        <div className="space-y-1">
          {AGE_GROUP_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={values.ageGroups.includes(opt.value)}
                onCheckedChange={() => toggleArray("ageGroups", opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Duration" activeCount={values.durations.length} last>
        <div className="space-y-1">
          {DURATION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={values.durations.includes(opt.value)}
                onCheckedChange={() => toggleArray("durations", opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </Card>
  );
}

function FilterSection({
  label,
  activeCount,
  children,
  last,
}: {
  label: string;
  activeCount: number;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn("px-4 py-3", !last && "border-b border-border/60")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {activeCount > 0 && (
          <Badge
            variant="secondary"
            className="h-4 min-w-4 px-1.5 text-[10px] font-medium bg-primary/15 text-primary border-0"
          >
            {activeCount}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted border border-border/60 max-w-full">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label={`Remove ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function CountriesPicker({
  countries,
  selected,
  onChange,
}: {
  countries: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.toLowerCase().includes(q));
  }, [countries, search]);
  const toggle = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter((s) => s !== name));
    else onChange([...selected, name]);
  };
  const buttonLabel =
    selected.length === 0
      ? "Select countries"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border border-border/60 hover:bg-muted/40 transition-colors"
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {buttonLabel}
          </span>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <SearchIcon className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2">
            {countries.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No countries with packages yet
              </div>
            )}
            {countries.length > 0 && filtered.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">No matches</div>
            )}
            {filtered.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
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
      </PopoverContent>
    </Popover>
  );
}

function CitiesPicker({
  cities,
  selected,
  onChange,
}: {
  cities: { id: string; name: string; country_name: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, search]);
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };
  const buttonLabel =
    selected.length === 0
      ? "Select cities"
      : selected.length === 1
        ? cities.find((c) => c.id === selected[0])?.name ?? "1 selected"
        : `${selected.length} selected`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border border-border/60 hover:bg-muted/40 transition-colors"
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {buttonLabel}
          </span>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <SearchIcon className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cities..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2">
            {cities.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No cities available
              </div>
            )}
            {cities.length > 0 && filtered.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">No matches</div>
            )}
            {filtered.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                />
                <span className="text-sm flex-1 truncate">{c.name}</span>
                <span className="text-[10px] text-muted-foreground">{c.country_name}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

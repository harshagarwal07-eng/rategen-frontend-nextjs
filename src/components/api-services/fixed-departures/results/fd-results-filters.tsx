"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fdGetSearchFilterOptions, fdGetCountries } from "@/data-access/fixed-departures";
import { FDMonthPicker } from "../search/fd-month-picker";

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
  countries: string[];
  cities: string[];
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
  const { data: countries = [] } = useQuery({
    queryKey: ["fd-meta-countries"],
    queryFn: fdGetCountries,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["fd-search-filter-options"],
    queryFn: fdGetSearchFilterOptions,
  });

  const allCities = filterOptions?.cities_with_packages ?? [];
  const departureCities = filterOptions?.departure_cities ?? [];

  const cityOptions = useMemo(() => {
    if (values.countries.length === 0) return allCities;
    const selectedCountryNames = countries
      .filter((c) => values.countries.includes(c.id))
      .map((c) => c.country_name);
    return allCities.filter((c) => selectedCountryNames.includes(c.country_name));
  }, [allCities, countries, values.countries]);

  const hasActive =
    values.countries.length +
      values.cities.length +
      values.months.length +
      values.ageGroups.length +
      values.durations.length >
      0 || values.departureCity !== "";

  const toggleArray = (key: keyof FDFilterValues, val: string) => {
    const arr = values[key] as string[];
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    onChange({ ...values, [key]: next });
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              onChange({
                countries: [],
                cities: [],
                months: [],
                departureCity: "",
                ageGroups: [],
                durations: [],
              })
            }
          >
            Clear all
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-[calc(100vh-12rem)]">
        <Accordion
          type="multiple"
          defaultValue={["countries", "cities", "months", "departure", "age", "duration"]}
          className="px-4"
        >
          <AccordionItem value="countries" className="border-b-0 border-t-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              Countries
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 pb-2">
                {countries.length === 0 && (
                  <div className="text-xs text-muted-foreground">No countries available</div>
                )}
                {countries.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={values.countries.includes(c.id)}
                      onCheckedChange={() => toggleArray("countries", c.id)}
                    />
                    <span className="text-sm">{c.country_name}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cities" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              Cities
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 pb-2 max-h-64 overflow-y-auto">
                {cityOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">No cities available</div>
                )}
                {cityOptions.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={values.cities.includes(c.id)}
                      onCheckedChange={() => toggleArray("cities", c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{c.country_name}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="months" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              Travel Months
            </AccordionTrigger>
            <AccordionContent>
              <div className="pb-2">
                <FDMonthPicker
                  selected={values.months}
                  onChange={(m) => onChange({ ...values, months: m })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="departure" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              Departure City
            </AccordionTrigger>
            <AccordionContent>
              <RadioGroup
                value={values.departureCity || "_any"}
                onValueChange={(v) =>
                  onChange({ ...values, departureCity: v === "_any" ? "" : v })
                }
                className="space-y-1.5 pb-2 max-h-64 overflow-y-auto"
              >
                <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="_any" id="dep-any" />
                  <Label htmlFor="dep-any" className="text-sm font-normal cursor-pointer">
                    Any city
                  </Label>
                </label>
                {departureCities.length === 0 && (
                  <div className="text-xs text-muted-foreground">No options</div>
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="age" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              Age Group
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 pb-2">
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="duration" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              Duration
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 pb-2">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </Card>
  );
}

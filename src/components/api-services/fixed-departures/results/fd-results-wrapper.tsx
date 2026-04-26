"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { ArrowUpDown, Check, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fdSearchPackages } from "@/data-access/fixed-departures";
import type { FDSortKey } from "@/types/fd-search";
import { FDSearchBar } from "../search/fd-search-bar";
import { FDResultCard } from "./fd-result-card";
import { FDResultsFilters, type FDFilterValues } from "./fd-results-filters";

const SORT_OPTIONS: { value: FDSortKey; label: string }[] = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "duration-asc", label: "Duration: Short to Long" },
  { value: "duration-desc", label: "Duration: Long to Short" },
  { value: "departure-asc", label: "Earliest Departure" },
];

const arrayParam = parseAsArrayOf(parseAsString, ",").withDefault([]);
const stringParam = parseAsString.withDefault("");

export function FDResultsWrapper() {
  const [params, setParams] = useQueryStates(
    {
      countries: arrayParam,
      cities: arrayParam,
      months: arrayParam,
      departureCity: stringParam,
      ageGroups: arrayParam,
      durations: arrayParam,
      sort: parseAsString.withDefault("price-asc"),
    },
    { history: "push" },
  );

  const filterValues: FDFilterValues = {
    countries: params.countries,
    cities: params.cities,
    months: params.months,
    departureCity: params.departureCity,
    ageGroups: params.ageGroups,
    durations: params.durations,
  };

  const sort = (params.sort || "price-asc") as FDSortKey;

  const queryArgs = useMemo(
    () => ({
      cities: params.cities.join(",") || undefined,
      months: params.months.join(",") || undefined,
      departureCity: params.departureCity || undefined,
      ageGroups: params.ageGroups.join(",") || undefined,
      durations: params.durations.join(",") || undefined,
      sort,
    }),
    [params, sort],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fd-search", queryArgs],
    queryFn: () => fdSearchPackages(queryArgs),
  });

  const packages = data?.packages ?? [];

  const detailHrefFor = (id: string) => {
    const sp = new URLSearchParams();
    sp.set("from", "results");
    if (params.countries.length) sp.set("countries", params.countries.join(","));
    if (params.cities.length) sp.set("cities", params.cities.join(","));
    if (params.months.length) sp.set("months", params.months.join(","));
    if (params.departureCity) sp.set("departureCity", params.departureCity);
    if (params.ageGroups.length) sp.set("ageGroups", params.ageGroups.join(","));
    if (params.durations.length) sp.set("durations", params.durations.join(","));
    if (params.sort) sp.set("sort", params.sort);
    return `/api-services/fixed-departures/package/${id}?${sp.toString()}`;
  };

  const handleFiltersChange = (next: FDFilterValues) => {
    setParams({
      countries: next.countries,
      cities: next.cities,
      months: next.months,
      departureCity: next.departureCity,
      ageGroups: next.ageGroups,
      durations: next.durations,
    });
  };

  return (
    <div className="w-full pr-8 space-y-4">
      <FDSearchBar
        initialCountries={params.countries}
        initialMonths={params.months}
        variant="compact"
      />

      <div className="flex gap-4">
        <aside className="w-72 sticky top-2 self-start shrink-0">
          <FDResultsFilters values={filterValues} onChange={handleFiltersChange} />
        </aside>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {isLoading ? "Searching..." : `${packages.length} packages`}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="bg-popover/50 text-foreground border">
                  <ArrowUpDown className="size-4" />
                  Sort: {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Default"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setParams({ sort: opt.value })}
                    disabled={sort === opt.value}
                  >
                    {opt.label}
                    {sort === opt.value && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-12 border border-dashed rounded-xl">
              <p className="text-sm text-destructive">Couldn&apos;t load packages. Try again.</p>
            </div>
          )}

          {!isLoading && !isError && packages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-border/60 rounded-xl bg-muted/20">
              <div className="rounded-full bg-muted p-4 mb-4">
                <SearchIcon className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No packages match your filters</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting the search.
              </p>
              <Link href="/api-services/fixed-departures/search">
                <Button variant="outline">Back to search</Button>
              </Link>
            </div>
          )}

          {!isLoading && !isError && packages.length > 0 && (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <FDResultCard key={pkg.id} pkg={pkg} detailHref={detailHrefFor(pkg.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

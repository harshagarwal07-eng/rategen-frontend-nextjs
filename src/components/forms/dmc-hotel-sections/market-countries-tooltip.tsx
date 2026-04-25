"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMarket, listCountries } from "@/data-access/dmc-markets";

const MAX_VISIBLE = 8;

function formatList(names: string[]): string {
  if (names.length <= MAX_VISIBLE) return names.join(", ");
  const head = names.slice(0, MAX_VISIBLE).join(", ");
  const remaining = names.length - MAX_VISIBLE;
  return `${head}, +${remaining} more`;
}

export function MarketCountriesTooltip({ marketId }: { marketId: string }) {
  // Lazy: only fetch market detail once the tooltip has been opened.
  const [hasOpened, setHasOpened] = useState(false);

  const marketQuery = useQuery({
    queryKey: ["market-detail", marketId],
    queryFn: () => getMarket(marketId),
    enabled: hasOpened,
    staleTime: 5 * 60 * 1000,
  });

  const countriesQuery = useQuery({
    queryKey: ["master-countries"],
    queryFn: () => listCountries(),
    enabled: hasOpened,
    staleTime: 30 * 60 * 1000,
  });

  const market = marketQuery.data?.data ?? null;
  const countries = countriesQuery.data?.data ?? [];
  const isLoading =
    hasOpened && (marketQuery.isLoading || countriesQuery.isLoading);

  const renderBody = () => {
    if (isLoading) return "Loading…";
    if (marketQuery.error || marketQuery.data?.error) return "Failed to load";
    if (!market) return "Loading…";

    const nameById = new Map(countries.map((c) => [c.id, c.name]));
    const toNames = (ids: string[]) =>
      ids.map((id) => nameById.get(id) ?? id).filter(Boolean);

    if (market.country_mode === "specific") {
      const names = toNames(market.included_country_ids);
      if (names.length === 0) return "No countries selected";
      return formatList(names);
    }

    // country_mode === 'all'
    const exceptions = toNames(market.excluded_country_ids);
    if (exceptions.length === 0) return "All Markets";
    return `All Markets except ${formatList(exceptions)}`;
  };

  return (
    <Tooltip
      delayDuration={200}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Show market countries"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {renderBody()}
      </TooltipContent>
    </Tooltip>
  );
}

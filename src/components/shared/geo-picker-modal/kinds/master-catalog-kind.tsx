"use client";

// Master-catalog kind content (attraction | activity). Fetches
// /api/tours/master-catalog scoped to the active country and the kind
// passed in, then renders a flat search-aware list. Click toggles
// selection; the wrapper modal owns chip rendering.

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { listMasterCatalog } from "@/data-access/tours-api";
import type { TourMasterCatalogItem } from "@/types/tours";
import type {
  GeoPickerKindContentProps,
  GeoSelection,
} from "../types";

// Per-country, per-kind cache. Modal is opened/closed often; refetching
// every open is wasteful when the data is static.
type CacheKey = `${string}:${string}`;
const cache = new Map<CacheKey, TourMasterCatalogItem[]>();

interface MasterCatalogKindProps extends GeoPickerKindContentProps {
  kind: "attraction" | "activity";
}

export function MasterCatalogKindContent({
  kind,
  activeCountryId,
  selections,
  onChange,
  search,
}: MasterCatalogKindProps) {
  const [items, setItems] = useState<TourMasterCatalogItem[] | null>(
    cache.get(`${kind}:${activeCountryId}`) ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = `${kind}:${activeCountryId}` as CacheKey;
    const cached = cache.get(key);
    if (cached) {
      setItems(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listMasterCatalog({ kind, country_id: activeCountryId })
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? [];
        cache.set(key, data);
        setItems(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, activeCountryId]);

  const selectedIds = useMemo(
    () => new Set(selections.filter((s) => s.kind === kind).map((s) => s.id)),
    [selections, kind],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function toggle(item: TourMasterCatalogItem) {
    if (selectedIds.has(item.id)) {
      onChange(
        selections.filter((s) => !(s.kind === kind && s.id === item.id)),
      );
      return;
    }
    const sel: GeoSelection = {
      kind,
      id: item.id,
      label: item.name,
      geo_id: item.geo_id ?? null,
    };
    onChange([...selections, sel]);
  }

  if (loading && (!items || items.length === 0)) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading {kind}s…
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No {kind}s for this country.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No {kind}s match &quot;{search}&quot;.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px]">
      <div className="flex flex-col">
        {filtered.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => toggle(item)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm text-left border-b last:border-b-0 transition-colors",
                isSelected ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border shrink-0",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              <span className="truncate flex-1">{item.name}</span>
              <Badge
                variant="secondary"
                className="text-[10px] capitalize shrink-0"
              >
                {kind}
              </Badge>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function AttractionKindContent(props: GeoPickerKindContentProps) {
  return <MasterCatalogKindContent {...props} kind="attraction" />;
}

export function ActivityKindContent(props: GeoPickerKindContentProps) {
  return <MasterCatalogKindContent {...props} kind="activity" />;
}

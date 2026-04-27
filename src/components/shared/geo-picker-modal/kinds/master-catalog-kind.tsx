"use client";

// "Tours" tab content. Pulls master_catalog rows for the active country
// with NO kind filter — both attractions and activities are mixed in
// one list, each row tagged with a Badge so the user can tell them
// apart. Selection still records the row's actual kind on the
// GeoSelection (`attraction` or `activity`) so downstream resolvers
// (e.g. tour primary_geo_id) can branch if they need to.

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

const cache = new Map<string, TourMasterCatalogItem[]>();

function rowKind(item: TourMasterCatalogItem): "attraction" | "activity" {
  // master_catalog.kind is text; treat anything that isn't 'activity' as
  // attraction so unknown values still render a chip kind.
  return item.kind === "activity" ? "activity" : "attraction";
}

export default function ToursKindContent({
  activeCountryId,
  selections,
  onChange,
  search,
}: GeoPickerKindContentProps) {
  const [items, setItems] = useState<TourMasterCatalogItem[] | null>(
    cache.get(activeCountryId) ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = cache.get(activeCountryId);
    if (cached) {
      setItems(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // No kind filter — backend returns both attractions and activities
    // for the country.
    listMasterCatalog({ country_id: activeCountryId })
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? [];
        cache.set(activeCountryId, data);
        setItems(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCountryId]);

  const selectedIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of selections) {
      if (s.kind === "attraction" || s.kind === "activity") set.add(s.id);
    }
    return set;
  }, [selections]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function toggle(item: TourMasterCatalogItem) {
    const k = rowKind(item);
    if (selectedIds.has(item.id)) {
      onChange(
        selections.filter(
          (s) =>
            !(
              (s.kind === "attraction" || s.kind === "activity") &&
              s.id === item.id
            ),
        ),
      );
      return;
    }
    const sel: GeoSelection = {
      kind: k,
      id: item.id,
      label: item.name,
      geo_id: item.geo_id ?? null,
    };
    onChange([...selections, sel]);
  }

  if (loading && (!items || items.length === 0)) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading tours…
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No tours for this country yet.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No tours match &quot;{search}&quot;.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px]">
      <div className="flex flex-col">
        {filtered.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const k = rowKind(item);
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
                {k}
              </Badge>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

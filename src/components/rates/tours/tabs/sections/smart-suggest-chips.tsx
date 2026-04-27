"use client";

// Smart Suggest — keyword-based attraction / activity matcher.
// Tokenises the package name, scores master_catalog entries by token
// matches, surfaces up to 5 chips above the master-catalog picker.
// Picking a chip updates local linkedMasters state (parent saves it
// on package Save & Continue, like the picker itself).

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  listMasterCatalog,
  searchMasterCatalog,
} from "@/data-access/tours-api";
import type { TourMasterCatalogItem } from "@/types/tours";

interface SmartSuggestChipsProps {
  packageName: string;
  countryId: string | null;
  /** When set, prefer suggestions whose geo_id matches this. */
  primaryGeoId?: string | null;
  selected: TourMasterCatalogItem[];
  maxSelections: number;
  onChange: (next: TourMasterCatalogItem[]) => void;
}

interface SmartSuggestion {
  item: TourMasterCatalogItem;
  matched_activities: string[];
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { data: SmartSuggestion[]; ts: number }>();

export default function SmartSuggestChips({
  packageName,
  countryId,
  primaryGeoId,
  selected,
  maxSelections,
  onChange,
}: SmartSuggestChipsProps) {
  const [allCatalog, setAllCatalog] = useState<TourMasterCatalogItem[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excludeIds = useMemo(
    () => new Set(selected.map((s) => s.id)),
    [selected],
  );

  // Load catalog scoped to the tour's country (top-level entries — the
  // chips don't need parent/child structure since we resolve activity →
  // parent venue via parent_id below).
  useEffect(() => {
    let cancelled = false;
    if (!countryId) {
      setAllCatalog([]);
      return;
    }
    listMasterCatalog({ country_id: countryId }).then((res) => {
      if (cancelled || res.error) return;
      setAllCatalog(res.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  useEffect(() => {
    const tokens = packageName
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    if (tokens.length === 0) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const cacheKey = `${[...tokens].sort().join("|")}:${countryId ?? ""}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setSuggestions(
          cached.data.filter((s) => !excludeIds.has(s.item.id)),
        );
        return;
      }

      // Match catalog names against ANY token (client-side).
      const venueById = new Map(
        allCatalog
          .filter((c) => c.kind === "attraction" || c.kind === "venue")
          .map((c) => [c.id, c]),
      );
      const itemMap = new Map<string, SmartSuggestion>();
      for (const entry of allCatalog) {
        const lower = entry.name.toLowerCase();
        if (tokens.some((t) => lower.includes(t))) {
          itemMap.set(entry.id, { item: entry, matched_activities: [] });
        }
      }

      // Activity search per token; merge by parent venue if available.
      const activityResults = await Promise.all(
        tokens.map((t) =>
          searchMasterCatalog(t, "activity", countryId).then(
            (r) => r.data ?? [],
          ),
        ),
      );
      const seen = new Set<string>();
      for (const list of activityResults) {
        for (const act of list) {
          if (seen.has(act.id)) continue;
          seen.add(act.id);
          if (act.parent_id) {
            const parent = venueById.get(act.parent_id);
            if (!parent) continue;
            const existing = itemMap.get(parent.id);
            if (existing) {
              if (!existing.matched_activities.includes(act.name)) {
                existing.matched_activities.push(act.name);
              }
            } else {
              itemMap.set(parent.id, {
                item: parent,
                matched_activities: [act.name],
              });
            }
          } else if (!itemMap.has(act.id)) {
            itemMap.set(act.id, { item: act, matched_activities: [] });
          }
        }
      }

      // Rank: more matching tokens first; then earliest token; then
      // tour-city locality; then alphabetical.
      const scored = Array.from(itemMap.values()).map((s) => {
        const hay = s.item.name.toLowerCase();
        let matchCount = 0;
        let firstMatchIdx = Number.POSITIVE_INFINITY;
        tokens.forEach((t, i) => {
          if (
            hay.includes(t) ||
            s.matched_activities.some((a) => a.toLowerCase().includes(t))
          ) {
            matchCount += 1;
            if (i < firstMatchIdx) firstMatchIdx = i;
          }
        });
        return { s, matchCount, firstMatchIdx };
      });

      scored.sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        if (a.firstMatchIdx !== b.firstMatchIdx)
          return a.firstMatchIdx - b.firstMatchIdx;
        if (primaryGeoId) {
          const aLocal = a.s.item.geo_id === primaryGeoId ? 0 : 1;
          const bLocal = b.s.item.geo_id === primaryGeoId ? 0 : 1;
          if (aLocal !== bLocal) return aLocal - bLocal;
        }
        return a.s.item.name.localeCompare(b.s.item.name);
      });

      const results = scored.slice(0, 5).map((x) => x.s);
      cache.set(cacheKey, { data: results, ts: Date.now() });
      setSuggestions(results.filter((s) => !excludeIds.has(s.item.id)));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [packageName, allCatalog, countryId, primaryGeoId, excludeIds]);

  if (suggestions.length === 0) return null;

  function pick(s: SmartSuggestion) {
    if (excludeIds.has(s.item.id)) return;
    if (maxSelections === 1) {
      onChange([s.item]);
    } else if (selected.length < maxSelections) {
      onChange([...selected, s.item]);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="h-3 w-3 text-amber-500" />
        <span className="text-xs text-muted-foreground">
          Suggested {maxSelections === 1 ? "match" : "matches"}:
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <Tooltip key={s.item.id}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-dashed border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                onClick={() => pick(s)}
              >
                <Plus className="h-3 w-3" />
                {s.item.name}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs max-w-[220px]">
                <p className="font-medium capitalize">{s.item.kind}</p>
                {s.matched_activities.length > 0 && (
                  <p className="text-muted-foreground mt-0.5">
                    Matched: {s.matched_activities.join(", ")}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

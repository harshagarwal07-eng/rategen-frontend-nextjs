"use client";

// Master-catalog picker. Search-driven; calls `searchMasterCatalog`.
// On pick, fires `onChange(catalog)` so the parent can drive the
// auto-fill orchestration of description / inclusions / age policies /
// operational hours from the master entry. We do NOT save catalog
// linkage here — Tab 2 saves package components on Save & Continue.

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchMasterCatalog,
  listMasterCatalog,
} from "@/data-access/tours-api";
import { TourMasterCatalogItem } from "@/types/tours";

interface MasterCatalogPickerProps {
  /** When `kind === undefined` we accept both venues and activities. */
  kind?: "venue" | "activity";
  /** Currently picked items (for badges + dropdown highlight). */
  selected: TourMasterCatalogItem[];
  /** Single-select picker if 1, multi otherwise. */
  maxSelections?: number;
  /** Pre-loaded full catalog (optional). When omitted we lazy load on focus. */
  initialCatalog?: TourMasterCatalogItem[];
  /** Filter results to a specific country (uuid). Optional. */
  countryId?: string | null;
  onChange: (next: TourMasterCatalogItem[]) => void;
}

export default function MasterCatalogPicker({
  kind,
  selected,
  maxSelections = 1,
  initialCatalog,
  countryId,
  onChange,
}: MasterCatalogPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TourMasterCatalogItem[]>(
    initialCatalog ?? [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.id)),
    [selected],
  );

  // Hydrate full catalog when dropdown first opens, if not preloaded.
  useEffect(() => {
    if (!isOpen) return;
    if (initialCatalog && initialCatalog.length > 0) return;
    if (search.trim().length > 0) return;
    let cancelled = false;
    listMasterCatalog({ kind, country_id: countryId ?? undefined }).then((res) => {
      if (cancelled || res.error) return;
      setResults(res.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialCatalog, kind, search, countryId]);

  // Close on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced server-side search.
  useEffect(() => {
    if (!isOpen) return;
    const q = search.trim();
    if (q.length === 0) return;
    const t = setTimeout(async () => {
      const res = await searchMasterCatalog(q, kind, countryId);
      if (res.error) return;
      setResults(res.data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [search, kind, isOpen, countryId]);

  const atMax = maxSelections > 0 && selected.length >= maxSelections;

  function pick(entry: TourMasterCatalogItem) {
    if (selectedIds.has(entry.id)) return;
    let next: TourMasterCatalogItem[];
    if (maxSelections === 1) {
      next = [entry];
    } else {
      if (atMax) return;
      next = [...selected, entry];
    }
    onChange(next);
    if (maxSelections === 1) setIsOpen(false);
  }

  function unpick(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  const filtered = useMemo(() => {
    if (search.trim().length === 0) return results;
    const q = search.toLowerCase();
    return results.filter((r) => r.name.toLowerCase().includes(q));
  }, [results, search]);

  return (
    <div ref={containerRef}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {maxSelections === 1
          ? "Linked Catalog Entry"
          : "Linked Catalog Entries"}
      </p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((entry) => (
            <Badge
              key={entry.id}
              variant="secondary"
              className="gap-1.5 text-xs py-1 px-2"
            >
              {entry.name}
              <span className="text-muted-foreground capitalize">
                ({entry.kind})
              </span>
              <button
                type="button"
                onClick={() => unpick(entry.id)}
                aria-label={`Remove ${entry.name}`}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          className="h-8 text-xs"
          placeholder={
            kind === "venue"
              ? "Search attractions…"
              : kind === "activity"
                ? "Search activities…"
                : "Search venues & activities…"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                No catalog entries.
              </p>
            ) : (
              filtered.map((entry) => {
                const isSelected = selectedIds.has(entry.id);
                const disabled = !isSelected && atMax;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      isSelected ? unpick(entry.id) : pick(entry)
                    }
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs flex items-center gap-2",
                      isSelected
                        ? "bg-accent"
                        : disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-accent/60",
                    )}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    )}
                    <span className="truncate">{entry.name}</span>
                    <span className="ml-auto text-muted-foreground capitalize">
                      {entry.kind}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

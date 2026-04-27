"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Hotel,
  MapPin,
  Plane,
  Search,
  Ship,
  TrainFront,
  TreePine,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Autocomplete } from "@/components/ui/autocomplete";
import { cn } from "@/lib/utils";
import { listCountries } from "@/data-access/geo-picker-api";
import type { TransferCountryOption } from "@/types/transfers";
import CityKindContent from "./kinds/city-kind";
import CustomPointKindContent from "./kinds/custom-point-kind";
import ToursKindContent from "./kinds/master-catalog-kind";
import {
  MASTER_DATA_COUNTRIES,
  type GeoPickerKind,
  type GeoSelection,
} from "./types";

export type { GeoSelection } from "./types";

// Module-scoped country list cache — populated on first modal open and
// reused across remounts.
const countriesCache = { value: null as TransferCountryOption[] | null };

// Kind registry. `requiresMasterData: true` gates the tab on the active
// country code being in MASTER_DATA_COUNTRIES; if the consumer didn't
// opt the kind in via `enabledKinds`, it stays disabled regardless. The
// shell builds the activation matrix at render time using `enabledKinds`
// and the active country.
type KindRegistryEntry = Omit<GeoPickerKind, "enabled"> & {
  requiresMasterData?: boolean;
};

const KINDS: KindRegistryEntry[] = [
  {
    id: "city",
    label: "City",
    Icon: Building2,
    Content: CityKindContent,
  },
  {
    id: "custom_point",
    label: "Custom Point",
    Icon: MapPin,
    Content: CustomPointKindContent,
  },
  {
    id: "hotel",
    label: "Hotel",
    Icon: Hotel,
    requiresMasterData: true,
    comingSoonHint: "Hotel pick coming soon — needs seeded master data",
  },
  {
    id: "airport",
    label: "Airport",
    Icon: Plane,
    requiresMasterData: true,
    comingSoonHint: "Airport pick coming soon — needs seeded master data",
  },
  {
    id: "station",
    label: "Station",
    Icon: TrainFront,
    requiresMasterData: true,
    comingSoonHint: "Station pick coming soon — needs seeded master data",
  },
  {
    id: "port",
    label: "Port",
    Icon: Ship,
    requiresMasterData: true,
    comingSoonHint: "Port pick coming soon — needs seeded master data",
  },
  {
    // "Tours" tab — single picker for both attractions and activities.
    // Each row in the list shows a kind Badge so users can tell them
    // apart even though they share a tab. Selection still records the
    // row's actual kind (attraction | activity) on the GeoSelection.
    id: "tours",
    label: "Tours",
    Icon: TreePine,
    requiresMasterData: true,
    comingSoonHint:
      "Tours pick available for UAE / Singapore / Bali / Mauritius",
    Content: ToursKindContent,
  },
];

// Default exposes city, custom point, and the master-data-gated Tours
// tab — every consumer (tours, transfers) gets country-based activation
// out of the box. Hotel/Airport/Station/Port stay opt-in and disabled
// for now (no master data yet).
const DEFAULT_ENABLED_KINDS: string[] = ["city", "custom_point", "tours"];

export interface GeoPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The transfer's primary country (from Tab 1). Used as the default
  // browse target inside the modal and to suppress the country prefix
  // in chips for same-country selections.
  countryId: string | null;
  fieldLabel: string;
  initialSelections: GeoSelection[];
  onApply: (next: GeoSelection[]) => void;
  /** Kinds the consumer wants exposed. Defaults to ['city', 'custom_point']
   *  to preserve existing transfers behavior. Tabs gated by master data
   *  (attraction/activity/hotel/etc.) are still disabled when the active
   *  country lacks data, even if listed here. */
  enabledKinds?: string[];
  /** When true, applying clears any previous selection and replaces it
   *  with the latest single click. Used by single-pick consumers like
   *  tour primary-location. */
  singleSelect?: boolean;
}

export default function GeoPickerModal({
  open,
  onOpenChange,
  countryId,
  fieldLabel,
  initialSelections,
  onApply,
  enabledKinds = DEFAULT_ENABLED_KINDS,
  singleSelect = false,
}: GeoPickerModalProps) {
  const [activeKindId, setActiveKindId] = useState<string>(KINDS[0].id);
  const [selections, setSelections] = useState<GeoSelection[]>(
    initialSelections,
  );
  const [search, setSearch] = useState("");
  const [activeCountryId, setActiveCountryId] = useState<string | null>(
    countryId,
  );
  const [countries, setCountries] = useState<TransferCountryOption[] | null>(
    countriesCache.value,
  );

  useEffect(() => {
    if (open) {
      setSelections(initialSelections);
      setSearch("");
      setActiveKindId(KINDS[0].id);
      setActiveCountryId(countryId);
    }
  }, [open, initialSelections, countryId]);

  useEffect(() => {
    if (countriesCache.value) return;
    let cancelled = false;
    listCountries().then((r) => {
      if (cancelled) return;
      const data = r.data ?? [];
      countriesCache.value = data;
      setCountries(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCountryCode = useMemo(() => {
    if (!activeCountryId || !countries) return null;
    return countries.find((c) => c.id === activeCountryId)?.country_code ?? null;
  }, [activeCountryId, countries]);

  // Build per-kind enabled flag from registry + consumer's enabledKinds
  // + master-data gating.
  const enabledKindSet = useMemo(
    () => new Set(enabledKinds),
    [enabledKinds],
  );
  const kindList = useMemo<GeoPickerKind[]>(
    () =>
      KINDS.map((k) => {
        const consumerOptIn = enabledKindSet.has(k.id);
        const dataAvailable =
          !k.requiresMasterData ||
          (activeCountryCode !== null &&
            (MASTER_DATA_COUNTRIES as readonly string[]).includes(
              activeCountryCode,
            ));
        return {
          id: k.id,
          label: k.label,
          Icon: k.Icon,
          comingSoonHint: k.comingSoonHint,
          Content: k.Content,
          enabled: consumerOptIn && dataAvailable && !!k.Content,
        };
      }),
    [enabledKindSet, activeCountryCode],
  );

  const activeKind = useMemo(
    () => kindList.find((k) => k.id === activeKindId) ?? kindList[0],
    [activeKindId, kindList],
  );

  // If the current tab is disabled (e.g. user changed country and the
  // master-data tab no longer applies), shift to the first enabled tab.
  useEffect(() => {
    const current = kindList.find((k) => k.id === activeKindId);
    if (current && !current.enabled) {
      const firstEnabled = kindList.find((k) => k.enabled);
      if (firstEnabled) setActiveKindId(firstEnabled.id);
    }
  }, [kindList, activeKindId]);

  const countryOptions = useMemo(
    () =>
      (countries ?? []).map((c) => ({
        label: c.country_name,
        value: c.id,
        code: c.country_code,
      })),
    [countries],
  );

  function removeSelection(s: GeoSelection) {
    setSelections((prev) =>
      prev.filter((p) => !(p.kind === s.kind && p.id === s.id)),
    );
  }

  function chipKey(s: GeoSelection) {
    return `${s.kind}:${s.id}`;
  }

  function chipText(s: GeoSelection): string {
    const base = s.label ?? s.id;
    // Suppress country prefix for selections from the transfer's primary
    // country to keep chips short. Always include it for cross-country.
    if (s.country_name && s.country_id && s.country_id !== countryId) {
      return `${s.country_name} › ${base}`;
    }
    return base;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header — country selector + search + close */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <div className="w-56 shrink-0">
            <Autocomplete
              options={countryOptions}
              value={activeCountryId ?? ""}
              onChange={(v) => setActiveCountryId(v || null)}
              placeholder={
                countries === null ? "Loading countries…" : "Select country…"
              }
              searchPlaceholder="Search countries…"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeKind.id === "city"
                  ? "Search cities, zones, areas…"
                  : activeKind.id === "custom_point"
                    ? "Search custom locations…"
                    : "Search…"
              }
              className="pl-8 h-9"
            />
          </div>
          <DialogTitle className="sr-only">
            Pick {fieldLabel.toLowerCase()}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Kind tabs */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b bg-muted/30">
          {kindList.map((k) => {
            const isActive = k.id === activeKindId;
            const Icon = k.Icon;
            return (
              <button
                type="button"
                key={k.id}
                onClick={() => k.enabled && setActiveKindId(k.id)}
                disabled={!k.enabled}
                title={k.enabled ? undefined : k.comingSoonHint}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors",
                  k.enabled
                    ? isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input"
                    : "bg-muted text-muted-foreground border-input opacity-60 cursor-not-allowed",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{k.label}</span>
                {!k.enabled && (
                  <span className="text-[9px] uppercase tracking-wide ml-0.5 opacity-70">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active kind content */}
        <div className="px-4 py-3">
          {!activeCountryId ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Pick a country above to start browsing.
            </div>
          ) : activeKind.Content ? (
            <activeKind.Content
              activeCountryId={activeCountryId}
              selections={selections}
              onChange={(next) => {
                // Single-select: keep only the most recently added entry
                // so only one chip ever shows.
                if (singleSelect && next.length > 1) {
                  setSelections([next[next.length - 1]]);
                  return;
                }
                setSelections(next);
              }}
              search={search}
            />
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {activeKind.comingSoonHint ?? "Coming soon"}
            </div>
          )}
        </div>

        {/* Selected chips + actions */}
        <div className="border-t px-4 py-3 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1.5">
                Selected ({selections.length})
              </div>
              {selections.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  Nothing selected yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                  {selections.map((s) => (
                    <Badge
                      key={chipKey(s)}
                      variant="secondary"
                      className="gap-1 pr-1 max-w-full"
                    >
                      <span className="truncate">{chipText(s)}</span>
                      {s.kind === "dmc_custom" && (
                        <span className="text-[9px] uppercase tracking-wide opacity-70">
                          custom
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSelection(s)}
                        className="ml-0.5 rounded hover:bg-destructive/10 hover:text-destructive p-0.5"
                        aria-label={`Remove ${chipText(s)}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onApply(selections);
                  onOpenChange(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

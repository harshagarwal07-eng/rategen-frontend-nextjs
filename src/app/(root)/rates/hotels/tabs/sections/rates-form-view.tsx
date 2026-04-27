"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FDCard } from "@/components/ui/fd-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AgePolicyBand, ContractRoom, ContractTax } from "@/types/contract-tab2";
import type { ContractSeasonRow } from "@/types/contract-tab2";
import type { MealPlan } from "@/types/contract-rates";
import { RateFormFields } from "./rate-form-fields";
import {
  bySortOrder,
  emptyRate,
  fmtRange,
  isRated,
  rateRowSummary,
  type LocalRate,
} from "./rates-shared";

interface RatesFormViewProps {
  rooms: ContractRoom[];
  seasons: ContractSeasonRow[];
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  rates: LocalRate[];
  setRates: React.Dispatch<React.SetStateAction<LocalRate[]>>;
  disabled?: boolean;
}

export function RatesFormView({
  rooms,
  seasons,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  rates,
  setRates,
  disabled,
}: RatesFormViewProps) {
  const defaultMealPlan = useMemo(
    () => mealPlans.find((mp) => mp.code === "BB") ?? mealPlans[0] ?? null,
    [mealPlans]
  );

  // Defensive ordering — bySortOrder is also applied at the parent's load
  // step, but we re-sort here so this view doesn't rely on caller order.
  const orderedRooms = useMemo(() => bySortOrder(rooms), [rooms]);
  const orderedSeasons = useMemo(() => bySortOrder(seasons), [seasons]);

  // Locate (or seed) the LocalRate for a given (room, season). Seeding
  // doesn't push to state — it returns a transient empty rate that the
  // user has to actually edit before it gets persisted on Save All.
  function getOrSeedRate(room: ContractRoom, seasonId: string): LocalRate {
    const existing = rates.find(
      (r) => r.room_category_id === room.id && r.season_id === seasonId
    );
    if (existing) return existing;
    return emptyRate(room, seasonId, agePolicies, defaultMealPlan);
  }

  // Upsert a rate into state — if it has no _localId match we add it,
  // otherwise we replace.
  function upsertRate(next: LocalRate) {
    setRates((prev) => {
      const idx = prev.findIndex((r) => r._localId === next._localId);
      if (idx >= 0) {
        const out = [...prev];
        out[idx] = next;
        return out;
      }
      return [...prev, next];
    });
  }

  if (orderedRooms.length === 0 || orderedSeasons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <p className="text-sm">
          {orderedRooms.length === 0
            ? "No rooms on this contract — add them on the Rooms & Seasons tab first."
            : "No seasons on this contract — add them on the Rooms & Seasons tab first."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderedRooms.map((room) => (
        <RoomCard
          key={room.id ?? room.name}
          room={room}
          seasons={orderedSeasons}
          rates={rates}
          mealPlans={mealPlans}
          agePolicies={agePolicies}
          contractTaxes={contractTaxes}
          contractRateBasis={contractRateBasis}
          getOrSeedRate={getOrSeedRate}
          upsertRate={upsertRate}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// ─── Room card ───────────────────────────────────────────────────────────

interface RoomCardProps {
  room: ContractRoom;
  seasons: ContractSeasonRow[];
  rates: LocalRate[];
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  getOrSeedRate: (room: ContractRoom, seasonId: string) => LocalRate;
  upsertRate: (next: LocalRate) => void;
  disabled?: boolean;
}

function RoomCard({
  room,
  seasons,
  rates,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  getOrSeedRate,
  upsertRate,
  disabled,
}: RoomCardProps) {
  // How many seasons are rated for this room.
  const seasonsRated = useMemo(() => {
    let n = 0;
    for (const s of seasons) {
      const r = rates.find(
        (rr) => rr.room_category_id === room.id && rr.season_id === s.id
      );
      if (r && isRated(r, contractRateBasis)) n++;
    }
    return n;
  }, [seasons, rates, room.id, contractRateBasis]);

  // Representative rate: walk seasons in display order, return the first
  // season's rate value. PRPN → room_rate, PPPN → double_rate.
  const representativeRate = useMemo<number | null>(() => {
    for (const s of seasons) {
      const r = rates.find(
        (rr) => rr.room_category_id === room.id && rr.season_id === s.id
      );
      if (!r) continue;
      const v =
        room.rate_type === "PPPN" ? r.double_rate : r.room_rate;
      if (v != null) return v;
    }
    return null;
  }, [seasons, rates, room.id, room.rate_type]);

  const pillClass =
    room.rate_type === "PPPN" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";

  const compClass =
    seasonsRated === 0
      ? "bg-red-100 text-red-700"
      : seasonsRated === seasons.length
        ? "bg-green-100 text-green-700"
        : "bg-amber-100 text-amber-700";

  const title = (
    <span className="flex items-center gap-2 min-w-0">
      <span className="truncate">{room.name || "(unnamed room)"}</span>
      <Badge variant="secondary" className={cn("text-[10px] shrink-0", pillClass)}>
        {room.rate_type === "PPPN" ? "PPPN" : "PRPN"}
      </Badge>
      {representativeRate != null ? (
        <Badge
          variant="secondary"
          className="text-[10px] shrink-0 bg-green-100 text-green-700"
        >
          ${representativeRate.toLocaleString()}
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className="text-[10px] shrink-0 bg-muted text-muted-foreground"
        >
          —
        </Badge>
      )}
      {(room.max_total_occupancy ?? 0) > 0 && (
        <span className="text-[11px] font-normal text-muted-foreground shrink-0">
          Max {room.max_total_occupancy} pax
        </span>
      )}
      <Badge
        variant="secondary"
        className={cn("text-[10px] shrink-0", compClass)}
      >
        {seasonsRated}/{seasons.length} seasons rated
      </Badge>
    </span>
  );

  return (
    <FDCard title={title} defaultOpen>
      <div className="flex flex-col gap-2">
        {seasons.map((season) => (
          <SeasonRow
            key={season.id}
            room={room}
            season={season}
            allSeasons={seasons}
            rates={rates}
            mealPlans={mealPlans}
            agePolicies={agePolicies}
            contractTaxes={contractTaxes}
            contractRateBasis={contractRateBasis}
            getOrSeedRate={getOrSeedRate}
            upsertRate={upsertRate}
            disabled={disabled}
          />
        ))}
      </div>
    </FDCard>
  );
}

// ─── Season row ──────────────────────────────────────────────────────────

interface SeasonRowProps {
  room: ContractRoom;
  season: ContractSeasonRow;
  allSeasons: ContractSeasonRow[];
  rates: LocalRate[];
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  getOrSeedRate: (room: ContractRoom, seasonId: string) => LocalRate;
  upsertRate: (next: LocalRate) => void;
  disabled?: boolean;
}

function SeasonRow({
  room,
  season,
  allSeasons,
  rates,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  getOrSeedRate,
  upsertRate,
  disabled,
}: SeasonRowProps) {
  const [open, setOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  // Lazy-seeded local copy for editing. We don't push to parent state until
  // the user actually mutates a field — but the editor is a controlled form
  // so the simplest way is: memoize the seeded version and replace on every
  // change.
  const rate = useMemo(
    () => getOrSeedRate(room, season.id),
    [getOrSeedRate, room, season.id]
  );

  const summary = rateRowSummary(rate, contractRateBasis);
  const rated = isRated(rate, contractRateBasis);

  function handleCopyFrom(sourceSeasonId: string) {
    setCopyOpen(false);
    const source = rates.find(
      (r) => r.room_category_id === room.id && r.season_id === sourceSeasonId
    );
    if (!source) return;
    upsertRate({
      ...rate,
      meal_plan: source.meal_plan,
      meal_plan_id: source.meal_plan_id,
      room_rate: source.room_rate,
      single_rate: source.single_rate,
      double_rate: source.double_rate,
      triple_rate: source.triple_rate,
      quad_rate: source.quad_rate,
      extra_adult_supplement: source.extra_adult_supplement,
      extra_adult_supplement_type: source.extra_adult_supplement_type,
      bar_rate: source.bar_rate,
      commission_percentage: source.commission_percentage,
      valid_days: [...source.valid_days],
      // Map child pricing across by age_policy_id (same contract → same ids).
      age_pricing: rate.age_pricing.map((c) => {
        const src = source.age_pricing.find(
          (s) => s.age_policy_id === c.age_policy_id
        );
        if (!src) return c;
        return {
          ...c,
          is_free: src.is_free,
          max_free_count: src.max_free_count,
          without_bed_price: src.without_bed_price,
          without_bed_price_type: src.without_bed_price_type,
          with_bed_price: src.with_bed_price,
          with_bed_price_type: src.with_bed_price_type,
        };
      }),
    });
    setOpen(true);
  }

  // Other seasons in the same room that already have a (potentially user-
  // edited or persisted) rate to copy from.
  const sourceableSeasons = allSeasons.filter((s) => {
    if (s.id === season.id) return false;
    return rates.some(
      (r) => r.room_category_id === room.id && r.season_id === s.id
    );
  });

  return (
    <div className="rounded-md border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{season.name}</span>
          {(season.season_date_ranges ?? []).length > 0 && (
            <span className="text-xs text-muted-foreground truncate">
              {fmtRange(season.season_date_ranges![0])}
              {(season.season_date_ranges?.length ?? 0) > 1 && (
                <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">
                  +{(season.season_date_ranges?.length ?? 1) - 1}
                </span>
              )}
            </span>
          )}
          {rated ? (
            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 shrink-0">
              {summary ?? "Set"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 shrink-0">
              Not set
            </Badge>
          )}
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {sourceableSeasons.length > 0 && (
            <Popover open={copyOpen} onOpenChange={setCopyOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  disabled={disabled}
                >
                  <Copy className="h-3 w-3" /> Copy from
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">
                  Copy rate from…
                </div>
                {sourceableSeasons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => handleCopyFrom(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t px-3 pb-3 pt-3">
          <RateFormFields
            room={room}
            rate={rate}
            onChange={(next) => upsertRate(next)}
            mealPlans={mealPlans}
            agePolicies={agePolicies}
            contractTaxes={contractTaxes}
            contractRateBasis={contractRateBasis}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}


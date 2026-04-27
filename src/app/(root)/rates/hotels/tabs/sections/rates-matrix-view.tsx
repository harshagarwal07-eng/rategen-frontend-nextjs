"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AgePolicyBand, ContractRoom, ContractTax } from "@/types/contract-tab2";
import type { ContractSeasonRow } from "@/types/contract-tab2";
import type { MealPlan } from "@/types/contract-rates";
import { RateDrawer } from "./rate-drawer";
import {
  ageBandLabel,
  fmtDay,
  formatDaysLabel,
  formatTaxesSummary,
  isRated,
  rateCellValue,
  taxesForRoom,
  type LocalRate,
} from "./rates-shared";

interface RatesMatrixViewProps {
  rooms: ContractRoom[];
  seasons: ContractSeasonRow[];
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  rates: LocalRate[];
  // Persists a single edited rate (sends full contract payload, backend diffs).
  onPersistOne: (next: LocalRate) => Promise<boolean>;
  disabled?: boolean;
}

export function RatesMatrixView({
  rooms,
  seasons,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  rates,
  onPersistOne,
  disabled,
}: RatesMatrixViewProps) {
  const [drawerRoom, setDrawerRoom] = useState<ContractRoom | null>(null);
  const [drawerSeason, setDrawerSeason] = useState<ContractSeasonRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => {
      const af = a.season_date_ranges?.[0]?.date_from ?? "";
      const bf = b.season_date_ranges?.[0]?.date_from ?? "";
      return af.localeCompare(bf);
    });
  }, [seasons]);

  const rateMap = useMemo(() => {
    const map = new Map<string, LocalRate>();
    for (const r of rates) map.set(`${r.room_category_id}-${r.season_id}`, r);
    return map;
  }, [rates]);

  // Completion stats — only counts cells where a rate exists AND has a value.
  const totalCells = rooms.length * sortedSeasons.length;
  const filledCells = useMemo(() => {
    let n = 0;
    for (const room of rooms) {
      for (const s of sortedSeasons) {
        const r = rateMap.get(`${room.id}-${s.id}`);
        if (r && isRated(r, contractRateBasis)) n++;
      }
    }
    return n;
  }, [rooms, sortedSeasons, rateMap, contractRateBasis]);
  const compPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
  const compClass =
    compPct === 100
      ? "bg-green-100 text-green-700"
      : compPct >= 50
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  const drawerRate =
    drawerRoom && drawerSeason
      ? rateMap.get(`${drawerRoom.id}-${drawerSeason.id}`) ?? null
      : null;

  if (rooms.length === 0 || sortedSeasons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <p className="text-sm">
          {rooms.length === 0
            ? "No rooms on this contract — add them on the Rooms & Seasons tab first."
            : "No seasons on this contract — add them on the Rooms & Seasons tab first."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Badge variant="secondary" className={cn("text-sm px-3 py-1", compClass)}>
          {filledCells}/{totalCells} rates complete ({compPct}%)
        </Badge>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 220 }} />
            {sortedSeasons.map((s) => (
              <col key={s.id} style={{ minWidth: 130 }} />
            ))}
            <col style={{ minWidth: 110 }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 border-b border-r px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Room
              </th>
              {sortedSeasons.map((season) => (
                <th
                  key={season.id}
                  className="border-b border-r px-3 py-2 text-center"
                >
                  <div
                    className="text-xs font-semibold truncate"
                    title={season.name}
                  >
                    {season.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {(season.season_date_ranges ?? []).length > 0
                      ? `${fmtDay(season.season_date_ranges![0].date_from)} – ${fmtDay(season.season_date_ranges![0].date_to)}`
                      : ""}
                  </div>
                </th>
              ))}
              <th className="border-b px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Completion
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const roomRated = sortedSeasons.filter((s) => {
                const r = rateMap.get(`${room.id}-${s.id}`);
                return r && isRated(r, contractRateBasis);
              }).length;
              return (
                <tr key={room.id ?? room.name}>
                  <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-sm font-medium truncate"
                        title={room.name}
                      >
                        {room.name || "(unnamed)"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] shrink-0",
                          room.rate_type === "PPPN"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        )}
                      >
                        {room.rate_type === "PPPN" ? "PPPN" : "PRPN"}
                      </Badge>
                    </div>
                  </td>
                  {sortedSeasons.map((season) => {
                    const r = rateMap.get(`${room.id}-${season.id}`);
                    const rated = !!r && isRated(r, contractRateBasis);
                    const value = r ? rateCellValue(r, contractRateBasis) : null;
                    return (
                      <td
                        key={season.id}
                        onClick={() => {
                          if (disabled) return;
                          setDrawerRoom(room);
                          setDrawerSeason(season);
                          setDrawerOpen(true);
                        }}
                        className={cn(
                          "border-b border-r px-3 py-2 text-center transition-colors",
                          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                          rated
                            ? "bg-green-50 hover:bg-green-100/70"
                            : "bg-red-50/40 hover:bg-red-50"
                        )}
                      >
                        {rated && value != null ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-semibold">
                                ${value.toLocaleString()}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[300px] p-3"
                            >
                              <CellTooltip
                                rate={r!}
                                room={room}
                                contractTaxes={contractTaxes}
                                mealPlans={mealPlans}
                                agePolicies={agePolicies}
                                contractRateBasis={contractRateBasis}
                              />
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-sm text-red-400">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b px-3 py-2 text-center">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        roomRated === sortedSeasons.length
                          ? "bg-green-100 text-green-700"
                          : roomRated === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {roomRated}/{sortedSeasons.length}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="sticky left-0 z-10 bg-muted/30 border-r px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Completion
              </td>
              {sortedSeasons.map((season) => {
                const seasonRated = rooms.filter((room) => {
                  const r = rateMap.get(`${room.id}-${season.id}`);
                  return r && isRated(r, contractRateBasis);
                }).length;
                return (
                  <td
                    key={season.id}
                    className="border-r px-3 py-2 text-center"
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        seasonRated === rooms.length
                          ? "bg-green-100 text-green-700"
                          : seasonRated === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {seasonRated}/{rooms.length}
                    </Badge>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", compClass)}
                >
                  {compPct}%
                </Badge>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <RateDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) {
            setDrawerRoom(null);
            setDrawerSeason(null);
          }
        }}
        room={drawerRoom}
        season={drawerSeason}
        existingRate={drawerRate}
        mealPlans={mealPlans}
        agePolicies={agePolicies}
        contractTaxes={contractTaxes}
        contractRateBasis={contractRateBasis}
        onSave={onPersistOne}
        disabled={disabled}
      />
    </div>
  );
}

function CellTooltip({
  rate,
  room,
  contractTaxes,
  mealPlans,
  agePolicies,
  contractRateBasis,
}: {
  rate: LocalRate;
  room: ContractRoom;
  contractTaxes: ContractTax[];
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractRateBasis: "net" | "bar";
}) {
  const cellValue = rateCellValue(rate, contractRateBasis);
  const mealLabel =
    mealPlans.find((m) => m.id === rate.meal_plan_id)?.name ??
    rate.meal_plan ??
    "—";

  const filteredTaxes = taxesForRoom(contractTaxes, room.id ?? "");

  const childSummary = rate.age_pricing
    .map((c) => {
      const band = agePolicies.find((b) => b.id === c.age_policy_id);
      const label = band ? ageBandLabel(band) : "Child";
      if (c.is_free) return `${label}: Free`;
      const wb = c.with_bed_price != null ? `$${c.with_bed_price}` : "—";
      const wob = c.without_bed_price != null ? `$${c.without_bed_price}` : "—";
      return `${label}: w/bed ${wb}, w/o bed ${wob}`;
    })
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="space-y-1 text-xs">
      {cellValue != null && (
        <div className="text-base font-bold">${cellValue.toLocaleString()}</div>
      )}
      <div>
        <span className="text-muted-foreground/80">Meal:</span> {mealLabel}
      </div>
      <div>
        <span className="text-muted-foreground/80">Days:</span>{" "}
        {formatDaysLabel(rate.valid_days)}
      </div>
      {rate.extra_adult_supplement != null && (
        <div>
          <span className="text-muted-foreground/80">Extra adult:</span>{" "}
          {rate.extra_adult_supplement_type === "percentage"
            ? `${rate.extra_adult_supplement}%`
            : `$${rate.extra_adult_supplement}`}
        </div>
      )}
      <div>
        <span className="text-muted-foreground/80">Status:</span>{" "}
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            rate.status === "active"
              ? "bg-green-200/70 text-green-900"
              : "bg-muted text-muted-foreground"
          )}
        >
          {rate.status}
        </span>
      </div>
      {filteredTaxes.length > 0 && (
        <div className="pt-1 border-t border-foreground/10">
          <span className="text-muted-foreground/80">Taxes:</span>{" "}
          {formatTaxesSummary(filteredTaxes)}
        </div>
      )}
      {childSummary && (
        <div className="pt-1 border-t border-foreground/10">
          <span className="text-muted-foreground/80">Child:</span> {childSummary}
        </div>
      )}
    </div>
  );
}

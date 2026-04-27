"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgePolicyBand, ContractRoom, ContractTax } from "@/types/contract-tab2";
import type { ContractSeasonRow } from "@/types/contract-tab2";
import type { MealPlan } from "@/types/contract-rates";
import { RateDrawer } from "./rate-drawer";
import { bySortOrder, rateCellValue, type LocalRate } from "./rates-shared";

const SEASON_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0d9488",
  "#b45309",
  "#be185d",
  "#1d4ed8",
  "#15803d",
];

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function fmtIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const result: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    result.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface RatesCalendarViewProps {
  rooms: ContractRoom[];
  seasons: ContractSeasonRow[];
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  rates: LocalRate[];
  onPersistOne: (next: LocalRate) => Promise<boolean>;
  disabled?: boolean;
}

export function RatesCalendarView({
  rooms,
  seasons,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  rates,
  onPersistOne,
  disabled,
}: RatesCalendarViewProps) {
  const [drawerRoom, setDrawerRoom] = useState<ContractRoom | null>(null);
  const [drawerSeason, setDrawerSeason] = useState<ContractSeasonRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  const todayStr = useMemo(() => fmtIso(new Date()), []);

  const sortedSeasons = useMemo(() => bySortOrder(seasons), [seasons]);
  const sortedRooms = useMemo(() => bySortOrder(rooms), [rooms]);

  const seasonColor = useMemo(() => {
    const map = new Map<string, string>();
    sortedSeasons.forEach((s, i) => {
      map.set(s.id, SEASON_COLORS[i % SEASON_COLORS.length]);
    });
    return map;
  }, [sortedSeasons]);

  const dateToSeason = useMemo(() => {
    const map = new Map<string, ContractSeasonRow>();
    for (const s of seasons) {
      for (const r of s.season_date_ranges ?? []) {
        const start = new Date(r.date_from + "T12:00:00");
        const end = new Date(r.date_to + "T12:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          map.set(fmtIso(d), s);
        }
      }
    }
    return map;
  }, [seasons]);

  const rateMap = useMemo(() => {
    const map = new Map<string, LocalRate>();
    for (const r of rates) map.set(`${r.room_category_id}-${r.season_id}`, r);
    return map;
  }, [rates]);

  const drawerRate =
    drawerRoom && drawerSeason
      ? rateMap.get(`${drawerRoom.id}-${drawerSeason.id}`) ?? null
      : null;

  if (sortedRooms.length === 0 || sortedSeasons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <p className="text-sm">
          {sortedRooms.length === 0
            ? "No rooms on this contract — add them on the Rooms & Seasons tab first."
            : "No seasons on this contract — add them on the Rooms & Seasons tab first."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Year nav (centered) */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setYear((y) => y - 1)}
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[80px] text-center text-base font-semibold">
          {year}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setYear((y) => y + 1)}
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {sortedSeasons.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-0.5"
            title={s.name}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: seasonColor.get(s.id) }}
            />
            <span className="text-[11px] text-foreground/80">
              {s.name.length > 24 ? s.name.slice(0, 24) + "…" : s.name}
            </span>
          </div>
        ))}
      </div>

      {/* 12 stacked month blocks. Sticky room column is per-month — cross-
          month sticky would require one giant 365-column table or synced
          horizontal scroll across 12 tables; both add significant complexity
          for marginal benefit, so we keep sticky scope per-month. */}
      <div className="space-y-6">
        {MONTHS.map((m) => (
          <MonthBlock
            key={m}
            year={year}
            month={m}
            sortedRooms={sortedRooms}
            dateToSeason={dateToSeason}
            seasonColor={seasonColor}
            rateMap={rateMap}
            contractRateBasis={contractRateBasis}
            todayStr={todayStr}
            disabled={disabled}
            onCellClick={(room, season) => {
              setDrawerRoom(room);
              setDrawerSeason(season);
              setDrawerOpen(true);
            }}
          />
        ))}
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

function MonthBlock({
  year,
  month,
  sortedRooms,
  dateToSeason,
  seasonColor,
  rateMap,
  contractRateBasis,
  todayStr,
  disabled,
  onCellClick,
}: {
  year: number;
  month: number;
  sortedRooms: ContractRoom[];
  dateToSeason: Map<string, ContractSeasonRow>;
  seasonColor: Map<string, string>;
  rateMap: Map<string, LocalRate>;
  contractRateBasis: "net" | "bar";
  todayStr: string;
  disabled?: boolean;
  onCellClick: (room: ContractRoom, season: ContractSeasonRow) => void;
}) {
  const dates = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-foreground/90 px-1">
        {monthLabel}
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table
          className="border-collapse"
          style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}
        >
          <colgroup>
            <col style={{ width: 200, minWidth: 140 }} />
            {dates.map((_, i) => (
              <col key={i} style={{ width: 44 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-background border-r-2 border-b-2 px-2 py-1.5 text-left text-xs font-semibold">
                Room
              </th>
              {dates.map((d) => {
                const dateStr = fmtIso(d);
                const isToday = dateStr === todayStr;
                const dow = (d.getDay() + 6) % 7;
                return (
                  <th
                    key={dateStr}
                    className="bg-background border-b-2 border-r px-0 py-1 text-center"
                  >
                    <div
                      className={cn(
                        "text-[12px] font-semibold leading-none",
                        isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {d.getDate()}
                    </div>
                    <div
                      className={cn(
                        "text-[10px] mt-0.5",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {DAY_LETTERS[dow]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRooms.map((room) => (
              <tr key={room.id ?? room.name}>
                <td
                  className="sticky left-0 z-10 bg-background border-r-2 border-b px-2 py-1.5 text-sm font-medium truncate"
                  title={room.name}
                >
                  {room.name || "(unnamed)"}
                </td>
                {dates.map((d) => {
                  const dateStr = fmtIso(d);
                  const season = dateToSeason.get(dateStr);
                  const rate = season
                    ? rateMap.get(`${room.id}-${season.id}`)
                    : undefined;
                  const value = rate
                    ? rateCellValue(rate, contractRateBasis)
                    : null;
                  const color = season ? seasonColor.get(season.id) : undefined;
                  const bg = color ? hexToRgba(color, 0.15) : undefined;
                  const isToday = dateStr === todayStr;
                  const clickable = !!season && !disabled;
                  return (
                    <td
                      key={dateStr}
                      onClick={() => {
                        if (!clickable || !season) return;
                        onCellClick(room, season);
                      }}
                      className={cn(
                        "border-b border-r text-center align-middle",
                        clickable
                          ? "cursor-pointer hover:brightness-95"
                          : "cursor-default"
                      )}
                      style={{
                        height: 44,
                        background: bg,
                        outline: isToday ? "2px solid #16a34a" : undefined,
                        outlineOffset: -2,
                      }}
                    >
                      <span
                        className={cn(
                          "text-[12px]",
                          value != null
                            ? "font-bold text-foreground"
                            : "text-foreground/40"
                        )}
                      >
                        {value != null ? value : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

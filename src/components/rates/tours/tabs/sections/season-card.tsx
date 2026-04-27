"use client";

// Per-season card for tour packages.
//
// Each season picks ONE rate type via the top-of-card toggle:
//   per_pax → Band rates (Ticket/Shared) OR Pvt Per Pax + Discounts (Private/Exclusive)
//   vehicle → Vehicle rates + Discounts (Private/Exclusive only)
//   total   → Single Total Rate (rate + max capacity)
//
// Switching modes hides the inactive editors but keeps their UI state
// until save; on save, the parent clears the inactive shapes server-side.
// Age bands are sourced from the package (Tab 2 owns the canonical set).

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarOff,
  CalendarPlus,
  ChevronDown,
  Copy,
  Send,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addYears, endOfYear, format, isValid, parse, startOfYear } from "date-fns";
import {
  DateRangePicker,
  type DateRangePreset,
} from "@/components/ui/date-range-picker";
import { DatePicker } from "@/components/ui/date-picker";
import {
  TourAgePolicyBand,
  TourPackageSalesMode,
  TourPrivateRateMode,
  TourSeasonRateType,
  TourVehicleRateType,
} from "@/types/tours";
import {
  BandRatesSection,
  PrivateRatesSection,
  VehicleRatesSection,
  TotalRateSection,
  ChildInfantDiscountSection,
  useVehicleTypesLookup,
  type PaxRateRow,
  type PrivateCell,
  type PrivateTierRow,
  type VehicleRow,
} from "./season-rates-editor";
import { formatSeasonHeader } from "./season-header-format";

// ─── Date helpers ─────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addYearsIso(iso: string, years: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  return format(isoToDate(iso), "MMM d, y");
}

const PICKER_FMT = "dd MMM yyyy";

function rangesToPickerValue(
  ranges: { valid_from: string; valid_till: string }[],
): string {
  return ranges
    .map(
      (r) =>
        `${format(isoToDate(r.valid_from), PICKER_FMT)} - ${format(isoToDate(r.valid_till), PICKER_FMT)}`,
    )
    .join(", ");
}

function pickerValueToRanges(
  value: string,
): { valid_from: string; valid_till: string }[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [from, to] = part.split(/\s+-\s+/).map((s) => s.trim());
      const fromDate = parse(from, PICKER_FMT, new Date());
      const toDate = parse(to ?? from, PICKER_FMT, new Date());
      if (!isValid(fromDate) || !isValid(toDate)) return null;
      return { valid_from: dateToIso(fromDate), valid_till: dateToIso(toDate) };
    })
    .filter(
      (r): r is { valid_from: string; valid_till: string } => r !== null,
    );
}

const SEASON_PRESETS: DateRangePreset[] = [
  {
    label: "All Season",
    getRange: () => {
      const today = new Date();
      return { from: today, to: addYears(today, 2) };
    },
  },
  {
    label: "Current CY",
    getRange: () => {
      const now = new Date();
      return { from: startOfYear(now), to: endOfYear(now) };
    },
  },
  {
    label: "Next CY",
    getRange: () => {
      const next = addYears(new Date(), 1);
      return { from: startOfYear(next), to: endOfYear(next) };
    },
  },
];

// ─── Season state shape ────────────────────────────────────────────────

export type TourSeasonEditState = {
  _localId: string;
  id: string; // 'pending-XXX' until persisted
  status: string;
  exception_rules: string;
  vehicle_rate_type: TourVehicleRateType | null;
  /** Mutually exclusive shape: per_pax / vehicle / total. */
  rate_type: TourSeasonRateType;
  /** Per-pax vs tiered editor for private rates. */
  private_rate_mode: TourPrivateRateMode;
  child_discount_type: "percent" | "fixed" | null;
  child_discount_value: string;
  infant_discount_type: "percent" | "fixed" | null;
  infant_discount_value: string;
  date_ranges: { valid_from: string; valid_till: string }[];
  blackout_dates: string[];
  pax_rows: PaxRateRow[];
  vehicle_rows: VehicleRow[];
  private_cells: PrivateCell[];
  private_tier_rows: PrivateTierRow[];
  total_rate: string;
  total_max_capacity: string;
};

export function defaultTourSeasonState(
  localId: string,
  bands: TourAgePolicyBand[],
): TourSeasonEditState {
  const today = todayIso();
  return {
    _localId: localId,
    id: localId,
    status: "active",
    exception_rules: "",
    vehicle_rate_type: "per_vehicle",
    rate_type: "per_pax",
    private_rate_mode: "per_pax",
    child_discount_type: null,
    child_discount_value: "",
    infant_discount_type: null,
    infant_discount_value: "",
    date_ranges: [{ valid_from: today, valid_till: addYearsIso(today, 2) }],
    blackout_dates: [],
    pax_rows: bands.map((b) => ({ band_name: b.band_name, rate: "" })),
    vehicle_rows: [],
    private_cells: [{ _key: `pp-1-${Date.now()}`, pax_count: 1, rate: "" }],
    private_tier_rows: [
      { _key: `tr-0-${Date.now()}`, min_pax: "1", max_pax: "1", rate: "" },
    ],
    total_rate: "",
    total_max_capacity: "",
  };
}

const RATE_TYPE_OPTIONS: { value: TourSeasonRateType; label: string }[] = [
  { value: "per_pax", label: "Per Pax" },
  { value: "vehicle", label: "Vehicle" },
  { value: "total", label: "Total" },
];

function dateSummary(
  ranges: { valid_from: string; valid_till: string }[],
): string {
  if (ranges.length === 0) return "No dates set";
  const first = `${fmtDate(ranges[0].valid_from)} – ${fmtDate(ranges[0].valid_till)}`;
  return ranges.length > 1 ? `${first} +${ranges.length - 1} more` : first;
}

// ─── Component ─────────────────────────────────────────────────────────

interface SeasonCardProps {
  season: TourSeasonEditState;
  /** Drives sub-shape inside Per Pax mode (Ticket/Shared = bands;
   *  Private/Exclusive = private rates). Vehicle and Total modes work
   *  for any sales_mode. */
  salesMode: TourPackageSalesMode;
  ageBands: TourAgePolicyBand[];
  /** 3-letter currency code for the inline header breakdown. */
  currency: string;
  isOpen: boolean;
  isDirty: boolean;
  rangeErrors?: string[];
  onToggle: () => void;
  onChange: (next: TourSeasonEditState) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopyToOther: () => void;
}

export default function SeasonCard({
  season,
  salesMode,
  ageBands,
  currency,
  isOpen,
  isDirty,
  rangeErrors,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onCopyToOther,
}: SeasonCardProps) {
  const isPending = season.id.startsWith("pending");
  const vehicleLabelById = useVehicleTypesLookup();

  const isPrivateOrExclusive =
    salesMode === "private" || salesMode === "exclusive";

  // Rate-type-driven section visibility (replaces the old sales_mode matrix).
  const showPerPax = season.rate_type === "per_pax";
  const showVehicle = season.rate_type === "vehicle";
  const showTotal = season.rate_type === "total";
  const showBand =
    showPerPax && (salesMode === "ticket" || salesMode === "shared");
  const showPrivate = showPerPax && isPrivateOrExclusive;
  const bandTitle = salesMode === "ticket" ? "Per Ticket Rate" : "SIC Rate";
  // Discounts apply to Private/Exclusive in either Per Pax or Vehicle mode.
  const showDiscounts =
    isPrivateOrExclusive && (showPerPax || showVehicle);

  const headerSummary = useMemo(
    () =>
      formatSeasonHeader({
        rateType: season.rate_type,
        salesMode,
        privateMode: season.private_rate_mode,
        currency,
        paxRows: season.pax_rows,
        privateCells: season.private_cells,
        privateTierRows: season.private_tier_rows,
        vehicleRows: season.vehicle_rows,
        totalRate: season.total_rate,
        totalMaxCapacity: season.total_max_capacity,
        vehicleLabelById,
      }),
    [
      season.rate_type,
      salesMode,
      season.private_rate_mode,
      currency,
      season.pax_rows,
      season.private_cells,
      season.private_tier_rows,
      season.vehicle_rows,
      season.total_rate,
      season.total_max_capacity,
      vehicleLabelById,
    ],
  );

  const pickerValue = useMemo(
    () => rangesToPickerValue(season.date_ranges),
    [season.date_ranges],
  );

  function patch(p: Partial<TourSeasonEditState>) {
    onChange({ ...season, ...p });
  }

  function handleRangesChange(v: string) {
    patch({ date_ranges: pickerValueToRanges(v) });
  }

  function handleBlackoutAdd(d: Date | undefined) {
    if (!d) return;
    const iso = dateToIso(d);
    if (season.blackout_dates.includes(iso)) return;
    patch({ blackout_dates: [...season.blackout_dates, iso].sort() });
  }

  function handleBlackoutRemove(iso: string) {
    patch({ blackout_dates: season.blackout_dates.filter((d) => d !== iso) });
  }

  return (
    <div className="rounded-md border bg-muted/20 p-0">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted shrink-0"
          onClick={onToggle}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        <button
          type="button"
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
          onClick={onToggle}
        >
          {isDirty && (
            <span
              className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
              aria-label="Unsaved changes"
            />
          )}
          <span className="text-xs font-semibold truncate">Season</span>
          <span className="text-xs text-muted-foreground truncate">
            {dateSummary(season.date_ranges)}
          </span>
          {!isOpen && headerSummary && (
            <span className="text-xs text-muted-foreground/80 truncate">
              · {headerSummary}
            </span>
          )}
          {isPending && (
            <span className="shrink-0 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Unsaved
            </span>
          )}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          title="Copy to another package"
          onClick={onCopyToOther}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          title="Duplicate within this package"
          onClick={onDuplicate}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          title="Delete"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 pt-2 border-t flex flex-col gap-4">
          {/* Rate Type toggle — picks which editor renders below. */}
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Rate Type
            </p>
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5 h-7">
              {RATE_TYPE_OPTIONS.map((opt) => {
                const active = season.rate_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patch({ rate_type: opt.value })}
                    className={cn(
                      "px-2.5 text-xs font-medium rounded-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Date Ranges */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date Ranges
              </label>
            </div>
            <DateRangePicker
              value={pickerValue}
              onChange={handleRangesChange}
              presets={SEASON_PRESETS}
              placeholder="Pick dates or apply a preset…"
            />
            {season.date_ranges.length > 0 && (
              <div className="mt-2 space-y-1">
                {season.date_ranges.map((r, idx) => {
                  const err = rangeErrors?.[idx];
                  const hasErr = !!err;
                  return (
                    <div
                      key={`${idx}-${r.valid_from}-${r.valid_till}`}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs flex items-center justify-between gap-2",
                        hasErr
                          ? "border-destructive/60 bg-destructive/5 text-destructive"
                          : "border-transparent text-muted-foreground",
                      )}
                    >
                      <span>
                        {fmtDate(r.valid_from)} – {fmtDate(r.valid_till)}
                      </span>
                      {hasErr && (
                        <span className="text-[10px] font-medium">{err}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Blackout Dates */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Blackout Dates
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {season.blackout_dates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-xs border"
                >
                  {fmtDate(d)}
                  <button
                    type="button"
                    onClick={() => handleBlackoutRemove(d)}
                    className="ml-0.5 opacity-50 hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {season.blackout_dates.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No blackout dates.
                </span>
              )}
            </div>
            <DatePicker
              onChange={handleBlackoutAdd}
              placeholder="Add a blackout date…"
              className="max-w-xs"
            />
          </div>

          {/* Exception Rules */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
              Exception Rules{" "}
              <span className="normal-case font-normal text-muted-foreground/70">
                (optional)
              </span>
            </label>
            <Textarea
              value={season.exception_rules}
              onChange={(e) =>
                patch({ exception_rules: e.target.value.slice(0, 500) })
              }
              rows={2}
              placeholder="E.g. 'Not applicable for public holidays'"
              className="text-xs resize-none"
            />
            <p className="mt-0.5 text-right text-[10px] text-muted-foreground/70">
              {season.exception_rules.length}/500
            </p>
          </div>

          {/* Rate editor (only one renders, per rate_type) */}
          {showBand && (
            <BandRatesSection
              title={bandTitle}
              rows={season.pax_rows}
              bands={ageBands}
              onChange={(rows) => patch({ pax_rows: rows })}
            />
          )}
          {showPrivate && (
            <PrivateRatesSection
              mode={season.private_rate_mode}
              cells={season.private_cells}
              tiers={season.private_tier_rows}
              onModeChange={(m) => patch({ private_rate_mode: m })}
              onCellsChange={(c) => patch({ private_cells: c })}
              onTiersChange={(t) => patch({ private_tier_rows: t })}
            />
          )}
          {showVehicle && (
            <VehicleRatesSection
              rows={season.vehicle_rows}
              onRowsChange={(r) => patch({ vehicle_rows: r })}
            />
          )}
          {showTotal && (
            <TotalRateSection
              rate={season.total_rate}
              maxCapacity={season.total_max_capacity}
              onChange={(v) =>
                patch({
                  total_rate: v.rate,
                  total_max_capacity: v.maxCapacity,
                })
              }
            />
          )}

          {/* Discounts — Private/Exclusive in Per Pax or Vehicle mode. */}
          {showDiscounts && (
            <ChildInfantDiscountSection
              childType={season.child_discount_type}
              childValue={season.child_discount_value}
              infantType={season.infant_discount_type}
              infantValue={season.infant_discount_value}
              ageBands={ageBands}
              onChange={(v) =>
                patch({
                  child_discount_type: v.childType,
                  child_discount_value: v.childValue,
                  infant_discount_type: v.infantType,
                  infant_discount_value: v.infantValue,
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

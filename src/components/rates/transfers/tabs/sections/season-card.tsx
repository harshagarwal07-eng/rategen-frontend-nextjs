"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  Trash2,
  Copy,
  Send,
  CalendarPlus,
  CalendarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addYears, startOfYear, endOfYear, parse, isValid } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  DateRangePicker,
  type DateRangePreset,
} from "@/components/ui/date-range-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { TransferModeOfTransport, AgePolicyBand } from "@/types/transfers";
import {
  SicRatesSection,
  PrivateRatesSection,
  VehicleRatesSection,
  ChildInfantDiscountSection,
  type SicRow,
  type PrivateCell,
  type VehicleRow,
} from "./season-rates-editor";

// ─── Date helpers ──────────────────────────────────────────────────────

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

// Picker stores ranges as comma-joined "dd MMM yyyy - dd MMM yyyy" strings.
const PICKER_FMT = "dd MMM yyyy";

function rangesToPickerValue(ranges: { valid_from: string; valid_till: string }[]): string {
  return ranges
    .map(
      (r) =>
        `${format(isoToDate(r.valid_from), PICKER_FMT)} - ${format(isoToDate(r.valid_till), PICKER_FMT)}`,
    )
    .join(", ");
}

function pickerValueToRanges(value: string): { valid_from: string; valid_till: string }[] {
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
    .filter((r): r is { valid_from: string; valid_till: string } => r !== null);
}

// Tab 3 preset list — matches spec's left-rail extension.
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
  {
    label: "Current FY",
    getRange: () => {
      // FY = Apr 1 → Mar 31 (India default).
      const now = new Date();
      const y = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
      return { from: new Date(y, 3, 1), to: new Date(y + 1, 2, 31) };
    },
  },
  {
    label: "Next FY",
    getRange: () => {
      const now = new Date();
      const y = now.getMonth() < 3 ? now.getFullYear() : now.getFullYear() + 1;
      return { from: new Date(y, 3, 1), to: new Date(y + 1, 2, 31) };
    },
  },
];

// ─── Season state shape ────────────────────────────────────────────────

export type SeasonEditState = {
  _localId: string;
  id: string; // 'pending-XXX' until persisted
  name: string;
  status: string;
  exception_rules: string;
  vehicle_rate_type: "per_vehicle" | "per_hour" | "per_km" | null;
  child_discount_type: "percent" | "fixed" | null;
  child_discount_value: string;
  infant_discount_type: "percent" | "fixed" | null;
  infant_discount_value: string;
  date_ranges: { valid_from: string; valid_till: string }[];
  blackout_dates: string[];
  sic_row: SicRow;
  vehicle_rows: VehicleRow[];
  private_cells: PrivateCell[];
};

export function defaultSeasonState(localId: string): SeasonEditState {
  const today = todayIso();
  return {
    _localId: localId,
    id: localId,
    name: "All Season",
    status: "active",
    exception_rules: "",
    vehicle_rate_type: "per_vehicle",
    child_discount_type: null,
    child_discount_value: "",
    infant_discount_type: null,
    infant_discount_value: "",
    date_ranges: [{ valid_from: today, valid_till: addYearsIso(today, 2) }],
    blackout_dates: [],
    sic_row: {
      adult_rate: "",
      child_rate: "",
      max_pax: "",
      max_luggage: "",
      supplement_hr: "",
      supplement_km: "",
    },
    vehicle_rows: [],
    private_cells: [{ _key: `pp-1-${Date.now()}`, pax_count: 1, rate: "" }],
  };
}

function dateSummary(ranges: { valid_from: string; valid_till: string }[]): string {
  if (ranges.length === 0) return "No dates set";
  const first = `${fmtDate(ranges[0].valid_from)} – ${fmtDate(ranges[0].valid_till)}`;
  return ranges.length > 1 ? `${first} +${ranges.length - 1} more` : first;
}

// ─── Component ─────────────────────────────────────────────────────────

interface SeasonCardProps {
  season: SeasonEditState;
  serviceMode: "private" | "sic";
  modeOfTransport: TransferModeOfTransport | string | null;
  isOpen: boolean;
  isDirty: boolean;
  ageBands?: AgePolicyBand[];
  rangeErrors?: string[];
  onToggle: () => void;
  onChange: (next: SeasonEditState) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopyToOther: () => void;
}

export default function SeasonCard({
  season,
  serviceMode,
  modeOfTransport,
  isOpen,
  isDirty,
  ageBands,
  rangeErrors,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onCopyToOther,
}: SeasonCardProps) {
  const isPending = season.id.startsWith("pending");
  const isDisposal = modeOfTransport === "vehicle_disposal";

  const showSic = serviceMode === "sic";
  const showVehicle =
    serviceMode === "private" &&
    (modeOfTransport === "vehicle_p2p" || modeOfTransport === "vehicle_disposal");
  const showPrivate =
    serviceMode === "private" && modeOfTransport === "vehicle_p2p";

  const pickerValue = useMemo(
    () => rangesToPickerValue(season.date_ranges),
    [season.date_ranges],
  );

  function patch(patch: Partial<SeasonEditState>) {
    onChange({ ...season, ...patch });
  }

  function handleRangesChange(newPickerValue: string) {
    patch({ date_ranges: pickerValueToRanges(newPickerValue) });
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
          <span className="text-xs font-semibold truncate">
            {season.name || "Unnamed Season"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {dateSummary(season.date_ranges)}
          </span>
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
          {/* ── Season Name ── */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
              Season Name
            </label>
            <Input
              value={season.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="All Season"
              className="h-8 text-sm max-w-xs"
            />
          </div>

          {/* ── Date Ranges ── */}
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

          {/* ── Blackout Dates ── */}
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

          {/* ── Exception Rules ── */}
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

          {/* ── Rates ── */}
          {showSic && (
            <SicRatesSection
              row={season.sic_row}
              onChange={(r) => patch({ sic_row: r })}
            />
          )}

          {showVehicle && (
            <VehicleRatesSection
              rows={season.vehicle_rows}
              rateType={season.vehicle_rate_type}
              onRowsChange={(r) => patch({ vehicle_rows: r })}
              onRateTypeChange={(rt) => patch({ vehicle_rate_type: rt })}
            />
          )}

          {showPrivate && (
            <PrivateRatesSection
              cells={season.private_cells}
              ageBands={ageBands}
              onChange={(c) => patch({ private_cells: c })}
            />
          )}

          {/* ── Child / Infant Discount ── */}
          {!showSic && !isDisposal && (
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

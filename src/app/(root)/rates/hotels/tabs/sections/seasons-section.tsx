"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addYears,
  endOfYear,
  format,
  isValid,
  parse,
  startOfYear,
} from "date-fns";
import { CalendarPlus, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DateRangePicker,
  type DateRangePreset,
} from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { ContractSeason, ContractSeasonRow } from "@/types/contract-tab2";

export interface LocalSeason {
  _localId: string;
  id?: string | null;
  name: string;
  date_ranges: { date_from: string; date_to: string }[];
}

export type SeasonsLocalState = LocalSeason[];

export interface SeasonErrors {
  name?: string;
  rangeOrder?: string;
  overlapWithin?: string;
  overlapAcross?: string;
}
export type SeasonsErrors = Record<string, SeasonErrors>;

const newLocalId = () => `season-${crypto.randomUUID()}`;

// ─── Date <-> picker-string conversion ────────────────────────────────
//
// The shared DateRangePicker stores ranges as a comma-separated string of
// "dd MMM yyyy - dd MMM yyyy" segments. Mirrors transfers' season-card
// helpers so behaviour is identical across modules.

const PICKER_FMT = "dd MMM yyyy";

const parseIsoLocal = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const dateToIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function rangesToPickerValue(ranges: { date_from: string; date_to: string }[]): string {
  return ranges
    .map(
      (r) =>
        `${format(parseIsoLocal(r.date_from), PICKER_FMT)} - ${format(parseIsoLocal(r.date_to), PICKER_FMT)}`
    )
    .join(", ");
}

export function pickerValueToRanges(value: string): { date_from: string; date_to: string }[] {
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
      return { date_from: dateToIso(fromDate), date_to: dateToIso(toDate) };
    })
    .filter((r): r is { date_from: string; date_to: string } => r !== null);
}

// FY/CY presets matching transfers' SEASON_PRESETS, with "All Season"
// dynamically resolving to the contract's stay period when present.
function buildSeasonPresets(
  contractStay: { stay_valid_from: string | null; stay_valid_till: string | null } | null
): DateRangePreset[] {
  return [
    {
      label: "All Season",
      getRange: () => {
        if (contractStay?.stay_valid_from && contractStay?.stay_valid_till) {
          return {
            from: parseIsoLocal(contractStay.stay_valid_from),
            to: parseIsoLocal(contractStay.stay_valid_till),
          };
        }
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
}

export const wrapSeasons = (rows: ContractSeasonRow[]): SeasonsLocalState =>
  rows.map((s) => ({
    _localId: newLocalId(),
    id: s.id,
    name: s.name,
    date_ranges: (s.season_date_ranges ?? []).map((r) => ({
      date_from: r.date_from,
      date_to: r.date_to,
    })),
  }));

export const stripSeasons = (state: SeasonsLocalState): ContractSeason[] =>
  state.map((s) => ({
    ...(s.id ? { id: s.id } : {}),
    name: s.name.trim(),
    date_ranges: s.date_ranges
      .filter((r) => r.date_from && r.date_to)
      .map((r) => ({ date_from: r.date_from, date_to: r.date_to })),
  }));

export function validateSeasons(state: SeasonsLocalState): SeasonsErrors {
  const errs: SeasonsErrors = {};

  for (const s of state) {
    const e: SeasonErrors = {};
    if (!s.name.trim()) e.name = "Name is required";

    // Per-range from <= to (multi-range picker enforces this on commit, but
    // the All-Season seed and copy-from data may still trip it).
    for (const r of s.date_ranges) {
      if (r.date_from && r.date_to && r.date_from > r.date_to) {
        e.rangeOrder = "A range has From > To";
      }
    }

    // Within-season overlap.
    const filled = s.date_ranges.filter(
      (r) => r.date_from && r.date_to && r.date_from <= r.date_to
    );
    outer: for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        const a = filled[i];
        const b = filled[j];
        if (a.date_from <= b.date_to && b.date_from <= a.date_to) {
          e.overlapWithin = "Two ranges in this season overlap";
          break outer;
        }
      }
    }
    errs[s._localId] = e;
  }

  // Across-season overlap (backend enforces too).
  type Flat = { sLocalId: string; df: string; dt: string; sName: string };
  const flat: Flat[] = [];
  for (const s of state) {
    for (const r of s.date_ranges) {
      if (r.date_from && r.date_to && r.date_from <= r.date_to) {
        flat.push({
          sLocalId: s._localId,
          df: r.date_from,
          dt: r.date_to,
          sName: s.name,
        });
      }
    }
  }
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      const a = flat[i];
      const b = flat[j];
      if (a.sLocalId === b.sLocalId) continue;
      if (a.df <= b.dt && b.df <= a.dt) {
        errs[a.sLocalId].overlapAcross = `Overlaps season "${b.sName || "(unnamed)"}"`;
        errs[b.sLocalId].overlapAcross = `Overlaps season "${a.sName || "(unnamed)"}"`;
      }
    }
  }

  return errs;
}

interface Props {
  state: SeasonsLocalState;
  onChange: (next: SeasonsLocalState) => void;
  disabled?: boolean;
  onErrorsChange?: (errors: SeasonsErrors) => void;
  contractStay?: { stay_valid_from: string | null; stay_valid_till: string | null } | null;
}

export default function SeasonsSection({
  state,
  onChange,
  disabled = false,
  onErrorsChange,
  contractStay = null,
}: Props) {
  const errors = useMemo(() => validateSeasons(state), [state]);
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);
  const presets = useMemo(() => buildSeasonPresets(contractStay), [contractStay]);

  const updateSeason = (id: string, patch: Partial<LocalSeason>) =>
    onChange(state.map((s) => (s._localId === id ? { ...s, ...patch } : s)));

  const addSeason = () =>
    onChange([
      ...state,
      { _localId: newLocalId(), id: null, name: "", date_ranges: [] },
    ]);

  const removeSeason = (id: string) =>
    onChange(state.filter((s) => s._localId !== id));

  const duplicateSeason = (id: string) => {
    const src = state.find((s) => s._localId === id);
    if (!src) return;
    onChange([
      ...state,
      {
        _localId: newLocalId(),
        id: null,
        name: `${src.name} (Copy)`.trim(),
        date_ranges: src.date_ranges.map((r) => ({ ...r })),
      },
    ]);
  };

  // Per-season open/close state lives at the section level so it survives
  // re-renders without remounting the cards. Newly-added seasons auto-open.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAddSeason = () => {
    const id = newLocalId();
    onChange([...state, { _localId: id, id: null, name: "", date_ranges: [] }]);
    setOpenIds((prev) => new Set(prev).add(id));
  };

  const handleDuplicate = (srcId: string) => {
    const src = state.find((s) => s._localId === srcId);
    if (!src) return;
    const id = newLocalId();
    onChange([
      ...state,
      {
        _localId: id,
        id: null,
        name: `${src.name} (Copy)`.trim(),
        date_ranges: src.date_ranges.map((r) => ({ ...r })),
      },
    ]);
    setOpenIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-[11px] text-muted-foreground/80">
          Date ranges per season. Use a preset (All Season, Current CY, …) or
          pick custom ranges in the popover.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSeason}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Season
        </Button>
      </div>

      {state.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
          <p className="text-sm">No seasons yet. Click &ldquo;Add Season&rdquo;.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {state.map((s) => (
            <SeasonCard
              key={s._localId}
              season={s}
              errors={errors[s._localId] ?? {}}
              disabled={disabled}
              presets={presets}
              isOpen={openIds.has(s._localId)}
              onToggle={() => toggleOpen(s._localId)}
              onPatch={(patch) => updateSeason(s._localId, patch)}
              onDuplicate={() => handleDuplicate(s._localId)}
              onDelete={() => removeSeason(s._localId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Lightweight inner card matching transfers' SeasonCard chrome (rounded-md
// border bg-muted/20, manual ChevronDown rotate). FDCard / Radix Accordion
// is intentionally NOT used here — that heavy chrome is reserved for the
// four outer Tab 2 sections only.
function SeasonCard({
  season,
  errors,
  disabled,
  presets,
  isOpen,
  onToggle,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  season: LocalSeason;
  errors: SeasonErrors;
  disabled: boolean;
  presets: DateRangePreset[];
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<LocalSeason>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const titleText = season.name.trim() || "Unnamed Season";
  const summary =
    season.date_ranges.length === 0
      ? "No dates set"
      : season.date_ranges.length === 1
        ? `${season.date_ranges.length} range`
        : `${season.date_ranges.length} ranges`;
  const isPending = !season.id;

  return (
    <div className="rounded-md border bg-muted/20">
      {/* Header — chevron at far right per UI polish brief */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
          onClick={onToggle}
        >
          <span
            className={cn(
              "text-xs font-semibold truncate",
              !season.name.trim() && "text-muted-foreground italic"
            )}
          >
            {titleText}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {summary}
          </span>
          {isPending && (
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Unsaved
            </span>
          )}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onDuplicate}
          disabled={disabled}
          title="Duplicate season"
          aria-label="Duplicate season"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={disabled}
          title="Delete season"
          aria-label="Delete season"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
          onClick={onToggle}
          aria-label={isOpen ? "Collapse season" : "Expand season"}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 pt-2 border-t flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
              Season Name
            </label>
            <Input
              value={season.name}
              disabled={disabled}
              placeholder="All Season"
              onChange={(e) => onPatch({ name: e.target.value })}
              className="h-8 text-sm max-w-xs"
            />
            {errors.name && (
              <p className="mt-1 text-[10px] text-destructive">{errors.name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date Ranges
              </label>
            </div>
            <DateRangePicker
              value={rangesToPickerValue(season.date_ranges)}
              onChange={(next) =>
                onPatch({ date_ranges: pickerValueToRanges(next) })
              }
              disabled={disabled}
              presets={presets}
              placeholder="Pick dates or apply a preset…"
            />
            {(errors.rangeOrder || errors.overlapWithin || errors.overlapAcross) && (
              <p className="mt-1 text-[10px] text-destructive">
                {[errors.rangeOrder, errors.overlapWithin, errors.overlapAcross]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

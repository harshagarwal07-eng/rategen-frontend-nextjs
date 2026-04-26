"use client";

import { useEffect, useMemo } from "react";
import {
  addYears,
  endOfYear,
  format,
  isValid,
  parse,
  startOfYear,
} from "date-fns";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DateRangePicker,
  type DateRangePreset,
} from "@/components/ui/date-range-picker";
import { FDCard } from "@/components/ui/fd-card";
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

  if (state.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No seasons defined. Click &ldquo;+ Add Season&rdquo; to start.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSeason}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Season
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSeason}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Season
        </Button>
      </div>

      <div className="space-y-2">
        {state.map((s) => (
          <SeasonCard
            key={s._localId}
            season={s}
            errors={errors[s._localId] ?? {}}
            disabled={disabled}
            presets={presets}
            onPatch={(patch) => updateSeason(s._localId, patch)}
            onDuplicate={() => duplicateSeason(s._localId)}
            onDelete={() => removeSeason(s._localId)}
          />
        ))}
      </div>
    </div>
  );
}

function SeasonCard({
  season,
  errors,
  disabled,
  presets,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  season: LocalSeason;
  errors: SeasonErrors;
  disabled: boolean;
  presets: DateRangePreset[];
  onPatch: (patch: Partial<LocalSeason>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const titleText = season.name.trim() || "(unnamed season)";
  const summary =
    season.date_ranges.length === 0
      ? "no ranges"
      : `${season.date_ranges.length} range${season.date_ranges.length === 1 ? "" : "s"}`;

  return (
    <FDCard
      title={
        <span className="flex items-center gap-2">
          <span className="font-medium">{titleText}</span>
          <span className="text-[11px] text-muted-foreground font-normal">
            {summary}
          </span>
        </span>
      }
      defaultOpen
      rightSlot={
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onDuplicate}
            disabled={disabled}
            aria-label="Duplicate season"
            title="Duplicate season"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Delete season"
            title="Delete season"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            value={season.name}
            disabled={disabled}
            placeholder="Season name (e.g. Peak)"
            onChange={(e) => onPatch({ name: e.target.value })}
            className="h-9 mt-1 max-w-md"
          />
          {errors.name && (
            <div className="text-[11px] text-destructive mt-1">{errors.name}</div>
          )}
        </div>

        <div>
          <Label className="text-xs">Date ranges</Label>
          <div className="mt-1 max-w-md">
            <DateRangePicker
              value={rangesToPickerValue(season.date_ranges)}
              onChange={(next) =>
                onPatch({ date_ranges: pickerValueToRanges(next) })
              }
              disabled={disabled}
              presets={presets}
              placeholder="Pick dates or apply a preset…"
            />
          </div>
          {(errors.rangeOrder || errors.overlapWithin || errors.overlapAcross) && (
            <div className="text-[11px] text-destructive mt-1 space-x-2">
              {errors.rangeOrder && <span>{errors.rangeOrder}</span>}
              {errors.overlapWithin && <span>{errors.overlapWithin}</span>}
              {errors.overlapAcross && <span>{errors.overlapAcross}</span>}
            </div>
          )}
        </div>
      </div>
    </FDCard>
  );
}

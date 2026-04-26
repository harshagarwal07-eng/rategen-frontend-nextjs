"use client";

import { useEffect, useMemo } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FDCard } from "@/components/ui/fd-card";
import { ContractSeason, ContractSeasonRow } from "@/types/contract-tab2";
import { MultiRangeDatePicker } from "./multi-range-date-picker";

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
}

export default function SeasonsSection({
  state,
  onChange,
  disabled = false,
  onErrorsChange,
}: Props) {
  const errors = useMemo(() => validateSeasons(state), [state]);
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

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
  onPatch,
  onDuplicate,
  onDelete,
}: {
  season: LocalSeason;
  errors: SeasonErrors;
  disabled: boolean;
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
            <MultiRangeDatePicker
              value={season.date_ranges}
              onChange={(next) => onPatch({ date_ranges: next })}
              disabled={disabled}
              placeholder="Pick date ranges"
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

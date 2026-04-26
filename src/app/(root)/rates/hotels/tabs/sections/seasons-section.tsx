"use client";

import { useEffect, useMemo } from "react";
import { format, parse, isValid } from "date-fns";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateValidityPicker } from "@/components/ui/date-validity-picker";
import { ContractSeason, ContractSeasonRow } from "@/types/contract-tab2";

export interface LocalRange {
  _localId: string;
  date_from: string; // YYYY-MM-DD; "" if unset
  date_to: string;
}

export interface LocalSeason {
  _localId: string;
  id?: string | null;
  name: string;
  date_ranges: LocalRange[];
}

export type SeasonsLocalState = LocalSeason[];

export interface SeasonRowError {
  range?: string;
  overlapWithin?: string;
}
export interface SeasonErrors {
  name?: string;
  ranges: Record<string, SeasonRowError>;
  overlapAcross?: string;
}
export type SeasonsErrors = Record<string, SeasonErrors>;

const newLocalId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const wrapSeasons = (rows: ContractSeasonRow[]): SeasonsLocalState =>
  rows.map((s) => ({
    _localId: newLocalId("season"),
    id: s.id,
    name: s.name,
    date_ranges: (s.season_date_ranges ?? []).map((r) => ({
      _localId: newLocalId("range"),
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

const ISO = "yyyy-MM-dd";

export function isoToDate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, ISO, new Date());
  return isValid(d) ? d : undefined;
}
export function dateToIso(d: Date | undefined): string {
  return d && isValid(d) ? format(d, ISO) : "";
}

export function validateSeasons(state: SeasonsLocalState): SeasonsErrors {
  const errs: SeasonsErrors = {};

  // Per-season: name required, each range from<=to, ranges-within-season no overlap
  for (const s of state) {
    const e: SeasonErrors = { ranges: {} };
    if (!s.name.trim()) e.name = "Name is required";

    for (const r of s.date_ranges) {
      if (r.date_from && r.date_to && r.date_from > r.date_to) {
        e.ranges[r._localId] = { ...(e.ranges[r._localId] ?? {}), range: "From must be ≤ To" };
      }
    }

    // overlap within this season
    const filled = s.date_ranges.filter((r) => r.date_from && r.date_to && r.date_from <= r.date_to);
    for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        const a = filled[i], b = filled[j];
        if (a.date_from <= b.date_to && b.date_from <= a.date_to) {
          e.ranges[a._localId] = { ...(e.ranges[a._localId] ?? {}), overlapWithin: "Overlaps another range in this season" };
          e.ranges[b._localId] = { ...(e.ranges[b._localId] ?? {}), overlapWithin: "Overlaps another range in this season" };
        }
      }
    }
    errs[s._localId] = e;
  }

  // Across-season overlap (backend also enforces; we surface inline so the
  // user doesn't bounce off a 400 on save).
  type Flat = { sLocalId: string; rLocalId: string; df: string; dt: string; sName: string };
  const flat: Flat[] = [];
  for (const s of state) {
    for (const r of s.date_ranges) {
      if (r.date_from && r.date_to && r.date_from <= r.date_to) {
        flat.push({ sLocalId: s._localId, rLocalId: r._localId, df: r.date_from, dt: r.date_to, sName: s.name });
      }
    }
  }
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      const a = flat[i], b = flat[j];
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
      {
        _localId: newLocalId("season"),
        id: null,
        name: "",
        date_ranges: [{ _localId: newLocalId("range"), date_from: "", date_to: "" }],
      },
    ]);

  const removeSeason = (id: string) => onChange(state.filter((s) => s._localId !== id));

  const duplicateSeason = (id: string) => {
    const src = state.find((s) => s._localId === id);
    if (!src) return;
    onChange([
      ...state,
      {
        _localId: newLocalId("season"),
        id: null,
        name: `${src.name} (Copy)`.trim(),
        date_ranges: src.date_ranges.map((r) => ({
          _localId: newLocalId("range"),
          date_from: r.date_from,
          date_to: r.date_to,
        })),
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

      <div className="space-y-3">
        {state.map((s) => (
          <SeasonCard
            key={s._localId}
            season={s}
            errors={errors[s._localId] ?? { ranges: {} }}
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
  const updateRange = (id: string, patch: Partial<LocalRange>) =>
    onPatch({
      date_ranges: season.date_ranges.map((r) =>
        r._localId === id ? { ...r, ...patch } : r
      ),
    });
  const addRange = () =>
    onPatch({
      date_ranges: [
        ...season.date_ranges,
        { _localId: newLocalId("range"), date_from: "", date_to: "" },
      ],
    });
  const removeRange = (id: string) =>
    onPatch({
      date_ranges: season.date_ranges.filter((r) => r._localId !== id),
    });

  return (
    <div className="rounded-md border bg-background p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={season.name}
            disabled={disabled}
            placeholder="Season name (e.g. Peak)"
            onChange={(e) => onPatch({ name: e.target.value })}
            className="h-9"
          />
          {errors.name && (
            <div className="text-[11px] text-destructive mt-1">{errors.name}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={disabled}
          className="p-1.5 hover:bg-muted rounded disabled:opacity-40 disabled:cursor-not-allowed"
          title="Duplicate season"
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="p-1.5 hover:bg-destructive/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          title="Delete season"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>

      {errors.overlapAcross && (
        <div className="text-[11px] text-destructive">{errors.overlapAcross}</div>
      )}

      <div className="space-y-2 pl-1">
        {season.date_ranges.length === 0 && (
          <div className="text-xs text-muted-foreground">No ranges yet.</div>
        )}
        {season.date_ranges.map((r) => {
          const re = errors.ranges[r._localId];
          const value =
            r.date_from && r.date_to
              ? { from: isoToDate(r.date_from), to: isoToDate(r.date_to) }
              : undefined;
          return (
            <div key={r._localId} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 max-w-md">
                  <DateValidityPicker
                    value={value}
                    onChange={(v) =>
                      updateRange(r._localId, {
                        date_from: dateToIso(v?.from),
                        date_to: dateToIso(v?.to),
                      })
                    }
                    placeholder="Pick date range"
                    disabled={disabled}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRange(r._localId)}
                  disabled={disabled}
                  className="p-1 hover:bg-destructive/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Delete range"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
              {re && (re.range || re.overlapWithin) && (
                <div className="text-[11px] text-destructive pl-1 space-x-2">
                  {re.range && <span>{re.range}</span>}
                  {re.overlapWithin && <span>{re.overlapWithin}</span>}
                </div>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRange}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Range
        </Button>
      </div>
    </div>
  );
}

"use client";

// Age Policies — single table per band, two scope sub-pairs per row.
// Mirrors transfers' age-policy-section.tsx structure (compact <Table>,
// preset name dropdown, ghost Add button) but with Hotels' Rooms+Meals
// scope split represented as two pairs of From/To columns rather than
// each band being its own collapsible card.

import { useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  AgePoliciesResponse,
  AgePolicyBand,
  AgeBandScope,
} from "@/types/contract-tab2";

const DEFAULT_LABEL_ORDER = ["Adult", "Teenager", "Child", "Infant"] as const;

const PRESET_NAMES = ["Adult", "Teenager", "Child", "Infant", "Senior", "Youth"] as const;

// Sensible age-pair defaults used when a scope materialises (user types
// into an empty cell). Matches the previous brief's defaults.
const DEFAULT_AGES: Record<string, { age_from: number; age_to: number }> = {
  adult: { age_from: 18, age_to: 99 },
  teenager: { age_from: 13, age_to: 17 },
  teen: { age_from: 13, age_to: 17 },
  child: { age_from: 2, age_to: 12 },
  infant: { age_from: 0, age_to: 1 },
  senior: { age_from: 60, age_to: 99 },
  youth: { age_from: 18, age_to: 25 },
};

const defaultAgesFor = (label: string) =>
  DEFAULT_AGES[label.trim().toLowerCase()] ?? { age_from: 0, age_to: 0 };

// ─── Local state shape ─────────────────────────────────────────────────

export interface ScopeData {
  id?: string | null;
  age_from: number | null;
  age_to: number | null;
}

export interface LocalAgeBand {
  _localId: string;
  label: string;
  rooms?: ScopeData;
  meals?: ScopeData;
}

export type AgePoliciesLocalState = LocalAgeBand[];

const newLocalId = () => `band-${crypto.randomUUID()}`;

// ─── wrap / strip ──────────────────────────────────────────────────────

export function wrapAgePolicies(res: AgePoliciesResponse | null): AgePoliciesLocalState {
  const rooms = res?.rooms ?? [];
  const meals = res?.meals ?? [];

  const labels: string[] = [];
  const seen = new Set<string>();
  const addLabel = (l: string) => {
    const k = l.trim().toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    labels.push(l);
  };
  for (const l of DEFAULT_LABEL_ORDER) addLabel(l);
  for (const b of rooms) addLabel(b.label);
  for (const b of meals) addLabel(b.label);

  return labels.map((displayLabel) => {
    const k = displayLabel.trim().toLowerCase();
    const r = rooms.find((b) => b.label.trim().toLowerCase() === k);
    const m = meals.find((b) => b.label.trim().toLowerCase() === k);
    return {
      _localId: newLocalId(),
      label: r?.label ?? m?.label ?? displayLabel,
      rooms: r ? { id: r.id, age_from: r.age_from, age_to: r.age_to } : undefined,
      meals: m ? { id: m.id, age_from: m.age_from, age_to: m.age_to } : undefined,
    };
  });
}

// Emit only fully-populated scopes. A scope with either bound null is
// treated as absent — same as undefined — so blanking both cells in a
// scope drops it from the payload (per brief's "empty cells = absent").
export function stripAgePolicies(state: AgePoliciesLocalState): {
  rooms: AgePolicyBand[];
  meals: AgePolicyBand[];
} {
  const rooms: AgePolicyBand[] = [];
  const meals: AgePolicyBand[] = [];
  for (const b of state) {
    const label = b.label.trim();
    if (!label) continue;
    if (b.rooms && b.rooms.age_from != null && b.rooms.age_to != null) {
      rooms.push({
        ...(b.rooms.id ? { id: b.rooms.id } : {}),
        label,
        age_from: b.rooms.age_from,
        age_to: b.rooms.age_to,
      });
    }
    if (b.meals && b.meals.age_from != null && b.meals.age_to != null) {
      meals.push({
        ...(b.meals.id ? { id: b.meals.id } : {}),
        label,
        age_from: b.meals.age_from,
        age_to: b.meals.age_to,
      });
    }
  }
  return { rooms, meals };
}

// ─── validation ────────────────────────────────────────────────────────

export interface BandSubError {
  age?: string;
  overlap?: string;
  partial?: string;
}
export interface BandError {
  rooms?: BandSubError;
  meals?: BandSubError;
  duplicate?: string;
}
export type AgePoliciesErrors = Record<string, BandError>;

export function validateAgePolicies(state: AgePoliciesLocalState): AgePoliciesErrors {
  const errs: AgePoliciesErrors = {};
  for (const b of state) errs[b._localId] = {};

  // Duplicate label across bands.
  const counts = new Map<string, string[]>();
  for (const b of state) {
    const k = b.label.trim().toLowerCase();
    if (!k) continue;
    const arr = counts.get(k) ?? [];
    arr.push(b._localId);
    counts.set(k, arr);
  }
  for (const [, ids] of counts) {
    if (ids.length < 2) continue;
    for (const id of ids) errs[id].duplicate = "Duplicate label";
  }

  for (const scope of ["rooms", "meals"] as const) {
    type Filled = { band: LocalAgeBand; from: number; to: number };
    const filled: Filled[] = [];
    for (const b of state) {
      const sub = b[scope];
      if (!sub) continue;
      const oneSet =
        (sub.age_from != null) !== (sub.age_to != null);
      if (oneSet) {
        errs[b._localId][scope] = { partial: "Set both From and To" };
        continue;
      }
      if (sub.age_from == null || sub.age_to == null) continue;
      if (sub.age_from > sub.age_to) {
        errs[b._localId][scope] = {
          ...(errs[b._localId][scope] ?? {}),
          age: "From ≤ To",
        };
        continue;
      }
      filled.push({ band: b, from: sub.age_from, to: sub.age_to });
    }
    for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        const a = filled[i];
        const b = filled[j];
        if (a.from <= b.to && b.from <= a.to) {
          errs[a.band._localId][scope] = {
            ...(errs[a.band._localId][scope] ?? {}),
            overlap: `Overlaps another ${scope} band`,
          };
          errs[b.band._localId][scope] = {
            ...(errs[b.band._localId][scope] ?? {}),
            overlap: `Overlaps another ${scope} band`,
          };
        }
      }
    }
  }

  return errs;
}

// ─── component ─────────────────────────────────────────────────────────

interface Props {
  state: AgePoliciesLocalState;
  onChange: (next: AgePoliciesLocalState) => void;
  disabled?: boolean;
  onErrorsChange?: (errors: AgePoliciesErrors) => void;
}

export default function AgePoliciesSection({
  state,
  onChange,
  disabled = false,
  onErrorsChange,
}: Props) {
  const errors = useMemo(() => validateAgePolicies(state), [state]);
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  const updateBand = (id: string, patch: Partial<LocalAgeBand>) =>
    onChange(state.map((b) => (b._localId === id ? { ...b, ...patch } : b)));

  const removeBand = (id: string) =>
    onChange(state.filter((b) => b._localId !== id));

  const addBand = () =>
    onChange([
      ...state,
      { _localId: newLocalId(), label: "", rooms: undefined, meals: undefined },
    ]);

  // Update one cell of a scope. Rules:
  //  - Empty scope + non-empty cell → materialise scope, fill the other
  //    cell with the per-label default so the user sees a complete pair.
  //  - Defined scope, both cells emptied → drop scope back to undefined.
  //  - Defined scope, one cell edited → update that field (other may be null
  //    transiently; flagged by validation).
  const updateScopeField = (
    bandId: string,
    scope: AgeBandScope,
    field: "age_from" | "age_to",
    raw: string
  ) => {
    const band = state.find((b) => b._localId === bandId);
    if (!band) return;
    const num = raw === "" ? null : Number(raw);
    const current = band[scope];

    if (!current) {
      if (num == null) return;
      const def = defaultAgesFor(band.label);
      const next: ScopeData = {
        id: null,
        age_from: field === "age_from" ? num : def.age_from,
        age_to: field === "age_to" ? num : def.age_to,
      };
      updateBand(bandId, { [scope]: next } as Partial<LocalAgeBand>);
      return;
    }

    const next: ScopeData = { ...current, [field]: num };
    if (next.age_from == null && next.age_to == null) {
      updateBand(bandId, { [scope]: undefined } as Partial<LocalAgeBand>);
      return;
    }
    updateBand(bandId, { [scope]: next } as Partial<LocalAgeBand>);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground/80">
        These age bands apply to room rates and meal supplements. Leave a
        scope&apos;s cells empty to skip that scope for a band.
      </p>

      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-44">Band name</TableHead>
            <TableHead className="w-20 text-center">Rooms From</TableHead>
            <TableHead className="w-20 text-center">Rooms To</TableHead>
            <TableHead className="w-20 text-center">Meals From</TableHead>
            <TableHead className="w-20 text-center">Meals To</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-4 text-center text-xs text-muted-foreground"
              >
                No age bands. Click &ldquo;Add Band&rdquo; to define one.
              </TableCell>
            </TableRow>
          )}
          {state.map((b, idx) => {
            const e = errors[b._localId] ?? {};
            return (
              <TableRow
                key={b._localId}
                className={cn(
                  idx % 2 === 1 && "bg-muted/30",
                  "align-top"
                )}
              >
                <TableCell className="py-1.5 pr-2">
                  <BandNameField
                    value={b.label}
                    disabled={disabled}
                    onChange={(label) => updateBand(b._localId, { label })}
                  />
                  {e.duplicate && (
                    <p className="mt-0.5 text-[10px] text-destructive">
                      {e.duplicate}
                    </p>
                  )}
                </TableCell>

                <TableCell className="py-1.5 px-1">
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={b.rooms?.age_from ?? ""}
                    disabled={disabled}
                    onChange={(ev) =>
                      updateScopeField(b._localId, "rooms", "age_from", ev.target.value)
                    }
                    className="h-7 text-center text-xs"
                  />
                </TableCell>
                <TableCell className="py-1.5 px-1">
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={b.rooms?.age_to ?? ""}
                    disabled={disabled}
                    onChange={(ev) =>
                      updateScopeField(b._localId, "rooms", "age_to", ev.target.value)
                    }
                    className="h-7 text-center text-xs"
                  />
                  {e.rooms && (e.rooms.age || e.rooms.overlap || e.rooms.partial) && (
                    <p className="mt-0.5 text-[10px] text-destructive whitespace-nowrap">
                      {e.rooms.partial || e.rooms.age || e.rooms.overlap}
                    </p>
                  )}
                </TableCell>

                <TableCell className="py-1.5 px-1">
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={b.meals?.age_from ?? ""}
                    disabled={disabled}
                    onChange={(ev) =>
                      updateScopeField(b._localId, "meals", "age_from", ev.target.value)
                    }
                    className="h-7 text-center text-xs"
                  />
                </TableCell>
                <TableCell className="py-1.5 px-1">
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={b.meals?.age_to ?? ""}
                    disabled={disabled}
                    onChange={(ev) =>
                      updateScopeField(b._localId, "meals", "age_to", ev.target.value)
                    }
                    className="h-7 text-center text-xs"
                  />
                  {e.meals && (e.meals.age || e.meals.overlap || e.meals.partial) && (
                    <p className="mt-0.5 text-[10px] text-destructive whitespace-nowrap">
                      {e.meals.partial || e.meals.age || e.meals.overlap}
                    </p>
                  )}
                </TableCell>

                <TableCell className="py-1.5 pl-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    onClick={() => removeBand(b._localId)}
                    aria-label={`Delete ${b.label || "band"}`}
                    title="Delete band"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {!disabled && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={addBand}
          >
            <Plus className="h-3 w-3" /> Add Band
          </Button>
        </div>
      )}
    </div>
  );
}

// Band-name field: preset Select with "Custom…" escape hatch matching
// transfers' age-policy-section. If the current value is non-empty and
// not a preset, render a freeform text input so legacy/custom labels
// survive load → edit → save unchanged.
function BandNameField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const trimmed = value.trim();
  const isPreset =
    trimmed === "" ||
    PRESET_NAMES.some((p) => p.toLowerCase() === trimmed.toLowerCase());

  if (!isPreset) {
    return (
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Band name"
        className="h-7 text-xs"
      />
    );
  }

  const canonical =
    PRESET_NAMES.find((p) => p.toLowerCase() === trimmed.toLowerCase()) ?? "";

  return (
    <Select
      value={canonical || "__placeholder__"}
      onValueChange={(v) => {
        if (v === "__placeholder__") return;
        if (v === "__custom__") onChange(" "); // trigger custom-input branch
        else onChange(v);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 text-xs">
        <SelectValue placeholder="Select band…" />
      </SelectTrigger>
      <SelectContent>
        {PRESET_NAMES.map((n) => (
          <SelectItem key={n} value={n} className="text-xs">
            {n}
          </SelectItem>
        ))}
        <SelectItem
          value="__custom__"
          className="text-xs italic text-muted-foreground"
        >
          Custom…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

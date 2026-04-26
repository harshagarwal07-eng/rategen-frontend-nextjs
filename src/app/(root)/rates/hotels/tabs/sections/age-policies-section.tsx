"use client";

// Age Policies card (issue 2 rebuild). One band per label; inside each band,
// "For Rooms" + "For Meals" sub-blocks side-by-side. Either sub-block may be
// absent — in which case it shows a "+ Add" button. Default labels (Adult /
// Teenager / Child / Infant) are always rendered; Teenager has no server-
// seeded data and starts empty until the user clicks Add.

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FDCard } from "@/components/ui/fd-card";
import {
  AgePoliciesResponse,
  AgePolicyBand,
  AgeBandScope,
} from "@/types/contract-tab2";

const DEFAULT_LABEL_ORDER = ["Adult", "Teenager", "Child", "Infant"] as const;

// Sensible defaults for "+ Add Rooms / Meals" on an empty band, by label
// name (case-insensitive). Used so users don't have to type 13 / 17 manually
// for a new Teenager band on the contract they just opened.
const DEFAULT_AGES: Record<string, { age_from: number; age_to: number }> = {
  adult: { age_from: 18, age_to: 99 },
  teenager: { age_from: 13, age_to: 17 },
  teen: { age_from: 13, age_to: 17 },
  child: { age_from: 2, age_to: 12 },
  infant: { age_from: 0, age_to: 1 },
  senior: { age_from: 60, age_to: 99 },
};

const defaultAgesFor = (label: string) =>
  DEFAULT_AGES[label.trim().toLowerCase()] ?? { age_from: 0, age_to: 0 };

export interface ScopeData {
  id?: string | null;
  age_from: number;
  age_to: number;
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

  // Preserve canonical case for known labels but key by lowercase so
  // inconsistent server data ("CHILD" vs "Child") collapses to one band.
  const labels: string[] = [];
  const seen = new Set<string>();
  const addLabel = (l: string) => {
    const k = l.trim().toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    labels.push(l);
  };
  // Defaults first (so they always appear in canonical order).
  for (const l of DEFAULT_LABEL_ORDER) addLabel(l);
  // Then any extras from the response.
  for (const b of rooms) addLabel(b.label);
  for (const b of meals) addLabel(b.label);

  return labels.map((displayLabel) => {
    const k = displayLabel.trim().toLowerCase();
    const r = rooms.find((b) => b.label.trim().toLowerCase() === k);
    const m = meals.find((b) => b.label.trim().toLowerCase() === k);
    return {
      _localId: newLocalId(),
      // Prefer the server's actual casing for the label if it appears in either
      // scope's data — otherwise fall back to the canonical default.
      label: r?.label ?? m?.label ?? displayLabel,
      rooms: r ? { id: r.id, age_from: r.age_from, age_to: r.age_to } : undefined,
      meals: m ? { id: m.id, age_from: m.age_from, age_to: m.age_to } : undefined,
    };
  });
}

export function stripAgePolicies(state: AgePoliciesLocalState): {
  rooms: AgePolicyBand[];
  meals: AgePolicyBand[];
} {
  const rooms: AgePolicyBand[] = [];
  const meals: AgePolicyBand[] = [];
  for (const b of state) {
    const label = b.label.trim();
    if (!label) continue;
    if (b.rooms) {
      rooms.push({
        ...(b.rooms.id ? { id: b.rooms.id } : {}),
        label,
        age_from: b.rooms.age_from,
        age_to: b.rooms.age_to,
      });
    }
    if (b.meals) {
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
}
export interface BandError {
  rooms?: BandSubError;
  meals?: BandSubError;
  duplicate?: string; // band-level: duplicate label
}
export type AgePoliciesErrors = Record<string, BandError>;

export function validateAgePolicies(state: AgePoliciesLocalState): AgePoliciesErrors {
  const errs: AgePoliciesErrors = {};
  for (const b of state) {
    errs[b._localId] = {};
  }

  // Duplicate label across bands (case-insensitive). Skip empty labels.
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
    for (const id of ids) {
      errs[id].duplicate = "Duplicate label";
    }
  }

  // Per-scope checks: age_from <= age_to and intra-scope overlap.
  for (const scope of ["rooms", "meals"] as const) {
    const filled = state
      .map((b) => ({ band: b, sub: b[scope] }))
      .filter((x): x is { band: LocalAgeBand; sub: ScopeData } => !!x.sub);

    for (const { band, sub } of filled) {
      if (sub.age_from > sub.age_to) {
        errs[band._localId][scope] = { ...(errs[band._localId][scope] ?? {}), age: "From ≤ To" };
      }
    }

    for (let i = 0; i < filled.length; i++) {
      const a = filled[i];
      if (a.sub.age_from > a.sub.age_to) continue;
      for (let j = i + 1; j < filled.length; j++) {
        const b = filled[j];
        if (b.sub.age_from > b.sub.age_to) continue;
        if (a.sub.age_from <= b.sub.age_to && b.sub.age_from <= a.sub.age_to) {
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

  const removeScope = (id: string, scope: AgeBandScope) =>
    updateBand(id, { [scope]: undefined } as Partial<LocalAgeBand>);

  const addScope = (id: string, scope: AgeBandScope) => {
    const band = state.find((b) => b._localId === id);
    if (!band) return;
    updateBand(id, {
      [scope]: { id: null, ...defaultAgesFor(band.label) },
    } as Partial<LocalAgeBand>);
  };

  const updateScope = (id: string, scope: AgeBandScope, patch: Partial<ScopeData>) => {
    const band = state.find((b) => b._localId === id);
    if (!band || !band[scope]) return;
    updateBand(id, {
      [scope]: { ...band[scope]!, ...patch },
    } as Partial<LocalAgeBand>);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These age bands apply to room rate pricing only. Meal plan and
        supplement age policies are configured separately.
      </p>

      <div className="space-y-2">
        {state.map((b) => (
          <BandCard
            key={b._localId}
            band={b}
            errors={errors[b._localId] ?? {}}
            disabled={disabled}
            onChangeLabel={(label) => updateBand(b._localId, { label })}
            onDelete={() => removeBand(b._localId)}
            onDeleteScope={(scope) => removeScope(b._localId, scope)}
            onAddScope={(scope) => addScope(b._localId, scope)}
            onUpdateScope={(scope, patch) => updateScope(b._localId, scope, patch)}
          />
        ))}
      </div>

      {!disabled && (
        <AddBandRow
          existingLabels={state.map((b) => b.label.trim().toLowerCase())}
          onAdd={(label) =>
            onChange([
              ...state,
              { _localId: newLocalId(), label, rooms: undefined, meals: undefined },
            ])
          }
        />
      )}
    </div>
  );
}

function BandCard({
  band,
  errors,
  disabled,
  onChangeLabel,
  onDelete,
  onDeleteScope,
  onAddScope,
  onUpdateScope,
}: {
  band: LocalAgeBand;
  errors: BandError;
  disabled: boolean;
  onChangeLabel: (label: string) => void;
  onDelete: () => void;
  onDeleteScope: (scope: AgeBandScope) => void;
  onAddScope: (scope: AgeBandScope) => void;
  onUpdateScope: (scope: AgeBandScope, patch: Partial<ScopeData>) => void;
}) {
  const titleText = band.label.trim() || "(unnamed)";
  const summary =
    band.rooms && band.meals
      ? `Rooms ${band.rooms.age_from}–${band.rooms.age_to} · Meals ${band.meals.age_from}–${band.meals.age_to}`
      : band.rooms
        ? `Rooms ${band.rooms.age_from}–${band.rooms.age_to}`
        : band.meals
          ? `Meals ${band.meals.age_from}–${band.meals.age_to}`
          : "empty";

  return (
    <FDCard
      title={
        <span className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wide text-sm">
            {titleText}
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">
            {summary}
          </span>
          {errors.duplicate && (
            <span className="text-[11px] text-destructive font-normal">
              · {errors.duplicate}
            </span>
          )}
        </span>
      }
      defaultOpen={false}
      rightSlot={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Delete ${titleText} band`}
          title="Delete band"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="space-y-3">
        {/* Label edit input — kept compact, only useful when user wants to
            rename a custom band. Default labels can also be renamed. */}
        <div className="flex items-center gap-2">
          <Label className="text-xs w-16 shrink-0">Label</Label>
          <Input
            value={band.label}
            disabled={disabled}
            onChange={(e) => onChangeLabel(e.target.value)}
            className="h-8 max-w-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScopePanel
            scope="rooms"
            title="For Rooms"
            data={band.rooms}
            error={errors.rooms}
            disabled={disabled}
            onAdd={() => onAddScope("rooms")}
            onDelete={() => onDeleteScope("rooms")}
            onUpdate={(patch) => onUpdateScope("rooms", patch)}
          />
          <ScopePanel
            scope="meals"
            title="For Meals"
            data={band.meals}
            error={errors.meals}
            disabled={disabled}
            onAdd={() => onAddScope("meals")}
            onDelete={() => onDeleteScope("meals")}
            onUpdate={(patch) => onUpdateScope("meals", patch)}
          />
        </div>
      </div>
    </FDCard>
  );
}

function ScopePanel({
  scope,
  title,
  data,
  error,
  disabled,
  onAdd,
  onDelete,
  onUpdate,
}: {
  scope: AgeBandScope;
  title: string;
  data: ScopeData | undefined;
  error: BandSubError | undefined;
  disabled: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<ScopeData>) => void;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {data && (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="p-1 hover:bg-destructive/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title={`Remove ${title}`}
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        )}
      </div>

      {data ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">From</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={data.age_from}
                disabled={disabled}
                onChange={(e) => onUpdate({ age_from: Number(e.target.value || 0) })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">To</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={data.age_to}
                disabled={disabled}
                onChange={(e) => onUpdate({ age_to: Number(e.target.value || 0) })}
                className="h-8"
              />
            </div>
          </div>
          {error && (error.age || error.overlap) && (
            <div className="text-[11px] text-destructive space-x-2">
              {error.age && <span>{error.age}</span>}
              {error.overlap && <span>{error.overlap}</span>}
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add {scope === "rooms" ? "Rooms" : "Meals"}
        </Button>
      )}
    </div>
  );
}

function AddBandRow({
  existingLabels,
  onAdd,
}: {
  existingLabels: string[];
  onAdd: (label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const dup = trimmed.length > 0 && existingLabels.includes(trimmed.toLowerCase());
  const valid = trimmed.length > 0 && !dup;

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          setName("");
        }}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Age Band
      </Button>
    );
  }

  const commit = () => {
    if (!valid) return;
    onAdd(trimmed);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="Band label (e.g. Senior)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
        className="h-8 max-w-xs"
      />
      <Button
        type="button"
        size="sm"
        onClick={commit}
        disabled={!valid}
        title={dup ? "Label already exists" : undefined}
      >
        Add
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
      >
        Cancel
      </Button>
      {dup && <span className="text-[11px] text-destructive">Already exists</span>}
    </div>
  );
}

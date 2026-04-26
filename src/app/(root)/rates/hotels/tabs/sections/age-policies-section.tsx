"use client";

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
import { AgeBandScope, AgePolicyBand } from "@/types/contract-tab2";

export const AGE_LABEL_PRESETS = ["Adult", "Child", "Infant", "Teen", "Senior"];

export interface LocalBand extends AgePolicyBand {
  _localId: string;
}

export interface AgePoliciesLocalState {
  rooms: LocalBand[];
  meals: LocalBand[];
}

export interface BandRowError {
  age?: string; // age_from > age_to
  overlap?: string;
  duplicate?: string;
}

export type ScopeErrors = Record<string, BandRowError>;

export interface AgePoliciesErrors {
  rooms: ScopeErrors;
  meals: ScopeErrors;
}

const DEFAULT_NEW_BAND = (): Omit<LocalBand, "_localId"> => ({
  id: null,
  label: "",
  age_from: 0,
  age_to: 0,
});

const newLocalId = () => `band-${crypto.randomUUID()}`;

export const wrapBands = (bands: AgePolicyBand[]): LocalBand[] =>
  bands.map((b) => ({ ...b, _localId: newLocalId() }));

export const stripBands = (bands: LocalBand[]): AgePolicyBand[] =>
  bands.map(({ _localId: _, ...rest }) => ({
    ...rest,
    label: rest.label.trim(),
  }));

// Validation runs over a freshly-stripped scope. Returns per-row errors keyed
// by _localId (so React can render them next to the right row).
export function validateScope(local: LocalBand[]): ScopeErrors {
  const errs: ScopeErrors = {};

  // Per-row: age_from must be <= age_to.
  for (const b of local) {
    if (b.label.trim() && b.age_from > b.age_to) {
      errs[b._localId] = {
        ...(errs[b._localId] ?? {}),
        age: "age_from must be ≤ age_to",
      };
    }
  }

  // Duplicate label (case-insensitive). Mark every offender.
  const labelCounts = new Map<string, string[]>();
  for (const b of local) {
    const k = b.label.trim().toLowerCase();
    if (!k) continue;
    const arr = labelCounts.get(k) ?? [];
    arr.push(b._localId);
    labelCounts.set(k, arr);
  }
  for (const [, ids] of labelCounts) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      errs[id] = { ...(errs[id] ?? {}), duplicate: "Duplicate label" };
    }
  }

  // Overlap of [age_from, age_to]. Mark each conflicting pair.
  for (let i = 0; i < local.length; i++) {
    const a = local[i];
    if (!a.label.trim() || a.age_from > a.age_to) continue;
    for (let j = i + 1; j < local.length; j++) {
      const b = local[j];
      if (!b.label.trim() || b.age_from > b.age_to) continue;
      if (a.age_from <= b.age_to && b.age_from <= a.age_to) {
        errs[a._localId] = {
          ...(errs[a._localId] ?? {}),
          overlap: "Overlaps another band",
        };
        errs[b._localId] = {
          ...(errs[b._localId] ?? {}),
          overlap: "Overlaps another band",
        };
      }
    }
  }

  return errs;
}

interface SectionProps {
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
}: SectionProps) {
  const errors: AgePoliciesErrors = useMemo(
    () => ({
      rooms: validateScope(state.rooms),
      meals: validateScope(state.meals),
    }),
    [state]
  );

  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  const update = (scope: AgeBandScope, next: LocalBand[]) =>
    onChange({ ...state, [scope]: next });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These age bands apply to room rate pricing only. Meal plan and
        supplement age policies are configured separately.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScopePanel
          title="Rooms"
          scope="rooms"
          bands={state.rooms}
          errors={errors.rooms}
          disabled={disabled}
          onChange={(next) => update("rooms", next)}
        />
        <ScopePanel
          title="Meals"
          scope="meals"
          bands={state.meals}
          errors={errors.meals}
          disabled={disabled}
          onChange={(next) => update("meals", next)}
        />
      </div>
    </div>
  );
}

function ScopePanel({
  title,
  scope: _scope,
  bands,
  errors,
  disabled,
  onChange,
}: {
  title: string;
  scope: AgeBandScope;
  bands: LocalBand[];
  errors: ScopeErrors;
  disabled: boolean;
  onChange: (next: LocalBand[]) => void;
}) {
  const updateRow = (id: string, patch: Partial<LocalBand>) => {
    onChange(bands.map((b) => (b._localId === id ? { ...b, ...patch } : b)));
  };
  const removeRow = (id: string) => {
    onChange(bands.filter((b) => b._localId !== id));
  };
  const addRow = () => {
    onChange([...bands, { _localId: newLocalId(), ...DEFAULT_NEW_BAND() }]);
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">
            {bands.length} band{bands.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="px-3 py-2">
        {bands.length === 0 ? (
          <div className="text-xs text-muted-foreground py-3 text-center">
            No bands. Click &ldquo;Add Band&rdquo; below.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,80px,80px,32px] gap-2 text-[11px] uppercase tracking-wide text-muted-foreground px-1">
              <div>Label</div>
              <div>Age From</div>
              <div>Age To</div>
              <div />
            </div>
            {bands.map((b) => {
              const err = errors[b._localId];
              return (
                <div key={b._localId} className="space-y-1">
                  <div className="grid grid-cols-[1fr,80px,80px,32px] gap-2 items-center">
                    <LabelField
                      value={b.label}
                      disabled={disabled}
                      onChange={(label) => updateRow(b._localId, { label })}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={b.age_from}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRow(b._localId, {
                          age_from: Number(e.target.value || 0),
                        })
                      }
                      className="h-8"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={b.age_to}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRow(b._localId, {
                          age_to: Number(e.target.value || 0),
                        })
                      }
                      className="h-8"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(b._localId)}
                      disabled={disabled}
                      className="p-1 hover:bg-destructive/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Delete band"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                  {err && (err.age || err.duplicate || err.overlap) && (
                    <div className="text-[11px] text-destructive pl-1 space-x-2">
                      {err.age && <span>{err.age}</span>}
                      {err.duplicate && <span>{err.duplicate}</span>}
                      {err.overlap && <span>{err.overlap}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={disabled}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Band
          </Button>
        </div>
      </div>
    </div>
  );
}

// LABEL field: dropdown of presets if the current label is empty or in the
// preset list; otherwise a freeform text input so legacy labels survive a
// load/edit/save without forced mutation.
function LabelField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const isPreset =
    value === "" ||
    AGE_LABEL_PRESETS.some((p) => p.toLowerCase() === value.trim().toLowerCase());

  if (!isPreset) {
    return (
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8"
        placeholder="Custom label"
      />
    );
  }

  // Map current value to its canonical-cased preset for display.
  const canonical =
    AGE_LABEL_PRESETS.find((p) => p.toLowerCase() === value.trim().toLowerCase()) ??
    "";

  return (
    <Select
      value={canonical || undefined}
      onValueChange={(v) => onChange(v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-8">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {AGE_LABEL_PRESETS.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

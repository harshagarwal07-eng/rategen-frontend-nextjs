"use client";

// Taxes & Fees section. Tiered toggle exposes per-row from_amount /
// to_amount columns matching backend migration 088. Row layout uses the
// grid+divide-y pattern from transfers' taxes-editor (NOT shadcn Table)
// for visual parity.

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ContractTax, TaxRateType } from "@/types/contract-tab2";

export interface LocalTax extends Omit<ContractTax, "id"> {
  _localId: string;
}

export type TaxesLocalState = LocalTax[];

export interface TaxRowError {
  name?: string;
  rate?: string;
  tier?: string;
  overlap?: string;
}
export type TaxesErrors = Record<string, TaxRowError>;

const SECTION_LABEL_CLS =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const newLocalId = () => `tax-${crypto.randomUUID()}`;

export const wrapTaxes = (rows: ContractTax[]): TaxesLocalState =>
  rows.map((t) => ({
    _localId: newLocalId(),
    name: t.name,
    rate: t.rate,
    rate_type: t.rate_type,
    is_inclusive: !!t.is_inclusive,
    applies_to_room_category_ids: t.applies_to_room_category_ids ?? [],
    from_amount: t.from_amount ?? null,
    to_amount: t.to_amount ?? null,
  }));

// Strip drops _localId. Always sends from_amount/to_amount as explicit null
// when not set (per brief — backend treats null and undefined the same way
// so this is for wire-format clarity, not behaviour). Temp room ids in
// applies_to_room_category_ids must be remapped by the save coordinator
// BEFORE this is called for the final PUT.
export const stripTaxes = (state: TaxesLocalState): Omit<ContractTax, "id">[] =>
  state.map(({ _localId: _, ...t }) => ({
    ...t,
    name: t.name.trim(),
    from_amount: t.from_amount ?? null,
    to_amount: t.to_amount ?? null,
  }));

export function validateTaxes(
  state: TaxesLocalState,
  opts: { tieredMode?: boolean } = {}
): TaxesErrors {
  const errs: TaxesErrors = {};
  for (const t of state) {
    const e: TaxRowError = {};
    if (!t.name.trim()) e.name = "Name required";
    if (t.rate < 0) e.rate = "Rate must be ≥ 0";
    else if (t.rate_type === "percentage" && t.rate > 100) e.rate = "Percentage must be ≤ 100";

    if (opts.tieredMode) {
      const f = t.from_amount;
      const to = t.to_amount;
      if (f != null && f < 0) e.tier = "From must be ≥ 0";
      if (to != null && to <= 0) e.tier = "To must be > 0";
      if (f != null && to != null && f >= to) e.tier = "From must be < To";
    }
    errs[t._localId] = e;
  }

  if (opts.tieredMode) {
    const groups = new Map<string, LocalTax[]>();
    for (const t of state) {
      const key = `${t.name.trim().toLowerCase()}::${[...t.applies_to_room_category_ids].sort().join(",")}`;
      const arr = groups.get(key) ?? [];
      arr.push(t);
      groups.set(key, arr);
    }
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const aFrom = a.from_amount ?? Number.NEGATIVE_INFINITY;
          const aTo = a.to_amount ?? Number.POSITIVE_INFINITY;
          const bFrom = b.from_amount ?? Number.NEGATIVE_INFINITY;
          const bTo = b.to_amount ?? Number.POSITIVE_INFINITY;
          if (aFrom < bTo && bFrom < aTo) {
            errs[a._localId].overlap =
              `Tier overlaps another row of "${a.name.trim() || "(unnamed)"}"`;
            errs[b._localId].overlap =
              `Tier overlaps another row of "${b.name.trim() || "(unnamed)"}"`;
          }
        }
      }
    }
  }
  return errs;
}

const initialTieredFromState = (state: TaxesLocalState): boolean =>
  state.some((t) => t.from_amount != null || t.to_amount != null);

export interface RoomOption {
  id: string;
  label: string;
  isUnsaved: boolean;
}

interface Props {
  state: TaxesLocalState;
  onChange: (next: TaxesLocalState) => void;
  roomOptions: RoomOption[];
  disabled?: boolean;
  onErrorsChange?: (errors: TaxesErrors) => void;
  onTieredModeChange?: (tieredMode: boolean) => void;
}

export default function TaxesSection({
  state,
  onChange,
  roomOptions,
  disabled = false,
  onErrorsChange,
  onTieredModeChange,
}: Props) {
  const [tieredMode, setTieredMode] = useState<boolean>(() =>
    initialTieredFromState(state)
  );
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => {
    onTieredModeChange?.(tieredMode);
  }, [tieredMode, onTieredModeChange]);

  const errors = useMemo(
    () => validateTaxes(state, { tieredMode }),
    [state, tieredMode]
  );
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  const tierDataRowCount = useMemo(
    () => state.filter((t) => t.from_amount != null || t.to_amount != null).length,
    [state]
  );

  const handleToggle = (next: boolean) => {
    if (next) {
      setTieredMode(true);
      return;
    }
    if (tierDataRowCount > 0) {
      setConfirmOff(true);
      return;
    }
    setTieredMode(false);
  };

  const confirmDisableTier = () => {
    onChange(
      state.map((t) => ({ ...t, from_amount: null, to_amount: null }))
    );
    setTieredMode(false);
    setConfirmOff(false);
  };

  const updateRow = (id: string, patch: Partial<LocalTax>) =>
    onChange(state.map((t) => (t._localId === id ? { ...t, ...patch } : t)));
  const removeRow = (id: string) =>
    onChange(state.filter((t) => t._localId !== id));
  const addRow = () =>
    onChange([
      ...state,
      {
        _localId: newLocalId(),
        name: "",
        rate: 0,
        rate_type: "percentage",
        is_inclusive: false,
        applies_to_room_category_ids: [],
        from_amount: null,
        to_amount: null,
      },
    ]);

  // Grid columns. Without tier mode: Name | Rate | Type | Inclusive | Applies | delete.
  // With tier mode: insert From + To after Inclusive.
  const cols = tieredMode
    ? "minmax(140px,1fr) 80px 100px 130px 90px 90px 160px 32px"
    : "minmax(140px,1fr) 80px 100px 140px 180px 32px";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-muted-foreground/80 max-w-md">
            Per-contract taxes applied on top of room rates. Tiered mode lets a
            single tax (e.g. India GST) carry different rates per per-night
            band.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={tieredMode}
              onCheckedChange={handleToggle}
              disabled={disabled}
              aria-label="Enable tiered rates"
            />
            Tiered rates
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={disabled}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Tax/Fee
          </Button>
        </div>
      </div>

      {state.length === 0 ? (
        <div className="rounded-md border-2 border-dashed border-border py-5 text-center">
          <p className="text-xs text-muted-foreground">No taxes defined.</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Click &ldquo;Add Tax/Fee&rdquo; to start.
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <div
            className="grid items-center bg-muted/40 border-b px-3 py-1.5 gap-x-3"
            style={{ gridTemplateColumns: cols }}
          >
            <span className={SECTION_LABEL_CLS}>Name</span>
            <span className={SECTION_LABEL_CLS}>Rate</span>
            <span className={SECTION_LABEL_CLS}>Type</span>
            <span className={SECTION_LABEL_CLS}>Inclusive</span>
            {tieredMode && (
              <>
                <span className={SECTION_LABEL_CLS}>From</span>
                <span className={SECTION_LABEL_CLS}>To</span>
              </>
            )}
            <span className={SECTION_LABEL_CLS}>Applies to</span>
            <span />
          </div>
          <div className="divide-y">
            {state.map((t) => {
              const e = errors[t._localId];
              return (
                <div key={t._localId} className="px-3 py-2">
                  <div
                    className="grid items-center gap-x-3"
                    style={{ gridTemplateColumns: cols }}
                  >
                    <Input
                      type="text"
                      value={t.name}
                      disabled={disabled}
                      onChange={(ev) => updateRow(t._localId, { name: ev.target.value })}
                      placeholder="e.g. GST"
                      className="h-7 text-xs"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      max={t.rate_type === "percentage" ? 100 : undefined}
                      value={t.rate}
                      disabled={disabled}
                      onChange={(ev) =>
                        updateRow(t._localId, {
                          rate: Math.max(0, Number(ev.target.value || 0)),
                        })
                      }
                      placeholder="0"
                      className="h-7 text-xs"
                    />
                    <Select
                      value={t.rate_type}
                      onValueChange={(v) =>
                        updateRow(t._localId, { rate_type: v as TaxRateType })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage" className="text-xs">
                          Percentage (%)
                        </SelectItem>
                        <SelectItem value="fixed" className="text-xs">
                          Fixed (amount)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.is_inclusive}
                        disabled={disabled}
                        onCheckedChange={(v) =>
                          updateRow(t._localId, { is_inclusive: !!v })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {t.is_inclusive ? "Inclusive" : "Exclusive"}
                      </span>
                    </div>
                    {tieredMode && (
                      <>
                        <Input
                          type="number"
                          min={0}
                          value={t.from_amount ?? ""}
                          disabled={disabled}
                          placeholder="Min"
                          onChange={(ev) => {
                            const raw = ev.target.value;
                            updateRow(t._localId, {
                              from_amount: raw === "" ? null : Math.max(0, Number(raw)),
                            });
                          }}
                          className="h-7 text-xs"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={t.to_amount ?? ""}
                          disabled={disabled}
                          placeholder="Max"
                          onChange={(ev) => {
                            const raw = ev.target.value;
                            updateRow(t._localId, {
                              to_amount: raw === "" ? null : Math.max(0, Number(raw)),
                            });
                          }}
                          className="h-7 text-xs"
                        />
                      </>
                    )}
                    <AppliesToPicker
                      value={t.applies_to_room_category_ids}
                      options={roomOptions}
                      disabled={disabled}
                      onChange={(ids) =>
                        updateRow(t._localId, { applies_to_room_category_ids: ids })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(t._localId)}
                      disabled={disabled}
                      className="flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Delete tax"
                      aria-label="Delete tax"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {(e?.name || e?.rate || e?.tier || e?.overlap) && (
                    <p className="mt-1 text-[10px] text-destructive">
                      {[e.name, e.rate, e.tier, e.overlap]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable tiered rates?</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling tiered rates will clear From/To values on{" "}
              <strong>{tierDataRowCount}</strong> tax row
              {tierDataRowCount === 1 ? "" : "s"}. This change is local until
              you click Save All Changes. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableTier}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AppliesToPicker({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string[];
  options: RoomOption[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const validIds = useMemo(() => {
    const known = new Set(options.map((o) => o.id));
    return value.filter((v) => known.has(v));
  }, [value, options]);

  const display = useMemo(() => {
    if (validIds.length === 0) return "All rooms";
    if (validIds.length === options.length) return "All rooms";
    if (validIds.length === 1) {
      const o = options.find((opt) => opt.id === validIds[0]);
      return o?.label ?? "1 room";
    }
    return `${validIds.length} rooms`;
  }, [validIds, options]);

  const toggle = (id: string) => {
    onChange(
      validIds.includes(id) ? validIds.filter((v) => v !== id) : [...validIds, id]
    );
  };
  const clearAll = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 w-full justify-between font-normal text-xs",
            validIds.length === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {options.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2">
            Add a room category first.
          </div>
        ) : (
          <>
            <button
              type="button"
              className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded"
              onClick={() => {
                clearAll();
                setOpen(false);
              }}
            >
              All rooms
            </button>
            <div className="h-px bg-border my-1" />
            <div className="max-h-64 overflow-y-auto">
              {options.map((o) => {
                const checked = validIds.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(o.id)}
                    />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.isUnsaved && (
                      <span className="text-[10px] text-muted-foreground">unsaved</span>
                    )}
                  </label>
                );
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContractTax, TaxRateType } from "@/types/contract-tab2";

export interface LocalTax extends Omit<ContractTax, "id"> {
  _localId: string;
}

export type TaxesLocalState = LocalTax[];

export interface TaxRowError {
  name?: string;
  rate?: string;
}
export type TaxesErrors = Record<string, TaxRowError>;

const newLocalId = () => `tax-${crypto.randomUUID()}`;

export const wrapTaxes = (rows: ContractTax[]): TaxesLocalState =>
  rows.map((t) => ({
    _localId: newLocalId(),
    name: t.name,
    rate: t.rate,
    rate_type: t.rate_type,
    is_inclusive: !!t.is_inclusive,
    applies_to_room_category_ids: t.applies_to_room_category_ids ?? [],
  }));

// Strip drops _localId. The applies_to_room_category_ids array is passed
// through as-is — temp room ids must be remapped to real ids by the save
// coordinator BEFORE this is called for the final PUT.
export const stripTaxes = (state: TaxesLocalState): Omit<ContractTax, "id">[] =>
  state.map(({ _localId: _, ...t }) => ({ ...t, name: t.name.trim() }));

export function validateTaxes(state: TaxesLocalState): TaxesErrors {
  const errs: TaxesErrors = {};
  for (const t of state) {
    const e: TaxRowError = {};
    if (!t.name.trim()) e.name = "Name required";
    if (t.rate < 0) e.rate = "Rate must be ≥ 0";
    else if (t.rate_type === "percentage" && t.rate > 100) e.rate = "Percentage must be ≤ 100";
    errs[t._localId] = e;
  }
  return errs;
}

export interface RoomOption {
  id: string; // real server id OR temp _localId for unsaved rooms
  label: string; // "Deluxe" or "Deluxe (unsaved)"
  isUnsaved: boolean;
}

interface Props {
  state: TaxesLocalState;
  onChange: (next: TaxesLocalState) => void;
  roomOptions: RoomOption[];
  disabled?: boolean;
  onErrorsChange?: (errors: TaxesErrors) => void;
}

export default function TaxesSection({
  state,
  onChange,
  roomOptions,
  disabled = false,
  onErrorsChange,
}: Props) {
  const errors = useMemo(() => validateTaxes(state), [state]);
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

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
      },
    ]);

  if (state.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No taxes or fees defined. Click &ldquo;+ Add Tax/Fee&rdquo; to start.
        </div>
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
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[28%]">Name</TableHead>
              <TableHead className="w-[100px]">Rate</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[100px]">Inclusive</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.map((t) => {
              const e = errors[t._localId];
              return (
                <TableRow key={t._localId}>
                  <TableCell>
                    <Input
                      value={t.name}
                      disabled={disabled}
                      onChange={(ev) => updateRow(t._localId, { name: ev.target.value })}
                      className="h-8"
                      placeholder="e.g. GST"
                    />
                    {e?.name && (
                      <div className="text-[11px] text-destructive mt-1">{e.name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={t.rate_type === "percentage" ? 100 : undefined}
                      value={t.rate}
                      disabled={disabled}
                      onChange={(ev) =>
                        updateRow(t._localId, {
                          rate: Math.max(0, Number(ev.target.value || 0)),
                        })
                      }
                      className="h-8"
                    />
                    {e?.rate && (
                      <div className="text-[11px] text-destructive mt-1">{e.rate}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={t.rate_type}
                      onValueChange={(v) =>
                        updateRow(t._localId, { rate_type: v as TaxRateType })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={t.is_inclusive}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        updateRow(t._localId, { is_inclusive: !!v })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <AppliesToPicker
                      value={t.applies_to_room_category_ids}
                      options={roomOptions}
                      disabled={disabled}
                      onChange={(ids) =>
                        updateRow(t._localId, {
                          applies_to_room_category_ids: ids,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => removeRow(t._localId)}
                      disabled={disabled}
                      className="p-1 hover:bg-destructive/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Delete tax"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
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

  // Drop ids that no longer exist in options (e.g. a referenced unsaved room
  // got deleted) so the displayed selection matches reality.
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
          className="h-8 w-full justify-between font-normal"
        >
          <span className="truncate">{display}</span>
          <ChevronDown className="h-3.5 w-3.5 ml-2 opacity-50" />
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
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm"
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

"use client";

// Add-on age policy band editor — RESTRICTED to a fixed preset of band
// names. Unlike tours, transfers do not allow free-text band names; the
// only allowed values are the six PRESET_NAMES. The Select dropdown
// disables names already chosen by another row in the same addon so a
// band cannot be duplicated. Ages and ordering remain editable.

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
import { Plus, Trash2 } from "lucide-react";
import { TransferAddonAgePolicyBand } from "@/types/transfers";

export const PRESET_BAND_NAMES = [
  "Adult",
  "Child",
  "Infant",
  "Teenager",
  "Senior",
  "Youth",
] as const;

export type AddonAgeBandRow = TransferAddonAgePolicyBand & {
  _key: string;
};

export function bandsToAddonRows(
  bands: TransferAddonAgePolicyBand[],
): AddonAgeBandRow[] {
  return bands.map((b, i) => ({
    ...b,
    _key: b.id ?? `band-${i}-${Math.random()}`,
  }));
}

export function addonRowsToBands(
  rows: AddonAgeBandRow[],
): TransferAddonAgePolicyBand[] {
  return rows.map((r, i) => ({
    band_name: r.band_name.trim(),
    age_from: Number(r.age_from),
    age_to: Number(r.age_to),
    band_order: i,
  }));
}

/** Pick the first PRESET name not already used by any row. */
function firstAvailablePreset(rows: AddonAgeBandRow[]): string {
  const used = new Set(rows.map((r) => r.band_name));
  return PRESET_BAND_NAMES.find((n) => !used.has(n)) ?? "";
}

interface AddonAgePolicySectionProps {
  rows: AddonAgeBandRow[];
  onChange: (rows: AddonAgeBandRow[]) => void;
}

export default function AddonAgePolicySection({
  rows,
  onChange,
}: AddonAgePolicySectionProps) {
  function updateRow(key: string, patch: Partial<AddonAgeBandRow>) {
    onChange(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const next = firstAvailablePreset(rows);
    onChange([
      ...rows,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        band_name: next,
        age_from: 0,
        age_to: 99,
        band_order: rows.length,
      },
    ]);
  }

  function deleteRow(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }

  const allUsed = PRESET_BAND_NAMES.every((n) =>
    rows.some((r) => r.band_name === n),
  );

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Age Policy
      </p>
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-44">Band name</TableHead>
            <TableHead className="w-24 text-center">Age from</TableHead>
            <TableHead className="w-24 text-center">Age to</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-4 text-center text-xs text-muted-foreground"
              >
                No age bands. Click &quot;Add Band&quot; to define one.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => {
            const usedByOthers = new Set(
              rows.filter((r) => r._key !== row._key).map((r) => r.band_name),
            );
            return (
              <TableRow
                key={row._key}
                className={idx % 2 === 1 ? "bg-muted/30" : ""}
              >
                <TableCell className="py-1.5 pr-2">
                  <Select
                    value={row.band_name || "__placeholder__"}
                    onValueChange={(v) => updateRow(row._key, { band_name: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select band…" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* If existing data has a non-preset name, keep it
                          selectable so the row stays valid. */}
                      {row.band_name &&
                        !PRESET_BAND_NAMES.includes(
                          row.band_name as (typeof PRESET_BAND_NAMES)[number],
                        ) && (
                          <SelectItem
                            value={row.band_name}
                            className="text-xs italic"
                          >
                            {row.band_name}
                          </SelectItem>
                        )}
                      {PRESET_BAND_NAMES.map((n) => (
                        <SelectItem
                          key={n}
                          value={n}
                          className="text-xs"
                          disabled={usedByOthers.has(n)}
                        >
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={row.age_from}
                    onChange={(e) =>
                      updateRow(row._key, {
                        age_from: Number(e.target.value),
                      })
                    }
                    className="h-7 text-center text-xs"
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    value={row.age_to}
                    onChange={(e) =>
                      updateRow(row._key, { age_to: Number(e.target.value) })
                    }
                    className="h-7 text-center text-xs"
                  />
                </TableCell>
                <TableCell className="py-1.5 pl-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRow(row._key)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={addRow}
          disabled={allUsed}
          title={allUsed ? "All preset bands are in use" : undefined}
        >
          <Plus className="h-3 w-3" /> Add Band
        </Button>
      </div>
    </div>
  );
}

"use client";

// Add-on age policy band editor — mirrors the package-side
// AgePolicySection but operates on `TourAddonAgePolicyBand` rows.
// The shape is identical so the UI is essentially the same; we keep
// it forked to preserve the typed `addon_id`/`band_order` field path.

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
import { TourAddonAgePolicyBand } from "@/types/tours";

const PRESET_NAMES = ["Adult", "Child", "Infant", "Teenager", "Senior", "Youth"];

export type AddonAgeBandRow = TourAddonAgePolicyBand & {
  _key: string;
  _useCustomName: boolean;
};

export function bandsToAddonRows(
  bands: TourAddonAgePolicyBand[],
): AddonAgeBandRow[] {
  return bands.map((b, i) => ({
    ...b,
    _key: b.id ?? `band-${i}-${Math.random()}`,
    _useCustomName: !PRESET_NAMES.includes(b.band_name),
  }));
}

export function addonRowsToBands(
  rows: AddonAgeBandRow[],
): TourAddonAgePolicyBand[] {
  return rows.map((r, i) => ({
    band_name: r.band_name.trim(),
    age_from: Number(r.age_from),
    age_to: Number(r.age_to),
    band_order: i,
  }));
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

  function handlePreset(key: string, value: string) {
    if (value === "__custom__")
      updateRow(key, { band_name: "", _useCustomName: true });
    else updateRow(key, { band_name: value, _useCustomName: false });
  }

  function addRow() {
    onChange([
      ...rows,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        band_name: "",
        age_from: 0,
        age_to: 99,
        band_order: rows.length,
        _useCustomName: false,
      },
    ]);
  }

  function deleteRow(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }

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
          {rows.map((row, idx) => (
            <TableRow
              key={row._key}
              className={idx % 2 === 1 ? "bg-muted/30" : ""}
            >
              <TableCell className="py-1.5 pr-2">
                {row._useCustomName ? (
                  <Input
                    autoFocus
                    value={row.band_name}
                    onChange={(e) =>
                      updateRow(row._key, { band_name: e.target.value })
                    }
                    placeholder="Band name"
                    className="h-7 text-xs"
                  />
                ) : (
                  <Select
                    value={row.band_name || "__placeholder__"}
                    onValueChange={(v) => handlePreset(row._key, v)}
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
                )}
              </TableCell>
              <TableCell className="py-1.5 px-2">
                <Input
                  type="number"
                  min={0}
                  max={150}
                  value={row.age_from}
                  onChange={(e) =>
                    updateRow(row._key, { age_from: Number(e.target.value) })
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
          ))}
        </TableBody>
      </Table>
      <div className="mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={addRow}
        >
          <Plus className="h-3 w-3" /> Add Band
        </Button>
      </div>
    </div>
  );
}

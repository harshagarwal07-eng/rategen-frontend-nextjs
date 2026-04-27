"use client";

// Master-vehicle list editor. Lists all vehicle_types for the current
// DMC; each row is inline-editable (label, brand, max pax / pax+lug /
// luggage). Save is per-row. Delete asks for confirm; backend rejects
// when the row is FK-referenced and we surface that as a toast.

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import http from "@/lib/api";

export type VehicleType = {
  id: string;
  brand: string | null;
  code: string;
  label: string;
  pax_capacity: number | null;
  has_luggage_variant: boolean;
  pax_capacity_with_luggage: number | null;
  luggage_capacity: number | null;
};

type EditableRow = VehicleType & { _dirty: boolean; _saving: boolean };

interface EditVehiclesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called whenever a row is saved or deleted so callers can refresh caches. */
  onChanged: (next: VehicleType[]) => void;
}

function asString(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}
function asNullNum(s: string): number | null {
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export default function EditVehiclesDialog({
  isOpen,
  onClose,
  onChanged,
}: EditVehiclesDialogProps) {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<EditableRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    http
      .get<VehicleType[]>("/api/geo/vehicle-types")
      .then((res) => {
        if (cancelled) return;
        if (
          res &&
          typeof res === "object" &&
          "error" in res &&
          (res as { error?: unknown }).error
        ) {
          toast.error(`Could not load vehicles: ${String((res as { error: unknown }).error)}`);
          setRows([]);
          return;
        }
        const data = (res as VehicleType[]) ?? [];
        setRows(data.map((v) => ({ ...v, _dirty: false, _saving: false })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  function publish(next: EditableRow[]) {
    setRows(next);
    onChanged(next.map(({ _dirty, _saving, ...v }) => v));
  }

  function patchRow(id: string, patch: Partial<VehicleType>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, _dirty: true } : r)),
    );
  }

  async function saveRow(row: EditableRow) {
    if (row._saving) return;
    if (!row.label.trim()) {
      toast.error("Vehicle type name is required.");
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, _saving: true } : r)),
    );
    const payload = {
      label: row.label.trim(),
      name: row.label.trim(),
      brand: row.brand?.trim() ?? null,
      pax_capacity: row.pax_capacity,
      pax_capacity_with_luggage: row.pax_capacity_with_luggage,
      luggage_capacity: row.luggage_capacity,
    };
    const raw = await http.patch<VehicleType>(
      `/api/geo/vehicle-types/${row.id}`,
      payload,
    );
    if (
      raw &&
      typeof raw === "object" &&
      "error" in raw &&
      (raw as { error?: unknown }).error
    ) {
      toast.error(`Save failed: ${String((raw as { error: unknown }).error)}`);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, _saving: false } : r)),
      );
      return;
    }
    const updated = raw as unknown as VehicleType;
    const next = rows.map((r) =>
      r.id === row.id ? { ...updated, _dirty: false, _saving: false } : r,
    );
    publish(next);
    toast.success(`Saved "${updated.label}".`);
  }

  async function doDelete(row: EditableRow) {
    setDeleting(true);
    const raw = await http.delete<{ deleted: boolean }>(
      `/api/geo/vehicle-types/${row.id}`,
    );
    if (
      raw &&
      typeof raw === "object" &&
      "error" in raw &&
      (raw as { error?: unknown }).error
    ) {
      const msg = String((raw as { error: unknown }).error);
      // FK violations come through as a Postgres error string. Show a
      // friendly message so the user knows why delete was blocked.
      const referenced = /foreign key|violates|referenced/i.test(msg);
      toast.error(
        referenced
          ? `"${row.label}" is in use by a tour or transfer and can't be deleted.`
          : `Delete failed: ${msg}`,
      );
      setDeleting(false);
      setConfirmDelete(null);
      return;
    }
    const next = rows.filter((r) => r.id !== row.id);
    publish(next);
    toast.success(`Deleted "${row.label}".`);
    setDeleting(false);
    setConfirmDelete(null);
  }

  function handleClose() {
    if (rows.some((r) => r._saving) || deleting) return;
    setConfirmDelete(null);
    onClose();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Master Vehicle List</DialogTitle>
            <DialogDescription>
              Edit or delete vehicles for this DMC. Changes apply to every tour
              and transfer that uses them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No vehicles yet. Use &quot;+ Add Vehicle&quot; from a rate row to
                create one.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_64px_64px_64px_72px] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Vehicle Type</span>
                  <span>Brand</span>
                  <span>Max Pax</span>
                  <span>Max w/Lug</span>
                  <span>Max Lug</span>
                  <span />
                </div>
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_64px_64px_64px_72px] gap-2 items-center"
                  >
                    <Input
                      value={row.label}
                      onChange={(e) => patchRow(row.id, { label: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Sedan…"
                    />
                    <Input
                      value={row.brand ?? ""}
                      onChange={(e) =>
                        patchRow(row.id, { brand: e.target.value || null })
                      }
                      className="h-7 text-xs"
                      placeholder="Toyota Camry…"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={asString(row.pax_capacity)}
                      onChange={(e) =>
                        patchRow(row.id, { pax_capacity: asNullNum(e.target.value) })
                      }
                      className="h-7 text-xs"
                      placeholder="—"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={asString(row.pax_capacity_with_luggage)}
                      onChange={(e) =>
                        patchRow(row.id, {
                          pax_capacity_with_luggage: asNullNum(e.target.value),
                        })
                      }
                      className="h-7 text-xs"
                      placeholder="—"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={asString(row.luggage_capacity)}
                      onChange={(e) =>
                        patchRow(row.id, {
                          luggage_capacity: asNullNum(e.target.value),
                        })
                      }
                      className="h-7 text-xs"
                      placeholder="—"
                    />
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={!row._dirty || row._saving}
                        className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30"
                        title="Save"
                      >
                        {row._saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(row)}
                        disabled={row._saving}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && !deleting && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete vehicle?</DialogTitle>
            <DialogDescription>
              {confirmDelete ? (
                <>
                  Permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {confirmDelete.label}
                  </span>
                  ? If any tour or transfer references this vehicle, the delete
                  will be blocked.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirmDelete && doDelete(confirmDelete)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

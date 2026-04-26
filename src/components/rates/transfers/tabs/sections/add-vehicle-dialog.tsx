"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import http from "@/lib/api";

export type CreatedVehicle = {
  id: string;
  brand: string | null;
  code: string;
  label: string;
  pax_capacity: number | null;
  has_luggage_variant: boolean;
  pax_capacity_with_luggage: number | null;
  luggage_capacity: number | null;
};

interface AddVehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (vehicle: CreatedVehicle) => void;
}

const EMPTY = {
  vehicle_type: "",
  brand: "",
  max_pax: "",
  max_pax_with_luggage: "",
  max_luggage: "",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function AddVehicleDialog({
  isOpen,
  onClose,
  onCreated,
}: AddVehicleDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    if (submitting) return;
    setForm(EMPTY);
    onClose();
  }

  const isValid =
    form.vehicle_type.trim() !== "" &&
    form.brand.trim() !== "" &&
    form.max_pax !== "" &&
    form.max_pax_with_luggage !== "" &&
    form.max_luggage !== "";

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    const label = form.vehicle_type.trim();
    const code = `${slugify(label)}_${Date.now().toString(36)}`;
    const payload = {
      code,
      label,
      name: label,
      brand: form.brand.trim(),
      pax_capacity: Number(form.max_pax),
      pax_capacity_with_luggage: Number(form.max_pax_with_luggage),
      luggage_capacity: Number(form.max_luggage),
      has_luggage_variant: true,
    };
    const raw = await http.post<CreatedVehicle>("/api/geo/vehicle-types", payload);
    if (
      raw &&
      typeof raw === "object" &&
      "error" in raw &&
      (raw as { error?: unknown }).error
    ) {
      const msg = String((raw as { error: unknown }).error);
      toast.error(`Could not create vehicle: ${msg}`);
      setSubmitting(false);
      return;
    }
    const created = raw as unknown as CreatedVehicle;
    toast.success(`Vehicle "${label}" added.`);
    setSubmitting(false);
    setForm(EMPTY);
    onCreated(created);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
          <DialogDescription>
            Create a new vehicle for this DMC. It becomes available across all transfers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Vehicle Type<span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              value={form.vehicle_type}
              onChange={(e) => set("vehicle_type", e.target.value)}
              placeholder="Sedan, SUV, Coach…"
              autoFocus
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Brand<span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Toyota Camry, Mercedes V-Class…"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Max Pax<span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.max_pax}
                onChange={(e) => set("max_pax", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Max w/Luggage<span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.max_pax_with_luggage}
                onChange={(e) => set("max_pax_with_luggage", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Max Luggage<span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.max_luggage}
                onChange={(e) => set("max_luggage", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…
              </>
            ) : (
              "Add Vehicle"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

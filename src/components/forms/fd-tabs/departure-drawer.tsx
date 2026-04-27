"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  DepartureForm,
  formatDateDisplay,
  validateDepartureForm,
  type DepartureFormErrors,
  type DepartureFormState,
} from "./departure-form";
import {
  departureToFormState,
  emptyDepartureFormState,
} from "./departure-state";
import { saveDeparture } from "./save-departure";
import type { RateSource } from "./departure-pricing-section";
import type { FDAddon, FDAgePolicy, FDDeparture } from "@/types/fixed-departures";
import type { CommissionCopyTarget } from "./copy-commissions-sheet";
import type { CommissionState } from "./departure-commission-section";

type DrawerMode =
  | { kind: "create"; initialDate?: string }
  | { kind: "edit"; departure: FDDeparture };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageDuration: number;
  currency: string | null;
  addons: FDAddon[];
  packageBands?: FDAgePolicy[];
  rateSources?: RateSource[];
  flightGroups?: string[];
  commissionCopyTargets?: CommissionCopyTarget[];
  onCopyCommissionToTargets?: (targetIds: string[], state: CommissionState) => Promise<void>;
  mode: DrawerMode | null;
  onSaved: (saved: FDDeparture) => void;
}

export function DepartureDrawer({
  open,
  onOpenChange,
  packageId,
  packageDuration,
  currency,
  addons,
  packageBands,
  rateSources,
  flightGroups,
  commissionCopyTargets,
  onCopyCommissionToTargets,
  mode,
  onSaved,
}: Props) {
  const initialState = useMemo<DepartureFormState | null>(() => {
    if (!mode) return null;
    if (mode.kind === "edit") return departureToFormState(mode.departure);
    return emptyDepartureFormState(packageDuration, mode.initialDate);
  }, [mode, packageDuration]);

  const [state, setState] = useState<DepartureFormState | null>(initialState);
  const [errors, setErrors] = useState<DepartureFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  // Reset state whenever the drawer opens with a new mode
  useEffect(() => {
    if (open) {
      setState(initialState);
      setErrors({});
    }
  }, [open, initialState]);

  const isDirty = useMemo(() => {
    if (!state || !initialState) return false;
    return JSON.stringify(state) !== JSON.stringify(initialState);
  }, [state, initialState]);

  const updateState = (patch: Partial<DepartureFormState>) => {
    setState((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const requestClose = () => {
    if (isDirty && !isSaving) {
      setShowDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const confirmDiscard = () => {
    setShowDiscard(false);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!state) return;
    const validation = validateDepartureForm(state);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      const first = Object.values(validation)[0] ?? "Invalid form";
      toast.error(first);
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const result = await saveDeparture({
        packageId,
        state,
        existingId: mode?.kind === "edit" ? mode.departure.id : undefined,
        addons,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode?.kind === "edit" ? "Departure updated" : "Departure created");
      onSaved(result.saved);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const title =
    mode?.kind === "edit"
      ? `Edit Departure — ${formatDateDisplay(mode.departure.departure_date)}`
      : "New Departure";

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) requestClose();
          else onOpenChange(true);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-[640px] p-0 gap-0 flex flex-col"
          onInteractOutside={(e) => {
            if (isDirty || isSaving) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isSaving) e.preventDefault();
          }}
        >
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {state ? (
              <DepartureForm
                flightGroups={flightGroups}
                value={state}
                onChange={updateState}
                errors={errors}
                currency={currency}
                addons={addons}
                packageBands={packageBands}
                rateSources={rateSources}
                excludeSourceId={mode?.kind === "edit" ? mode.departure.id : undefined}
                commissionCopyTargets={(commissionCopyTargets ?? []).filter(
                  (t) => mode?.kind !== "edit" || t.id !== mode.departure.id,
                )}
                onCopyCommissionToTargets={onCopyCommissionToTargets}
              />
            ) : (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
          </div>

          <SheetFooter className="border-t flex-row justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !state}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscard} onOpenChange={setShowDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits to this departure. Discard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

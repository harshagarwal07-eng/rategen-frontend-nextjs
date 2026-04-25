"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type DepartureFormState,
  DepartureForm,
  formatDateDisplay,
  formatStatusLabel,
  validateDepartureForm,
  type DepartureFormErrors,
} from "./departure-form";
import { saveDeparture, type DepartureSaveResult } from "./save-departure";
import type { FDAddon, FDAgePolicy } from "@/types/fixed-departures";

export interface DraftDeparture {
  _localId: string;
  _isNew: boolean;
  _dirty: boolean;
  // Snapshot of `state` at hydration / last successful save. Used by the
  // parent's value-comparison dirty calc so type-then-revert clears `_dirty`.
  _orig?: DepartureFormState;
  id?: string;
  state: DepartureFormState;
}

export type DepartureRowSaveResult = DepartureSaveResult;

export type DepartureRowHandle = {
  save: () => Promise<DepartureRowSaveResult>;
  isDirty: () => boolean;
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  planned: "bg-muted text-muted-foreground border-muted-foreground/20",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const loggedUnknownStatuses = new Set<string>();

function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return STATUS_BADGE_VARIANT.planned;
  const cls = STATUS_BADGE_VARIANT[status];
  if (!cls) {
    if (!loggedUnknownStatuses.has(status)) {
      loggedUnknownStatuses.add(status);
      // eslint-disable-next-line no-console
      console.warn(`[FD] Unknown departure_status: ${status}`);
    }
    return STATUS_BADGE_VARIANT.planned;
  }
  return cls;
}

function formatRate(value: number | null, currency: string | null): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${formatted}` : formatted;
}

interface Props {
  packageId: string;
  draft: DraftDeparture;
  defaultOpen: boolean;
  isPast: boolean;
  currency: string | null;
  addons: FDAddon[];
  packageBands?: FDAgePolicy[];
  onChange: (patch: Partial<DepartureFormState>) => void;
  onDeleteRequest: () => void;
}

export const DepartureRow = forwardRef<DepartureRowHandle, Props>(function DepartureRow(
  { packageId, draft, defaultOpen, isPast, currency, addons, packageBands, onChange, onDeleteRequest },
  ref,
) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [errors, setErrors] = useState<DepartureFormErrors>({});

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useImperativeHandle(ref, () => ({
    isDirty: () => !!draftRef.current._dirty || draftRef.current._isNew,
    save: async (): Promise<DepartureRowSaveResult> => {
      const d = draftRef.current;
      const validationErrors = validateDepartureForm(d.state);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setIsOpen(true);
        const first = Object.values(validationErrors)[0] ?? "Invalid form";
        return { success: false, error: first };
      }
      setErrors({});
      return saveDeparture({
        packageId,
        state: d.state,
        existingId: d._isNew ? undefined : d.id,
        addons,
      });
    },
  }));

  const doubleRate = draft.state.pricing.rate_double;
  const seatsLabel = `${draft.state.seats_sold ?? 0} / ${draft.state.total_seats ?? 0}`;

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-muted bg-accent/30 overflow-hidden",
        isPast && "opacity-60",
      )}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-accent/40 transition-colors cursor-pointer"
        onClick={() => setIsOpen((v) => !v)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((v) => !v);
          }}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")}
          />
        </button>

        <div className="flex flex-1 items-center gap-3 min-w-0 text-sm">
          {(draft._dirty || draft._isNew) && (
            <span
              className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
              aria-label="Unsaved changes"
            />
          )}
          <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr_0.7fr_1fr] gap-3 flex-1 items-center min-w-0">
            <span className={cn(!draft.state.departure_date && "text-muted-foreground italic")}>
              {draft.state.departure_date
                ? formatDateDisplay(draft.state.departure_date)
                : "(no date)"}
            </span>
            <span className="text-muted-foreground">{formatDateDisplay(draft.state.return_date)}</span>
            <span className="text-muted-foreground">{formatDateDisplay(draft.state.cutoff_date)}</span>
            <Badge
              variant="outline"
              className={statusBadgeClass(draft.state.departure_status)}
            >
              {formatStatusLabel(draft.state.departure_status) || "—"}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {formatStatusLabel(draft.state.availability_status) || "—"}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{seatsLabel}</span>
            <span className="text-xs font-medium tabular-nums">
              {formatRate(doubleRate, currency)}
            </span>
          </div>
        </div>

        {!isPast && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest();
            }}
            title="Delete departure"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="border-t bg-background p-4">
          <DepartureForm
            value={draft.state}
            onChange={onChange}
            errors={errors}
            currency={currency}
            addons={addons}
            packageBands={packageBands}
          />
        </div>
      )}
    </div>
  );
});

DepartureRow.displayName = "DepartureRow";

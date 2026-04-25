"use client";

import { addDays, format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DeparturePricingSection,
  type LandPricingState,
} from "./departure-pricing-section";
import {
  DepartureAddonPricingSection,
  type AddonOverrideState,
} from "./departure-addon-pricing-section";
import {
  FD_DEPARTURE_STATUSES,
  FD_AVAILABILITY_STATUSES,
  type FDAddon,
  type FDAgePolicy,
} from "@/types/fixed-departures";

export interface DepartureFormState {
  departure_date: string;
  duration: number;
  return_date: string;
  cutoff_date: string;
  cutoff_overridden: boolean;
  total_seats: number | null;
  seats_sold: number | null;
  seats_on_hold: number | null;
  min_pax: number | null;
  max_pax: number | null;
  departure_status: string;
  availability_status: string;
  internal_notes: string;
  pricing: LandPricingState;
  addon_overrides: AddonOverrideState[];
}

export const DEFAULT_CUTOFF_OFFSET_DAYS = 15;

export function computeReturnDate(departureDate: string, durationNights: number): string {
  if (!departureDate || !Number.isFinite(durationNights) || durationNights < 0) return "";
  try {
    return format(addDays(parseISO(departureDate), durationNights), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function computeCutoffDate(departureDate: string, offsetDays = DEFAULT_CUTOFF_OFFSET_DAYS): string {
  if (!departureDate) return "";
  try {
    return format(addDays(parseISO(departureDate), -offsetDays), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function formatStatusLabel(s: string | null | undefined): string {
  if (!s) return "";
  const spaced = s.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatDateDisplay(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return format(parseISO(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

export interface DepartureFormErrors {
  departure_date?: string;
  cutoff_date?: string;
  seats_sold?: string;
  max_pax?: string;
  duration?: string;
}

export function validateDepartureForm(state: DepartureFormState): DepartureFormErrors {
  const errors: DepartureFormErrors = {};
  if (!state.departure_date) errors.departure_date = "Departure date is required";
  if (state.duration < 1) errors.duration = "Duration must be at least 1";
  if (state.cutoff_date && state.departure_date && state.cutoff_date > state.departure_date) {
    errors.cutoff_date = "Cutoff must be on or before departure date";
  }
  if (
    state.seats_sold != null &&
    state.total_seats != null &&
    state.seats_sold > state.total_seats
  ) {
    errors.seats_sold = "Seats sold cannot exceed total seats";
  }
  if (state.max_pax != null && state.min_pax != null && state.max_pax < state.min_pax) {
    errors.max_pax = "Max pax must be ≥ min pax";
  }
  return errors;
}

interface Props {
  value: DepartureFormState;
  onChange: (patch: Partial<DepartureFormState>) => void;
  errors?: DepartureFormErrors;
  currency: string | null;
  addons: FDAddon[];
  packageBands?: FDAgePolicy[];
}

export function DepartureForm({ value, onChange, errors, currency, addons, packageBands }: Props) {
  const handleDepartureDateChange = (newDate: string) => {
    const newReturn = computeReturnDate(newDate, value.duration);
    const patch: Partial<DepartureFormState> = {
      departure_date: newDate,
      return_date: newReturn,
    };
    if (!value.cutoff_overridden) {
      patch.cutoff_date = computeCutoffDate(newDate);
    }
    onChange(patch);
  };

  const handleDurationChange = (raw: string) => {
    const n = raw === "" ? 0 : Number(raw);
    const next = Number.isFinite(n) ? Math.max(0, n) : 0;
    onChange({
      duration: next,
      return_date: computeReturnDate(value.departure_date, next),
    });
  };

  const handleCutoffChange = (newCutoff: string) => {
    onChange({
      cutoff_date: newCutoff,
      cutoff_overridden: newCutoff !== computeCutoffDate(value.departure_date),
    });
  };

  const handleResetCutoff = () => {
    onChange({
      cutoff_date: computeCutoffDate(value.departure_date),
      cutoff_overridden: false,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section 1: Departure Details */}
      <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Departure Details
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Departure Date" required error={errors?.departure_date}>
            <Input
              type="date"
              value={value.departure_date}
              onChange={(e) => handleDepartureDateChange(e.target.value)}
            />
          </Field>

          <Field label="Duration (nights)" error={errors?.duration}>
            <Input
              type="number"
              min={1}
              value={value.duration}
              onChange={(e) => handleDurationChange(e.target.value)}
            />
          </Field>

          <Field label="Return Date">
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              {formatDateDisplay(value.return_date) === "—" ? (
                <span className="italic">—</span>
              ) : (
                formatDateDisplay(value.return_date)
              )}
            </div>
          </Field>

          <Field label="Cutoff Date" error={errors?.cutoff_date}>
            <Input
              type="date"
              value={value.cutoff_date}
              onChange={(e) => handleCutoffChange(e.target.value)}
            />
            {value.cutoff_overridden && value.departure_date && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs self-start"
                onClick={handleResetCutoff}
              >
                Reset to default ({DEFAULT_CUTOFF_OFFSET_DAYS} days before)
              </Button>
            )}
          </Field>

          <Field label="Departure Status">
            <Select
              value={value.departure_status}
              onValueChange={(v) => onChange({ departure_status: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {FD_DEPARTURE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Availability Status">
            <Select
              value={value.availability_status}
              onValueChange={(v) => onChange({ availability_status: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {FD_AVAILABILITY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Total Seats">
            <Input
              type="number"
              min={0}
              value={value.total_seats ?? ""}
              onChange={(e) =>
                onChange({ total_seats: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>

          <Field label="Seats Sold" error={errors?.seats_sold}>
            <Input
              type="number"
              min={0}
              max={value.total_seats ?? undefined}
              value={value.seats_sold ?? ""}
              onChange={(e) =>
                onChange({ seats_sold: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>

          <Field label="Seats On Hold">
            <Input
              type="number"
              min={0}
              value={value.seats_on_hold ?? ""}
              onChange={(e) =>
                onChange({ seats_on_hold: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>

          <Field label="Min Pax">
            <Input
              type="number"
              min={0}
              value={value.min_pax ?? ""}
              onChange={(e) =>
                onChange({ min_pax: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>

          <Field label="Max Pax" error={errors?.max_pax}>
            <Input
              type="number"
              min={0}
              placeholder="No limit"
              value={value.max_pax ?? ""}
              onChange={(e) =>
                onChange({ max_pax: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
        </div>

        <Field label="Internal Notes">
          <Textarea
            rows={3}
            value={value.internal_notes}
            onChange={(e) => onChange({ internal_notes: e.target.value })}
            placeholder="Visible to staff only..."
          />
        </Field>
      </div>

      {/* Section 2: Land Pricing */}
      <DeparturePricingSection
        value={value.pricing}
        onChange={(patch) => onChange({ pricing: { ...value.pricing, ...patch } })}
        currency={currency}
        packageBands={packageBands}
      />

      {/* Section 3: Addon Pricing — only if package has add-ons */}
      {addons.length > 0 && (
        <DepartureAddonPricingSection
          addons={addons}
          overrides={value.addon_overrides}
          onChange={(next) => onChange({ addon_overrides: next })}
          currency={currency}
        />
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

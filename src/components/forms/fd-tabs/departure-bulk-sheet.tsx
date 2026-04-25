"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fdCreateDeparture } from "@/data-access/fixed-departures";
import {
  FD_DEPARTURE_STATUSES,
  FD_AVAILABILITY_STATUSES,
  type FDDeparture,
} from "@/types/fixed-departures";
import {
  DEFAULT_CUTOFF_OFFSET_DAYS,
  computeCutoffDate,
  computeReturnDate,
  formatDateDisplay,
} from "./departure-form";
import {
  generateDates,
  type BulkFrequency,
} from "./departure-bulk-generate";

type Frequency = BulkFrequency;

const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom (specific weekdays)",
};

// 0 = Mon, 6 = Sun (matches our calendar weekStartsOn:1 ordering)
const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const HARD_CAP = 365;
const SOFT_CAP = 100;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageDuration: number;
  existingDepartures: FDDeparture[];
  onCreated: () => void;
}

export function DepartureBulkSheet({
  open,
  onOpenChange,
  packageId,
  packageDuration,
  existingDepartures,
  onCreated,
}: Props) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [weekdays, setWeekdays] = useState<number[]>([1]); // Mon by default
  const [cutoffOffset, setCutoffOffset] = useState<number>(DEFAULT_CUTOFF_OFFSET_DAYS);
  const [duration, setDuration] = useState<number>(packageDuration);
  const [totalSeats, setTotalSeats] = useState<number>(40);
  const [departureStatus, setDepartureStatus] = useState<string>("planned");
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("available");
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<{ created: number; total: number } | null>(null);

  // Reset on each open
  useEffect(() => {
    if (open) {
      setFromDate("");
      setToDate("");
      setFrequency("weekly");
      setWeekdays([1]);
      setCutoffOffset(DEFAULT_CUTOFF_OFFSET_DAYS);
      setDuration(packageDuration);
      setTotalSeats(40);
      setDepartureStatus("planned");
      setAvailabilityStatus("available");
      setIsSaving(false);
      setProgress(null);
    }
  }, [open, packageDuration]);

  const generated = useMemo(
    () => generateDates(fromDate, toDate, frequency, weekdays),
    [fromDate, toDate, frequency, weekdays],
  );

  const existingDateSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of existingDepartures) if (d.departure_date) s.add(d.departure_date);
    return s;
  }, [existingDepartures]);

  const conflicts = useMemo(
    () => generated.filter((iso) => existingDateSet.has(iso)),
    [generated, existingDateSet],
  );
  const toCreate = useMemo(
    () => generated.filter((iso) => !existingDateSet.has(iso)),
    [generated, existingDateSet],
  );

  const rangeError = useMemo(() => {
    if (!fromDate || !toDate) return null;
    if (toDate < fromDate) return "To date must be on or after From date.";
    return null;
  }, [fromDate, toDate]);

  const customError = useMemo(() => {
    if (frequency !== "custom") return null;
    if (weekdays.length === 0) return "Select at least one weekday.";
    return null;
  }, [frequency, weekdays]);

  const overHard = generated.length > HARD_CAP;
  const overSoft = generated.length > SOFT_CAP && !overHard;

  const canSubmit =
    !rangeError &&
    !customError &&
    !overHard &&
    toCreate.length > 0 &&
    !isSaving;

  const toggleWeekday = (v: number) => {
    setWeekdays((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort(),
    );
  };

  const handleSave = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    setProgress({ created: 0, total: toCreate.length });
    let created = 0;
    let failedAt: { iso: string; error: string } | null = null;
    for (const iso of toCreate) {
      try {
        await fdCreateDeparture(packageId, {
          departure_date: iso,
          return_date: computeReturnDate(iso, duration) || null,
          cutoff_date: computeCutoffDate(iso, cutoffOffset) || null,
          total_seats: totalSeats,
          seats_sold: 0,
          seats_on_hold: 0,
          min_pax: 1,
          max_pax: null,
          departure_status: departureStatus || null,
          availability_status: availabilityStatus || null,
          internal_notes: null,
        });
        created++;
        setProgress({ created, total: toCreate.length });
      } catch (e) {
        failedAt = {
          iso,
          error: e instanceof Error ? e.message : "Create failed",
        };
        break;
      }
    }
    setIsSaving(false);
    if (failedAt) {
      toast.error(
        `Created ${created} of ${toCreate.length} departures. Failed at ${formatDateDisplay(failedAt.iso)}: ${failedAt.error}`,
      );
      // Refresh list for the partial state but keep sheet open for visibility
      onCreated();
      return;
    }
    toast.success(`Created ${created} departure${created === 1 ? "" : "s"}.`);
    onCreated();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (isSaving) return;
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => {
          if (isSaving) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSaving) e.preventDefault();
        }}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Bulk create departures</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="From date" required>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Field>
            <Field label="To date" required error={rangeError ?? undefined}>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
              />
            </Field>

            <Field label="Frequency">
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                    <SelectItem key={f} value={f}>{FREQUENCY_LABEL[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Cutoff offset (days before)">
              <Input
                type="number"
                min={0}
                value={cutoffOffset}
                onChange={(e) =>
                  setCutoffOffset(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                }
              />
            </Field>

            <Field label="Duration (nights)">
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value === "" ? 1 : Math.max(1, Number(e.target.value)))
                }
              />
            </Field>

            <Field label="Total seats per departure">
              <Input
                type="number"
                min={0}
                value={totalSeats}
                onChange={(e) =>
                  setTotalSeats(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))
                }
              />
            </Field>

            <Field label="Departure status">
              <Select value={departureStatus} onValueChange={setDepartureStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FD_DEPARTURE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Availability status">
              <Select value={availabilityStatus} onValueChange={setAvailabilityStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FD_AVAILABILITY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {frequency === "custom" && (
            <Field label="Weekdays" error={customError ?? undefined}>
              <div className="flex flex-wrap gap-3">
                {WEEKDAY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={weekdays.includes(opt.value)}
                      onCheckedChange={() => toggleWeekday(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Field>
          )}

          <div className="rounded-md border bg-muted/30 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {fromDate && toDate
                  ? `${formatDateDisplay(fromDate)} → ${formatDateDisplay(toDate)}`
                  : "Pick a date range"}
              </span>
              <span className="text-muted-foreground">
                {generated.length} {generated.length === 1 ? "departure" : "departures"}
              </span>
            </div>

            {overHard && (
              <div className="text-xs text-destructive">
                Too many dates ({generated.length}). Reduce range or change frequency — limit is {HARD_CAP}.
              </div>
            )}
            {overSoft && (
              <div className="text-xs text-amber-600">
                Heads up — generating {generated.length} departures.
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                <div className="font-medium mb-1">
                  ⚠ {conflicts.length} date{conflicts.length === 1 ? "" : "s"} already have departures and will be skipped:
                </div>
                <div className="text-amber-800/80">
                  {conflicts.slice(0, 8).map((iso) => formatDateDisplay(iso)).join(", ")}
                  {conflicts.length > 8 && ` … +${conflicts.length - 8} more`}
                </div>
              </div>
            )}

            {generated.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="dates" className="border-0">
                  <AccordionTrigger className="text-xs py-1">
                    Show all dates
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                      {generated.map((iso) => (
                        <span
                          key={iso}
                          className={
                            existingDateSet.has(iso)
                              ? "rounded border bg-amber-100 text-amber-800 border-amber-200 px-1.5 py-0.5 text-[10px] line-through"
                              : "rounded border bg-background px-1.5 py-0.5 text-[10px]"
                          }
                        >
                          {format(parseISO(iso), "MMM d")}
                        </span>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>

        <SheetFooter className="border-t flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSubmit}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress ? `Creating ${progress.created} / ${progress.total}…` : "Creating…"}
              </>
            ) : (
              `Create ${toCreate.length} departure${toCreate.length === 1 ? "" : "s"}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

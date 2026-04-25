"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  formatStatusLabel,
} from "./departure-form";
import {
  generateDates,
  type BulkFrequency,
} from "./departure-bulk-generate";

const HARD_CAP = 365;
const SOFT_CAP = 100;
const WEEK_OPTS = { weekStartsOn: 1 } as const;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FREQUENCY_LABEL: Record<BulkFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  every_weekday: "Every weekday (Mon–Fri)",
  custom: "Specific weekdays",
  monthly: "Monthly (same day-of-month)",
};

// 0=Sun..6=Sat (matches date-fns getDay)
const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  return isoDate(new Date());
}

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
  // Shared defaults applied to every created departure.
  const [cutoffOffset, setCutoffOffset] = useState<number>(DEFAULT_CUTOFF_OFFSET_DAYS);
  const [duration, setDuration] = useState<number>(packageDuration);
  const [totalSeats, setTotalSeats] = useState<number>(40);
  const [departureStatus, setDepartureStatus] = useState<string>("planned");
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("available");
  const [defaultsOpen, setDefaultsOpen] = useState(false);

  // Selected departure dates as ISO strings for stable dedup.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Calendar cursor (left-most month in the 2-month view).
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

  // Pattern popover state.
  const [patternOpen, setPatternOpen] = useState(false);
  const [patternFreq, setPatternFreq] = useState<BulkFrequency>("weekly");
  const [patternFrom, setPatternFrom] = useState("");
  const [patternTo, setPatternTo] = useState("");
  const [patternWeekdays, setPatternWeekdays] = useState<number[]>([1]);

  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<{ created: number; total: number } | null>(null);

  // Reset on each open. Calendar starts blank (no pre-population).
  useEffect(() => {
    if (open) {
      setCutoffOffset(DEFAULT_CUTOFF_OFFSET_DAYS);
      setDuration(packageDuration);
      setTotalSeats(40);
      setDepartureStatus("planned");
      setAvailabilityStatus("available");
      setDefaultsOpen(false);
      setSelected(new Set());
      setCursor(startOfMonth(new Date()));
      setPatternFreq("weekly");
      setPatternFrom(todayIso());
      const oneMonthOut = isoDate(addMonths(new Date(), 1));
      setPatternTo(oneMonthOut);
      setPatternWeekdays([1]);
      setIsSaving(false);
      setProgress(null);
    }
  }, [open, packageDuration]);

  const existingDateSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of existingDepartures) if (d.departure_date) s.add(d.departure_date);
    return s;
  }, [existingDepartures]);

  const today = todayIso();
  const sortedSelected = useMemo(
    () => Array.from(selected).sort((a, b) => a.localeCompare(b)),
    [selected],
  );

  const toggleDate = (iso: string) => {
    if (iso < today) return;
    if (existingDateSet.has(iso)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const removeFromSelection = (iso: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(iso);
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const togglePatternWeekday = (v: number) => {
    setPatternWeekdays((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort(),
    );
  };

  const patternError = useMemo(() => {
    if (!patternFrom || !patternTo) return "Both dates are required.";
    if (patternTo < patternFrom) return "To date must be on or after From date.";
    if (patternFreq === "custom" && patternWeekdays.length === 0) {
      return "Select at least one weekday.";
    }
    return null;
  }, [patternFrom, patternTo, patternFreq, patternWeekdays]);

  const addPattern = () => {
    if (patternError) return;
    const dates = generateDates(patternFrom, patternTo, patternFreq, patternWeekdays);
    let added = 0;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const iso of dates) {
        if (iso < today) continue;
        if (existingDateSet.has(iso)) continue;
        if (!next.has(iso)) {
          next.add(iso);
          added++;
        }
      }
      return next;
    });
    setPatternOpen(false);
    if (added === 0) {
      toast.info("No new dates added — all matches were past dates, conflicts, or already selected.");
    } else {
      toast.success(`Added ${added} date${added === 1 ? "" : "s"} from pattern.`);
    }
  };

  const overHard = selected.size > HARD_CAP;
  const overSoft = selected.size > SOFT_CAP && !overHard;
  const canSubmit = selected.size > 0 && !overHard && !isSaving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    setProgress({ created: 0, total: sortedSelected.length });
    let created = 0;
    let failedAt: { iso: string; error: string } | null = null;
    for (const iso of sortedSelected) {
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
        setProgress({ created, total: sortedSelected.length });
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
        `Created ${created} of ${sortedSelected.length} departures. Failed at ${formatDateDisplay(failedAt.iso)}: ${failedAt.error}`,
      );
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
        className="w-full sm:max-w-[700px] p-0 gap-0 flex flex-col"
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
          {/* Shared defaults — collapsed by default */}
          <div className="rounded-md border bg-muted/30">
            <button
              type="button"
              onClick={() => setDefaultsOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
            >
              <span>Shared defaults</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", defaultsOpen && "rotate-180")}
              />
            </button>
            {defaultsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-3 pb-3 pt-1">
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
                <div />
                <Field label="Departure status">
                  <Select value={departureStatus} onValueChange={setDepartureStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FD_DEPARTURE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
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
                        <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>

          {/* Pattern shortcut */}
          <div className="flex items-center justify-between gap-2">
            <Popover open={patternOpen} onOpenChange={setPatternOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Add pattern
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 space-y-3" align="start">
                <Field label="Pattern type">
                  <Select
                    value={patternFreq}
                    onValueChange={(v) => setPatternFreq(v as BulkFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FREQUENCY_LABEL) as BulkFrequency[]).map((f) => (
                        <SelectItem key={f} value={f}>{FREQUENCY_LABEL[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From">
                    <Input
                      type="date"
                      value={patternFrom}
                      onChange={(e) => setPatternFrom(e.target.value)}
                    />
                  </Field>
                  <Field label="To">
                    <Input
                      type="date"
                      value={patternTo}
                      onChange={(e) => setPatternTo(e.target.value)}
                      min={patternFrom || undefined}
                    />
                  </Field>
                </div>
                {patternFreq === "custom" && (
                  <Field label="Weekdays">
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-1.5 text-xs cursor-pointer"
                        >
                          <Checkbox
                            checked={patternWeekdays.includes(opt.value)}
                            onCheckedChange={() => togglePatternWeekday(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
                {patternError && (
                  <div className="text-xs text-destructive">{patternError}</div>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={addPattern}
                  disabled={!!patternError}
                >
                  Add to selection
                </Button>
              </PopoverContent>
            </Popover>
            <div className="text-xs text-muted-foreground">
              Click days on the calendar to toggle, or use a pattern shortcut.
            </div>
          </div>

          {/* Calendar */}
          <CalendarPair
            cursor={cursor}
            onCursorChange={setCursor}
            selected={selected}
            existingDateSet={existingDateSet}
            today={today}
            onToggle={toggleDate}
          />

          {/* Selection summary (sticky at bottom of scroll area) */}
          <div className="sticky bottom-0 -mx-4 mt-2 border-t bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-medium">
                {selected.size} date{selected.size === 1 ? "" : "s"} selected
              </div>
              {selected.size > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={clearAll}
                >
                  Clear all
                </Button>
              )}
            </div>
            {overHard && (
              <div className="text-xs text-destructive mb-1">
                Too many dates ({selected.size}). Hard limit is {HARD_CAP}.
              </div>
            )}
            {overSoft && (
              <div className="text-xs text-amber-600 mb-1">
                Heads up — creating {selected.size} departures.
              </div>
            )}
            {sortedSelected.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {sortedSelected.map((iso) => (
                  <span
                    key={iso}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {format(parseISO(iso), "MMM d, yyyy")}
                    <button
                      type="button"
                      onClick={() => removeFromSelection(iso)}
                      aria-label={`Remove ${iso}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
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
              `Create ${selected.size} departure${selected.size === 1 ? "" : "s"}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface CalendarPairProps {
  cursor: Date;
  onCursorChange: (d: Date) => void;
  selected: Set<string>;
  existingDateSet: Set<string>;
  today: string;
  onToggle: (iso: string) => void;
}

function CalendarPair({
  cursor,
  onCursorChange,
  selected,
  existingDateSet,
  today,
  onToggle,
}: CalendarPairProps) {
  const left = cursor;
  const right = addMonths(cursor, 1);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onCursorChange(addMonths(cursor, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold flex-1 grid grid-cols-1 md:grid-cols-2 text-center">
          <span>{format(left, "MMMM yyyy")}</span>
          <span className="hidden md:inline">{format(right, "MMMM yyyy")}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onCursorChange(addMonths(cursor, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MonthGrid
          month={left}
          selected={selected}
          existingDateSet={existingDateSet}
          today={today}
          onToggle={onToggle}
        />
        <div className="hidden md:block">
          <MonthGrid
            month={right}
            selected={selected}
            existingDateSet={existingDateSet}
            today={today}
            onToggle={onToggle}
          />
        </div>
      </div>
    </div>
  );
}

interface MonthGridProps {
  month: Date;
  selected: Set<string>;
  existingDateSet: Set<string>;
  today: string;
  onToggle: (iso: string) => void;
}

function MonthGrid({ month, selected, existingDateSet, today, onToggle }: MonthGridProps) {
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), WEEK_OPTS);
    const end = endOfWeek(endOfMonth(month), WEEK_OPTS);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const todayDate = useMemo(() => parseISO(today), [today]);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEKDAY_LABELS.map((l) => (
          <div key={l} className="px-1 py-0.5 text-center">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((date) => {
          const iso = isoDate(date);
          const inMonth = isSameMonth(date, month);
          const isPast = iso < today;
          const isExisting = existingDateSet.has(iso);
          const isSelected = selected.has(iso);
          const isToday = isSameDay(date, todayDate);
          const disabled = isPast || isExisting;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(iso)}
              title={
                isExisting
                  ? "Departure exists."
                  : isPast
                    ? "Past date"
                    : undefined
              }
              className={cn(
                "h-9 rounded text-xs transition-colors",
                inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed",
                !disabled && !isSelected && "hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isExisting && "border-2 border-amber-300",
                isToday && !isSelected && "ring-1 ring-primary",
              )}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>
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
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

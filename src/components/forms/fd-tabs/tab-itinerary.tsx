"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Copy, Save, Settings2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Autocomplete } from "@/components/ui/autocomplete";
import TiptapEditor from "@/components/editor/TiptapEditor";
import {
  fdGetPackage,
  fdGetPackageCountries,
  fdGetCitiesByCountry,
  fdReplaceItinerary,
} from "@/data-access/fixed-departures";
import {
  FDItinerarySchema,
  type IFDItinerary,
  type IFDItineraryDay,
} from "@/components/forms/schemas/fixed-departures-schema";
import type { FDCity, FDPackageDetail } from "@/types/fixed-departures";
import type { IOption } from "@/types/common";
import { cn } from "@/lib/utils";

const PREDEFINED_MEALS = [
  "Breakfast",
  "Indian Breakfast",
  "Packed Breakfast",
  "Lunch",
  "Indian Lunch",
  "Indian Jain Lunch",
  "Local Lunch",
  "Packed Lunch",
  "Dinner",
  "Indian Dinner",
  "Indian Jain Dinner",
  "Local Dinner",
  "Packed Dinner",
  "Snacks",
] as const;

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
}

function dayLabel(dayNumber: number, totalDays: number): string {
  return dayNumber === totalDays ? `Day ${dayNumber} (Departure)` : `Day ${dayNumber}`;
}

function mealLabelsFromList(meals: string[]): string {
  const lower = meals.map((m) => m.toLowerCase());
  const parts: string[] = [];
  if (lower.some((m) => m.includes("breakfast"))) parts.push("B");
  if (lower.some((m) => m.includes("lunch"))) parts.push("L");
  if (lower.some((m) => m.includes("dinner"))) parts.push("D");
  return parts.join(", ");
}

function emptyDay(dayNumber: number): IFDItineraryDay {
  return {
    day_number: dayNumber,
    title: "",
    description: "",
    includes: "",
    meals_included: [],
    overnight_city_id: null,
    accommodation_note: "",
    image_url: "",
  };
}

function reconcileDays(
  existing: Array<Partial<IFDItineraryDay> & { day_number: number }>,
  totalDays: number,
): IFDItineraryDay[] {
  const byNumber = new Map<number, Partial<IFDItineraryDay>>();
  for (const d of existing) byNumber.set(d.day_number, d);
  const out: IFDItineraryDay[] = [];
  for (let i = 1; i <= totalDays; i++) {
    const e = byNumber.get(i);
    if (e) {
      out.push({
        day_number: i,
        title: e.title ?? "",
        description: e.description ?? "",
        includes: e.includes ?? "",
        meals_included: Array.isArray(e.meals_included) ? e.meals_included : [],
        overnight_city_id: e.overnight_city_id ?? null,
        accommodation_note: e.accommodation_note ?? "",
        image_url: e.image_url ?? "",
      });
    } else {
      out.push(emptyDay(i));
    }
  }
  return out;
}

export function FDItineraryTab({ mode, packageId, onSaved, onAdvance }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));
  const [customMeals, setCustomMeals] = useState<string[]>([]);
  const [newCustomMeal, setNewCustomMeal] = useState("");
  const [manageMealsOpen, setManageMealsOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId, "for-itinerary"],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });

  const { data: pkgCountries = [] } = useQuery({
    queryKey: ["fd-pkg-countries", packageId],
    queryFn: () => fdGetPackageCountries(packageId as string),
    enabled: !!packageId,
  });

  const countryIdsKey = pkgCountries.map((c) => c.id).sort().join(",");
  const { data: allCitiesInCountries = [] } = useQuery<FDCity[]>({
    queryKey: ["fd-cities-in-pkg-countries", countryIdsKey],
    queryFn: async () => {
      if (pkgCountries.length === 0) return [];
      const all = await Promise.all(pkgCountries.map((c) => fdGetCitiesByCountry(c.id)));
      return all.flat() as FDCity[];
    },
    enabled: pkgCountries.length > 0,
  });

  const cityNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of allCitiesInCountries) m.set(c.id, c.city_name);
    return m;
  }, [allCitiesInCountries]);

  const durationNights = (pkg?.duration_nights as number | null) ?? 0;
  const totalDays = durationNights > 0 ? durationNights + 1 : 0;

  const form = useForm<IFDItinerary>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(FDItinerarySchema) as any,
    defaultValues: { days: [] },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "days" });

  // Hydrate from server data on first load when totalDays is known.
  useEffect(() => {
    if (!pkg || totalDays === 0 || hydrated) return;
    const existing = Array.isArray(pkg.fd_itinerary_days)
      ? (pkg.fd_itinerary_days as Array<Record<string, unknown>>).map((d) => ({
          day_number: Number(d.day_number),
          title: d.title as string | undefined,
          description: d.description as string | undefined,
          includes: d.includes as string | undefined,
          meals_included: Array.isArray(d.meals_included) ? (d.meals_included as string[]) : [],
          overnight_city_id: (d.overnight_city_id as string | null) ?? null,
          accommodation_note: (d.accommodation_note as string | undefined) ?? "",
          image_url: (d.image_url as string | undefined) ?? "",
        }))
      : [];
    const reconciled = reconcileDays(existing, totalDays);
    replace(reconciled);
    // Initial customMeals = unique non-predefined meals across all days
    const customs = new Set<string>();
    for (const d of reconciled) {
      for (const m of d.meals_included) {
        if (!PREDEFINED_MEALS.includes(m as (typeof PREDEFINED_MEALS)[number])) customs.add(m);
      }
    }
    setCustomMeals(Array.from(customs).sort());
    setHydrated(true);
  }, [pkg, totalDays, hydrated, replace]);

  // If duration_nights changes after hydration (e.g. user edited Tab 1 then came back), reconcile.
  useEffect(() => {
    if (!hydrated || totalDays === 0) return;
    if (fields.length === totalDays) return;
    const current = form.getValues("days");
    const reconciled = reconcileDays(current, totalDays);
    replace(reconciled);
  }, [totalDays, hydrated, fields.length, form, replace]);

  const allMealOptions = useMemo(
    () => [...PREDEFINED_MEALS, ...customMeals],
    [customMeals],
  );

  const overnightCitySearchFn = useCallback(
    async (search: string): Promise<IOption[]> => {
      if (pkgCountries.length === 0) return [];
      const all = await Promise.all(
        pkgCountries.map((c) => fdGetCitiesByCountry(c.id, search || undefined)),
      );
      const map = new Map<string, string>();
      for (const city of all.flat() as FDCity[]) map.set(city.id, city.city_name);
      return Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    [pkgCountries],
  );

  const overnightCityFetchByValue = useCallback(
    async (id: string): Promise<IOption | null> => {
      if (pkgCountries.length === 0) return null;
      const all = await Promise.all(
        pkgCountries.map((c) => fdGetCitiesByCountry(c.id)),
      );
      const found = (all.flat() as FDCity[]).find((c) => c.id === id);
      return found ? { value: found.id, label: found.city_name } : null;
    },
    [pkgCountries],
  );

  const toggleDay = (n: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleAddCustomMeal = () => {
    const name = newCustomMeal.trim();
    if (!name) return;
    if (
      PREDEFINED_MEALS.includes(name as (typeof PREDEFINED_MEALS)[number]) ||
      customMeals.includes(name)
    ) {
      toast.error("Meal already exists");
      return;
    }
    setCustomMeals((prev) => [...prev, name].sort());
    setNewCustomMeal("");
  };

  const handleRemoveCustomMeal = (name: string) => {
    setCustomMeals((prev) => prev.filter((m) => m !== name));
    const days = form.getValues("days");
    days.forEach((d, idx) => {
      if (d.meals_included.includes(name)) {
        form.setValue(
          `days.${idx}.meals_included`,
          d.meals_included.filter((m) => m !== name),
          { shouldDirty: true },
        );
      }
    });
  };

  const handleCopyToTargets = (sourceIdx: number, targetDayNumbers: number[]) => {
    const days = form.getValues("days");
    const src = days[sourceIdx];
    targetDayNumbers.forEach((n) => {
      const idx = days.findIndex((d) => d.day_number === n);
      if (idx === -1) return;
      form.setValue(`days.${idx}.description`, src.description, { shouldDirty: true });
      form.setValue(`days.${idx}.includes`, src.includes, { shouldDirty: true });
      form.setValue(`days.${idx}.meals_included`, [...src.meals_included], { shouldDirty: true });
      form.setValue(`days.${idx}.overnight_city_id`, src.overnight_city_id ?? null, { shouldDirty: true });
      form.setValue(`days.${idx}.accommodation_note`, src.accommodation_note, { shouldDirty: true });
      form.setValue(`days.${idx}.image_url`, src.image_url, { shouldDirty: true });
    });
    toast.success(
      `Copied to ${targetDayNumbers.length} day${targetDayNumbers.length === 1 ? "" : "s"}`,
    );
  };

  const handleClearDay = (dayNumber: number) => {
    const idx = form.getValues("days").findIndex((d) => d.day_number === dayNumber);
    if (idx === -1) return;
    const empty = emptyDay(dayNumber);
    form.setValue(`days.${idx}`, empty, { shouldDirty: true });
    setClearTarget(null);
    toast.success(`Cleared Day ${dayNumber}`);
  };

  const onSubmit = async (values: IFDItinerary) => {
    if (!packageId) {
      toast.error("Save Tab 1 first");
      return;
    }
    setIsSaving(true);
    try {
      const payload = values.days.map((d) => ({
        day_number: d.day_number,
        title: d.title,
        description: d.description || null,
        includes: d.includes || null,
        meals_included: d.meals_included,
        overnight_city_id: d.overnight_city_id || null,
        accommodation_note: d.accommodation_note || null,
        image_url: d.image_url || null,
      }));
      await fdReplaceItinerary(packageId, payload);
      toast.success(mode === "create" ? "Itinerary saved" : "Itinerary updated");
      onSaved();
      if (mode === "create") onAdvance();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save & Next</div>
      </div>
    );
  }

  if (!pkg || totalDays === 0) {
    return <div className="text-muted-foreground text-sm">Loading itinerary…</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Manage meal options */}
      <div className="rounded-md border bg-muted/30">
        <button
          type="button"
          onClick={() => setManageMealsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Manage meal options
            {customMeals.length > 0 && (
              <span className="text-xs text-muted-foreground">({customMeals.length} custom)</span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", manageMealsOpen && "rotate-180")} />
        </button>
        {manageMealsOpen && (
          <div className="px-4 pb-3 pt-1 flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">
              Custom meals appear in every day&apos;s meals dropdown. Removing one clears it from all days.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {customMeals.length === 0 && (
                <span className="text-xs text-muted-foreground">No custom meals yet.</span>
              )}
              {customMeals.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-xs"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomMeal(m)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${m}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCustomMeal}
                onChange={(e) => setNewCustomMeal(e.target.value)}
                placeholder="e.g. Vegan Dinner"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomMeal();
                  }
                }}
                className="h-8"
              />
              <Button type="button" size="sm" onClick={handleAddCustomMeal}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Day cards */}
      <div className="flex flex-col gap-2">
        {fields.map((field, idx) => {
          const dayNumber = field.day_number;
          const isOpen = openDays.has(dayNumber);
          const watchedTitle = form.watch(`days.${idx}.title`) ?? "";
          const watchedMeals: string[] = form.watch(`days.${idx}.meals_included`) ?? [];
          const watchedOvernight = form.watch(`days.${idx}.overnight_city_id`) ?? null;
          const cityName = watchedOvernight ? cityNameById.get(watchedOvernight) ?? null : null;
          return (
            <div key={field.id} className="rounded-md border bg-card">
              <DayHeader
                dayNumber={dayNumber}
                dayLabelText={dayLabel(dayNumber, totalDays)}
                titleDisplay={watchedTitle.trim()}
                mealsLabel={mealLabelsFromList(watchedMeals)}
                overnightCityName={cityName}
                isOpen={isOpen}
                onToggle={() => toggleDay(dayNumber)}
                onCopyConfirm={(targets) => handleCopyToTargets(idx, targets)}
                onClear={() => setClearTarget(dayNumber)}
                otherDays={fields
                  .map((f) => f.day_number)
                  .filter((n) => n !== dayNumber)}
              />
              {isOpen && (
                <div className="px-4 pb-4 pt-2 flex flex-col gap-4 border-t">
                  <DayBody
                    idx={idx}
                    form={form}
                    allMealOptions={allMealOptions}
                    overnightCitySearchFn={overnightCitySearchFn}
                    overnightCityFetchByValue={overnightCityFetchByValue}
                    countriesSelected={pkgCountries.length > 0}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isSaving}>
          {mode === "create" ? (
            <>
              {isSaving ? "Saving..." : "Save & Next"}
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={clearTarget !== null} onOpenChange={(o) => !o && setClearTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content on Day {clearTarget}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearTarget && handleClearDay(clearTarget)}>
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

interface DayHeaderProps {
  dayNumber: number;
  dayLabelText: string;
  titleDisplay: string;
  mealsLabel: string;
  overnightCityName: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onCopyConfirm: (targets: number[]) => void;
  onClear: () => void;
  otherDays: number[];
}

function DayHeader({
  dayNumber,
  dayLabelText,
  titleDisplay,
  mealsLabel,
  overnightCityName,
  isOpen,
  onToggle,
  onCopyConfirm,
  onClear,
  otherDays,
}: DayHeaderProps) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allSelected = otherDays.length > 0 && selected.size === otherDays.length;

  const togglePick = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(otherDays));
  };

  const handleCopy = () => {
    if (selected.size === 0) return;
    setConfirmOpen(true);
  };

  const confirmCopy = () => {
    onCopyConfirm(Array.from(selected).sort((a, b) => a - b));
    setConfirmOpen(false);
    setCopyOpen(false);
    setSelected(new Set());
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
        aria-label={isOpen ? "Collapse" : "Expand"}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "" : "-rotate-90")} />
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-2 min-w-0 text-left"
      >
        <span className="text-sm font-semibold shrink-0">{dayLabelText}</span>
        <span className={cn("text-sm truncate", titleDisplay ? "" : "text-muted-foreground italic")}>
          {titleDisplay || "No title"}
        </span>
        {mealsLabel && (
          <>
            <span className="text-muted-foreground/50 shrink-0">·</span>
            <span className="text-xs text-muted-foreground shrink-0">{mealsLabel}</span>
          </>
        )}
        {overnightCityName && (
          <>
            <span className="text-muted-foreground/50 shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate">{overnightCityName}</span>
          </>
        )}
      </button>
      <Popover open={copyOpen} onOpenChange={setCopyOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Copy to other days"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="text-sm font-medium mb-2">Copy Day {dayNumber} to:</div>
          {otherDays.length === 0 ? (
            <div className="text-xs text-muted-foreground">No other days available.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                <Checkbox
                  id={`day-${dayNumber}-all`}
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
                <Label htmlFor={`day-${dayNumber}-all`} className="text-xs">
                  Select All
                </Label>
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {otherDays.map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${dayNumber}-target-${n}`}
                      checked={selected.has(n)}
                      onCheckedChange={() => togglePick(n)}
                    />
                    <Label htmlFor={`day-${dayNumber}-target-${n}`} className="text-xs">
                      Day {n}
                    </Label>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full mt-3"
                onClick={handleCopy}
                disabled={selected.size === 0}
              >
                Copy to {selected.size} {selected.size === 1 ? "day" : "days"}
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onClear}
        title="Clear day"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite content on{" "}
              {Array.from(selected)
                .sort((a, b) => a - b)
                .map((n) => `Day ${n}`)
                .join(", ")}
              . Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCopy}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface DayBodyProps {
  idx: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  allMealOptions: string[];
  overnightCitySearchFn: (search: string) => Promise<IOption[]>;
  overnightCityFetchByValue: (id: string) => Promise<IOption | null>;
  countriesSelected: boolean;
}

function DayBody({
  idx,
  form,
  allMealOptions,
  overnightCitySearchFn,
  overnightCityFetchByValue,
  countriesSelected,
}: DayBodyProps) {
  const description = form.watch(`days.${idx}.description`) ?? "";
  const meals: string[] = form.watch(`days.${idx}.meals_included`) ?? [];
  const imageUrl: string = form.watch(`days.${idx}.image_url`) ?? "";

  const toggleMeal = (m: string) => {
    const next = meals.includes(m) ? meals.filter((x) => x !== m) : [...meals, m];
    form.setValue(`days.${idx}.meals_included`, next, { shouldDirty: true });
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Day Title</Label>
        <Input
          placeholder="e.g. Arrival in Paris"
          {...form.register(`days.${idx}.title`)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Description</Label>
        <TiptapEditor
          initialContent={description}
          onChange={(html) =>
            form.setValue(`days.${idx}.description`, html, { shouldDirty: true })
          }
          placeholder="Describe the day's plan..."
          tools={["bold", "italic", "underline"]}
          className="min-h-[160px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Includes</Label>
        <Textarea
          rows={2}
          placeholder="What's included today..."
          {...form.register(`days.${idx}.includes`)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Meals Included</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="justify-start font-normal h-9"
              >
                {meals.length === 0
                  ? "Select meals..."
                  : meals.length <= 2
                    ? meals.join(", ")
                    : `${meals.length} selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-[280px] overflow-y-auto p-2" align="start" onWheelCapture={(e) => e.stopPropagation()}>
              <div className="flex flex-col gap-1">
                {allMealOptions.map((m) => (
                  <div
                    key={m}
                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleMeal(m)}
                  >
                    <Checkbox checked={meals.includes(m)} />
                    <span className="text-sm">{m}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {meals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {meals.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => toggleMeal(m)}
                    aria-label={`Remove ${m}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Overnight City</Label>
          <Controller
            control={form.control}
            name={`days.${idx}.overnight_city_id`}
            render={({ field }) => (
              <Autocomplete
                mode="server"
                value={field.value ?? undefined}
                onChange={(v) => field.onChange(v || null)}
                onSearch={overnightCitySearchFn}
                fetchByValue={overnightCityFetchByValue}
                placeholder={
                  countriesSelected
                    ? "Search overnight city..."
                    : "Select countries in Tab 1 first"
                }
                disabled={!countriesSelected}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label className="text-xs">Accommodation Note</Label>
          <Input
            placeholder="e.g. 4-star hotel, Deluxe Room"
            {...form.register(`days.${idx}.accommodation_note`)}
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label className="text-xs">Image URL</Label>
          <Input
            placeholder="https://..."
            {...form.register(`days.${idx}.image_url`)}
          />
          {imageUrl && /^https?:\/\//i.test(imageUrl) && (
            <div className="mt-1 h-32 w-full overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Day preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

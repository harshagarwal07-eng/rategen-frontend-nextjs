"use client";

import {
  createRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Autocomplete } from "@/components/ui/autocomplete";
import { BulletListInput } from "@/components/ui/bullet-list-input";
import {
  fdListAddons,
  fdCreateAddon,
  fdUpdateAddon,
  fdDeleteAddon,
  fdReplaceAddonItinerary,
  fdGetPackage,
  fdGetPackageCountries,
  fdGetCitiesByCountry,
} from "@/data-access/fixed-departures";
import type { FDAddon, FDAddonType, FDAgePolicy, FDCity, FDPackageDetail } from "@/types/fixed-departures";
import type { IOption } from "@/types/common";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";
import { cn } from "@/lib/utils";

type BandKey = "infant" | "child" | "adult";
const BAND_KEYS: BandKey[] = ["infant", "child", "adult"];
const BAND_LABELS: Record<BandKey, string> = { infant: "Infant", child: "Child", adult: "Adult" };
const FALLBACK_BAND_RANGES: Record<BandKey, { from: number; to: number }> = {
  infant: { from: 0, to: 1 },
  child: { from: 2, to: 11 },
  adult: { from: 12, to: 99 },
};

function getPackageBandRange(
  bands: FDAgePolicy[] | undefined,
  key: BandKey,
): { from: number; to: number } {
  const match = (bands ?? []).find((b) => b.band_name?.toLowerCase() === key);
  if (match) return { from: match.age_from, to: match.age_to };
  return FALLBACK_BAND_RANGES[key];
}

function getEffectiveBandRange(
  draft: Partial<FDAddon>,
  packageBands: FDAgePolicy[] | undefined,
  key: BandKey,
): { from: number; to: number } {
  if (draft.use_custom_age_policy) {
    return {
      from: (draft[`custom_${key}_age_from` as keyof FDAddon] as number | null | undefined) ??
        getPackageBandRange(packageBands, key).from,
      to: (draft[`custom_${key}_age_to` as keyof FDAddon] as number | null | undefined) ??
        getPackageBandRange(packageBands, key).to,
    };
  }
  return getPackageBandRange(packageBands, key);
}

function bandsSummary(
  draft: Partial<FDAddon>,
  packageBands: FDAgePolicy[] | undefined,
): string {
  return BAND_KEYS
    .map((k) => {
      const { from, to } = getEffectiveBandRange(draft, packageBands, k);
      return `${BAND_LABELS[k]} ${from}-${to}`;
    })
    .join(" · ");
}

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

const ADDON_TYPE_LABEL: Record<FDAddonType, string> = {
  day_tour: "Day Tour",
  multi_day_tour: "Multi-day Tour",
  meal: "Meal",
  transfer: "Transfer",
  other: "Other",
};

const ADDON_TYPE_DESCRIPTION: Record<FDAddonType, string> = {
  day_tour: "A single-day excursion, ticket or guided activity.",
  multi_day_tour: "A pre- or post-package extension spanning multiple days with its own itinerary.",
  meal: "Optional meal upgrade (e.g. half-board, special dinner).",
  transfer: "Airport/hotel transfers or private car service.",
  other: "Anything else — tips, porterage, SIM cards, insurance upsell.",
};

const PRICE_UNIT_OPTIONS: Record<Exclude<FDAddonType, "multi_day_tour">, { value: string; label: string }[]> = {
  day_tour: [
    { value: "per_pax", label: "Per pax" },
    { value: "per_tour", label: "Per tour" },
    { value: "per_ticket", label: "Per ticket" },
  ],
  meal: [
    { value: "per_pax", label: "Per pax" },
    { value: "per_meal", label: "Per meal" },
  ],
  transfer: [
    { value: "per_pax", label: "Per pax" },
    { value: "per_transfer", label: "Per transfer" },
    { value: "per_vehicle", label: "Per vehicle" },
    { value: "per_ticket", label: "Per ticket" },
    { value: "total", label: "Total" },
  ],
  other: [
    { value: "per_pax", label: "Per pax" },
    { value: "per_day", label: "Per day" },
    { value: "total", label: "Total" },
  ],
};

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

type DraftAddon = Partial<FDAddon> & {
  _localId: string;
  _isNew: boolean;
  _dirty?: boolean;
};

export type AddonCardHandle = {
  save: () => Promise<SaveResult>;
};

type SaveResult =
  | { success: true; name: string; saved: FDAddon }
  | { success: false; name: string; error: string };

// Frontend draft state for a multi-day-tour's nested days.
interface AddonDayState {
  day_number: number;
  title: string;
  description: string;
  includes: string;
  meals_included: string[];
  overnight_city_id: string | null;
  accommodation_note: string;
  image_url: string;
}

function emptyDay(dayNumber: number): AddonDayState {
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

function reconcileAddonDays(
  existing: AddonDayState[],
  total: number,
): AddonDayState[] {
  const byNumber = new Map<number, AddonDayState>();
  for (const d of existing) byNumber.set(d.day_number, d);
  const out: AddonDayState[] = [];
  for (let i = 1; i <= total; i++) {
    out.push(byNumber.get(i) ?? emptyDay(i));
  }
  return out;
}

function mealsSummary(meals: string[]): string {
  const lower = meals.map((m) => m.toLowerCase());
  const parts: string[] = [];
  if (lower.some((m) => m.includes("breakfast"))) parts.push("B");
  if (lower.some((m) => m.includes("lunch"))) parts.push("L");
  if (lower.some((m) => m.includes("dinner"))) parts.push("D");
  return parts.join(", ");
}

function addonToDraft(a: FDAddon): DraftAddon {
  return { ...a, _localId: a.id, _isNew: false };
}

function emptyDraft(type: FDAddonType): DraftAddon {
  return {
    _localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    _isNew: true,
    name: "",
    description: "",
    addon_type: type,
    is_mandatory: false,
    duration_days: type === "multi_day_tour" ? 1 : null,
    price_adult: null,
    price_child: null,
    price_infant: null,
    price_unit: null,
    max_capacity: null,
    inclusions: [],
    exclusions: [],
    transfer_type: "",
    transfer_mode: "",
    tour_includes_transfer: false,
    tour_transfer_type: "",
    fd_addon_itinerary_days: [],
  };
}

export const FDAddonsTab = forwardRef<FDTabHandle, Props>(function FDAddonsTab({
  mode,
  packageId,
  onSaved,
  onAdvance,
  onDirtyChange,
}, ref) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftAddon[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DraftAddon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cardRefsMap = useRef<Map<string, React.RefObject<AddonCardHandle | null>>>(new Map());

  const getOrCreateRef = (localId: string): React.RefObject<AddonCardHandle | null> => {
    if (!cardRefsMap.current.has(localId)) {
      cardRefsMap.current.set(localId, createRef<AddonCardHandle>());
    }
    return cardRefsMap.current.get(localId)!;
  };

  const { data: addons } = useQuery<FDAddon[]>({
    queryKey: ["fd-package", packageId, "addons"],
    queryFn: () => fdListAddons(packageId as string),
    enabled: !!packageId,
  });

  const { data: pkgCountries = [] } = useQuery({
    queryKey: ["fd-pkg-countries", packageId],
    queryFn: () => fdGetPackageCountries(packageId as string),
    enabled: !!packageId,
  });

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });
  const packageBands = (pkg?.fd_age_policies ?? []) as FDAgePolicy[];

  useEffect(() => {
    if (!addons || hydrated) return;
    setDrafts(addons.map(addonToDraft));
    setHydrated(true);
  }, [addons, hydrated]);

  const hasUnsavedNew = drafts.some((d) => d._isNew);

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
      const all = await Promise.all(pkgCountries.map((c) => fdGetCitiesByCountry(c.id)));
      const found = (all.flat() as FDCity[]).find((c) => c.id === id);
      return found ? { value: found.id, label: found.city_name } : null;
    },
    [pkgCountries],
  );

  const handleAddType = (type: FDAddonType) => {
    const draft = emptyDraft(type);
    getOrCreateRef(draft._localId);
    setDrafts((prev) => [...prev, draft]);
    setTypePickerOpen(false);
  };

  const updateDraft = (localId: string, patch: Partial<DraftAddon>) => {
    setDrafts((prev) =>
      prev.map((d) => (d._localId === localId ? { ...d, ...patch, _dirty: true } : d)),
    );
  };

  const removeDraft = (localId: string) => {
    setDrafts((prev) => prev.filter((d) => d._localId !== localId));
    cardRefsMap.current.delete(localId);
  };

  const handleDelete = async (draft: DraftAddon) => {
    if (draft._isNew) {
      removeDraft(draft._localId);
      setDeleteTarget(null);
      return;
    }
    if (!draft.id) return;
    try {
      await fdDeleteAddon(draft.id);
      toast.success("Add-on deleted");
      removeDraft(draft._localId);
      queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "addons"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCardSaved = (localId: string, saved: FDAddon) => {
    if (localId !== saved.id) {
      const existingRef = cardRefsMap.current.get(localId);
      if (existingRef) {
        cardRefsMap.current.delete(localId);
        cardRefsMap.current.set(saved.id, existingRef);
      }
    }
    setDrafts((prev) =>
      prev.map((d) =>
        d._localId === localId
          ? { ...addonToDraft(saved), _localId: saved.id }
          : d,
      ),
    );
  };

  const handleSaveAll = async (): Promise<{ success: number; failures: { name: string; error: string }[] }> => {
    setIsSaving(true);
    try {
      const draftsSnapshot = [...drafts];
      let success = 0;
      const failures: { name: string; error: string }[] = [];
      for (const draft of draftsSnapshot) {
        const ref = cardRefsMap.current.get(draft._localId);
        if (!ref?.current) continue;
        const result = await ref.current.save();
        if (result.success) {
          success++;
          handleCardSaved(draft._localId, result.saved);
        } else {
          failures.push({ name: result.name, error: result.error });
        }
      }
      if (success > 0) {
        queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "addons"] });
        onSaved();
      }
      return { success, failures };
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async (): Promise<boolean> => {
    const { success, failures } = await handleSaveAll();
    if (failures.length === 0) {
      if (drafts.length > 0) toast.success("All add-ons saved");
      if (mode === "create") onAdvance();
      return true;
    }
    const failList = failures.map((f) => `${f.name} — ${f.error}`).join("; ");
    toast.error(`${success} saved, ${failures.length} failed: ${failList}`);
    return false;
  };

  // Dirty propagation
  const dirty = drafts.some((d) => !!d._isNew || !!d._dirty);
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (lastReportedDirty.current !== dirty) {
      lastReportedDirty.current = dirty;
      onDirtyChangeRef.current?.(dirty);
    }
  }, [dirty]);
  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => handleNext(),
  }));

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save &amp; Next</div>
      </div>
    );
  }

  if (!addons) {
    return <div className="text-muted-foreground text-sm">Loading add-ons…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Add-ons</h2>
        <p className="text-muted-foreground">Optional extras travelers can purchase</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {drafts.length === 0
            ? "No add-ons yet."
            : `${drafts.length} add-on${drafts.length === 1 ? "" : "s"}`}
        </div>
        <Button type="button" onClick={() => setTypePickerOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add-on
        </Button>
      </div>

      {drafts.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No add-ons yet. Click <span className="font-medium">+ Add-on</span> to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <AddonCard
              ref={getOrCreateRef(draft._localId)}
              key={draft._localId}
              draft={draft}
              packageId={packageId}
              packageBands={packageBands}
              dirty={!!draft._isNew || !!draft._dirty}
              onChange={(patch) => updateDraft(draft._localId, patch)}
              onDeleteRequest={() => setDeleteTarget(draft)}
              overnightCitySearchFn={overnightCitySearchFn}
              overnightCityFetchByValue={overnightCityFetchByValue}
              countriesSelected={pkgCountries.length > 0}
            />
          ))}
        </div>
      )}

      <TypePickerDialog
        open={typePickerOpen}
        onOpenChange={setTypePickerOpen}
        onPick={handleAddType}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteTarget?.name || "unnamed add-on"}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?._isNew
                ? "Discard this unsaved add-on?"
                : "This will permanently remove the add-on and any nested itinerary days."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              {deleteTarget?._isNew ? "Discard" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

FDAddonsTab.displayName = "FDAddonsTab";

interface TypePickerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (type: FDAddonType) => void;
}

function TypePickerDialog({ open, onOpenChange, onPick }: TypePickerDialogProps) {
  const types: FDAddonType[] = ["day_tour", "multi_day_tour", "meal", "transfer", "other"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What type of add-on?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className="group rounded-md border p-3 text-left transition hover:border-primary hover:bg-muted/40"
            >
              <div className="text-sm font-medium">{ADDON_TYPE_LABEL[t]}</div>
              <div className="text-xs text-muted-foreground">{ADDON_TYPE_DESCRIPTION[t]}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddonCardProps {
  draft: DraftAddon;
  packageId: string;
  packageBands: FDAgePolicy[];
  dirty: boolean;
  onChange: (patch: Partial<DraftAddon>) => void;
  onDeleteRequest: () => void;
  overnightCitySearchFn: (search: string) => Promise<IOption[]>;
  overnightCityFetchByValue: (id: string) => Promise<IOption | null>;
  countriesSelected: boolean;
}

const AddonCard = forwardRef<AddonCardHandle, AddonCardProps>(function AddonCard({
  draft,
  packageId,
  packageBands,
  dirty,
  onChange,
  onDeleteRequest,
  overnightCitySearchFn,
  overnightCityFetchByValue,
  countriesSelected,
}, ref) {
  const [isOpen, setIsOpen] = useState(draft._isNew);
  const [customMeals, setCustomMeals] = useState<string[]>([]);
  const [newCustomMeal, setNewCustomMeal] = useState("");
  const [manageMealsOpen, setManageMealsOpen] = useState(false);
  const [addonDays, setAddonDays] = useState<AddonDayState[]>(() => {
    const nested = draft.fd_addon_itinerary_days ?? [];
    const mapped: AddonDayState[] = nested.map((d) => ({
      day_number: d.day_number,
      title: d.title ?? "",
      description: d.description ?? "",
      includes: d.includes ?? "",
      meals_included: Array.isArray(d.meals_included) ? d.meals_included : [],
      overnight_city_id: d.overnight_city_id ?? null,
      accommodation_note: d.accommodation_note ?? "",
      image_url: d.image_url ?? "",
    }));
    return reconcileAddonDays(mapped, draft.duration_days ?? 0);
  });

  const type = draft.addon_type as FDAddonType;

  // Seed custom meals from existing nested days on first mount.
  useEffect(() => {
    const customs = new Set<string>();
    for (const d of addonDays) {
      for (const m of d.meals_included) {
        if (!PREDEFINED_MEALS.includes(m as (typeof PREDEFINED_MEALS)[number])) customs.add(m);
      }
    }
    setCustomMeals(Array.from(customs).sort());
    // intentionally run once per mount; manual add/remove below keeps this in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When duration_days changes (multi_day_tour only), keep addonDays in sync.
  useEffect(() => {
    if (type !== "multi_day_tour") return;
    const target = draft.duration_days ?? 0;
    if (addonDays.length !== target) {
      setAddonDays((prev) => reconcileAddonDays(prev, target));
    }
  }, [draft.duration_days, type, addonDays.length]);

  const allMealOptions = useMemo(
    () => [...PREDEFINED_MEALS, ...customMeals],
    [customMeals],
  );

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
    setAddonDays((prev) =>
      prev.map((d) => ({
        ...d,
        meals_included: d.meals_included.filter((m) => m !== name),
      })),
    );
  };

  const flagDirty = useCallback(() => onChange({}), [onChange]);

  const updateDay = (idx: number, patch: Partial<AddonDayState>) => {
    setAddonDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
    flagDirty();
  };

  const toggleMeal = (idx: number, m: string) => {
    const current = addonDays[idx]?.meals_included ?? [];
    const next = current.includes(m) ? current.filter((x) => x !== m) : [...current, m];
    updateDay(idx, { meals_included: next });
  };

  const buildPayload = (): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      name: draft.name ?? "",
      description: draft.description || null,
      addon_type: type,
      is_mandatory: !!draft.is_mandatory,
      inclusions: (draft.inclusions ?? []).map((s) => s.trim()).filter(Boolean),
      exclusions: (draft.exclusions ?? []).map((s) => s.trim()).filter(Boolean),
      max_capacity: draft.max_capacity ?? null,
      price_adult: draft.price_adult ?? null,
      price_child: draft.price_child ?? null,
      price_infant: draft.price_infant ?? null,
    };

    if (type === "multi_day_tour") {
      base.duration_days = draft.duration_days ?? 1;
      base.price_unit = null;
    } else {
      base.duration_days = null;
      base.price_unit = draft.price_unit || null;
    }

    if (type === "day_tour") {
      base.tour_includes_transfer = !!draft.tour_includes_transfer;
      base.tour_transfer_type = draft.tour_includes_transfer
        ? draft.tour_transfer_type || null
        : null;
    } else {
      base.tour_includes_transfer = false;
      base.tour_transfer_type = null;
    }

    if (type === "transfer") {
      base.transfer_type = draft.transfer_type || null;
      base.transfer_mode = draft.transfer_mode || null;
    } else {
      base.transfer_type = null;
      base.transfer_mode = null;
    }

    const useCustomAge = !!draft.use_custom_age_policy;
    base.use_custom_age_policy = useCustomAge;
    for (const k of BAND_KEYS) {
      const fromKey = `custom_${k}_age_from` as const;
      const toKey = `custom_${k}_age_to` as const;
      base[fromKey] = useCustomAge
        ? (draft[fromKey] as number | null | undefined) ?? getPackageBandRange(packageBands, k).from
        : null;
      base[toKey] = useCustomAge
        ? (draft[toKey] as number | null | undefined) ?? getPackageBandRange(packageBands, k).to
        : null;
    }

    return base;
  };

  // Stash latest values so the imperative save handle reads current state.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const addonDaysRef = useRef(addonDays);
  addonDaysRef.current = addonDays;
  const packageBandsRef = useRef(packageBands);
  packageBandsRef.current = packageBands;

  useImperativeHandle(ref, () => ({
    save: async (): Promise<SaveResult> => {
      const d = draftRef.current;
      const t = d.addon_type as FDAddonType;
      const days = addonDaysRef.current;
      const bands = packageBandsRef.current;
      const name = (d.name ?? "").trim() || "(unnamed)";

      if (!d.name || !d.name.trim()) {
        return { success: false, name, error: "Name is required" };
      }
      if (t === "multi_day_tour" && (!d.duration_days || d.duration_days < 1)) {
        return { success: false, name, error: "Duration (days) is required" };
      }
      if (d.use_custom_age_policy) {
        const ranges = BAND_KEYS.map((k) => ({
          key: k,
          ...getEffectiveBandRange(d, bands, k),
        }));
        for (const r of ranges) {
          if (r.to <= r.from) {
            return { success: false, name, error: `${BAND_LABELS[r.key]}: age To must be greater than age From` };
          }
        }
        for (let i = 1; i < ranges.length; i++) {
          if (ranges[i].from < ranges[i - 1].to) {
            return {
              success: false,
              name,
              error: `Age bands overlap: ${BAND_LABELS[ranges[i].key]} starts before ${BAND_LABELS[ranges[i - 1].key]} ends`,
            };
          }
        }
      }

      try {
        const payload = buildPayload();
        let saved: FDAddon;
        if (d._isNew) {
          saved = await fdCreateAddon(packageId, payload);
        } else {
          if (!d.id) throw new Error("Missing addon id");
          saved = await fdUpdateAddon(d.id, payload);
        }
        if (t === "multi_day_tour") {
          const daysPayload = days.map((day) => ({
            day_number: day.day_number,
            title: day.title,
            description: day.description || null,
            includes: day.includes || null,
            meals_included: day.meals_included,
            overnight_city_id: day.overnight_city_id || null,
            accommodation_note: day.accommodation_note || null,
            image_url: day.image_url || null,
          }));
          const savedDays = await fdReplaceAddonItinerary(saved.id, daysPayload);
          saved = { ...saved, fd_addon_itinerary_days: savedDays };
        }
        return { success: true, name, saved };
      } catch (e) {
        return { success: false, name, error: e instanceof Error ? e.message : "Save failed" };
      }
    },
  }));

  const nameDisplay = (draft.name ?? "").trim() || "(unnamed)";
  const priceUnitList = type === "multi_day_tour" ? [] : PRICE_UNIT_OPTIONS[type];

  return (
    <div className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/40 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
        </button>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          {dirty && (
            <span
              className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
              aria-label="Unsaved changes"
            />
          )}
          <span className={cn("text-sm font-semibold truncate", !(draft.name ?? "").trim() && "text-muted-foreground italic")}>
            {nameDisplay}
          </span>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {ADDON_TYPE_LABEL[type]}
          </span>
          {draft.is_mandatory && (
            <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Mandatory
            </span>
          )}
          {draft._isNew && (
            <span className="shrink-0 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Unsaved
            </span>
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDeleteRequest}
          title="Delete add-on"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Eiffel Tower Summit Access"
                value={draft.name ?? ""}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={3}
                placeholder="Optional details agents see when picking this add-on..."
                value={draft.description ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <Switch
                checked={!!draft.is_mandatory}
                onCheckedChange={(v) => onChange({ is_mandatory: v })}
              />
              <Label className="text-sm">Mandatory</Label>
              <span className="text-xs text-muted-foreground">
                Auto-added to every booking, not optional for the agent.
              </span>
            </div>

            {/* Type-specific primary fields */}
            {type === "multi_day_tour" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Duration (days) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.duration_days ?? 1}
                  onChange={(e) => onChange({ duration_days: Number(e.target.value) || 1 })}
                />
              </div>
            )}

            {type === "transfer" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Transfer Type</Label>
                  <Input
                    placeholder="e.g. PVT, SIC"
                    value={draft.transfer_type ?? ""}
                    onChange={(e) => onChange({ transfer_type: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Transfer Mode</Label>
                  <Input
                    placeholder="e.g. Sedan, Coach"
                    value={draft.transfer_mode ?? ""}
                    onChange={(e) => onChange({ transfer_mode: e.target.value })}
                  />
                </div>
              </>
            )}

            {type === "day_tour" && (
              <>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Switch
                    checked={!!draft.tour_includes_transfer}
                    onCheckedChange={(v) =>
                      onChange({
                        tour_includes_transfer: v,
                        tour_transfer_type: v ? draft.tour_transfer_type : "",
                      })
                    }
                  />
                  <Label className="text-sm">Tour Includes Transfer</Label>
                </div>
                {draft.tour_includes_transfer && (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <Label className="text-xs">Tour Transfer Type</Label>
                    <Input
                      placeholder="e.g. Seat in Coach, Private"
                      value={draft.tour_transfer_type ?? ""}
                      onChange={(e) => onChange({ tour_transfer_type: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Per-add-on age bands */}
          <AddonAgeBandsSection
            draft={draft}
            packageBands={packageBands}
            onChange={onChange}
          />

          {/* Pricing */}
          <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pricing</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Adult ({getEffectiveBandRange(draft, packageBands, "adult").from}-
                  {getEffectiveBandRange(draft, packageBands, "adult").to})
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.price_adult ?? ""}
                  onChange={(e) =>
                    onChange({
                      price_adult: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Child ({getEffectiveBandRange(draft, packageBands, "child").from}-
                  {getEffectiveBandRange(draft, packageBands, "child").to})
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.price_child ?? ""}
                  onChange={(e) =>
                    onChange({
                      price_child: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Infant ({getEffectiveBandRange(draft, packageBands, "infant").from}-
                  {getEffectiveBandRange(draft, packageBands, "infant").to})
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.price_infant ?? ""}
                  onChange={(e) =>
                    onChange({
                      price_infant: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Max Capacity</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={draft.max_capacity ?? ""}
                  onChange={(e) =>
                    onChange({
                      max_capacity: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            {type !== "multi_day_tour" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Price Unit</Label>
                <Select
                  value={draft.price_unit ?? "_none"}
                  onValueChange={(v) => onChange({ price_unit: v === "_none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select price unit..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {priceUnitList.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Inclusions / Exclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Inclusions</Label>
              <BulletListInput
                value={draft.inclusions ?? []}
                onChange={(v) => onChange({ inclusions: v })}
                placeholder="What's included..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Exclusions</Label>
              <BulletListInput
                value={draft.exclusions ?? []}
                onChange={(v) => onChange({ exclusions: v })}
                placeholder="What's excluded..."
              />
            </div>
          </div>

          {/* Multi-day nested itinerary */}
          {type === "multi_day_tour" && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nested Itinerary
              </div>

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
                      Custom meals here are scoped to this add-on only.
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

              <div className="flex flex-col gap-2">
                {addonDays.map((day, idx) => (
                  <AddonDayCard
                    key={day.day_number}
                    day={day}
                    otherDays={addonDays
                      .map((d) => d.day_number)
                      .filter((n) => n !== day.day_number)}
                    allMealOptions={allMealOptions}
                    onChange={(patch) => updateDay(idx, patch)}
                    onToggleMeal={(m) => toggleMeal(idx, m)}
                    onClear={() => updateDay(idx, emptyDay(day.day_number))}
                    onCopy={(targets) => {
                      setAddonDays((prev) =>
                        prev.map((d) =>
                          targets.includes(d.day_number)
                            ? {
                                ...d,
                                description: day.description,
                                includes: day.includes,
                                meals_included: [...day.meals_included],
                                overnight_city_id: day.overnight_city_id,
                                accommodation_note: day.accommodation_note,
                                image_url: day.image_url,
                              }
                            : d,
                        ),
                      );
                      toast.success(
                        `Copied to ${targets.length} day${targets.length === 1 ? "" : "s"}`,
                      );
                    }}
                    overnightCitySearchFn={overnightCitySearchFn}
                    overnightCityFetchByValue={overnightCityFetchByValue}
                    countriesSelected={countriesSelected}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
});

AddonCard.displayName = "AddonCard";

interface AddonAgeBandsSectionProps {
  draft: DraftAddon;
  packageBands: FDAgePolicy[];
  onChange: (patch: Partial<DraftAddon>) => void;
}

function AddonAgeBandsSection({ draft, packageBands, onChange }: AddonAgeBandsSectionProps) {
  const useCustom = !!draft.use_custom_age_policy;
  const [editorOpen, setEditorOpen] = useState(useCustom);

  useEffect(() => {
    if (useCustom) setEditorOpen(true);
  }, [useCustom]);

  const handleEdge = (key: BandKey, edge: "from" | "to", val: string) => {
    const num = val === "" ? null : Number(val);
    if (!useCustom) {
      // First edit: seed all six fields from package bands so the override is fully specified.
      const patch: Partial<DraftAddon> = { use_custom_age_policy: true };
      for (const k of BAND_KEYS) {
        const pb = getPackageBandRange(packageBands, k);
        const f = `custom_${k}_age_from` as const;
        const t = `custom_${k}_age_to` as const;
        patch[f] = k === key && edge === "from" ? num : pb.from;
        patch[t] = k === key && edge === "to" ? num : pb.to;
      }
      onChange(patch);
      return;
    }
    onChange({ [`custom_${key}_age_${edge}`]: num } as Partial<DraftAddon>);
  };

  const handleReset = () => {
    onChange({
      use_custom_age_policy: false,
      custom_infant_age_from: null,
      custom_infant_age_to: null,
      custom_child_age_from: null,
      custom_child_age_to: null,
      custom_adult_age_from: null,
      custom_adult_age_to: null,
    });
    setEditorOpen(false);
  };

  const summary = bandsSummary(draft, packageBands);

  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Age Bands
          </span>
          {useCustom && (
            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Custom
            </span>
          )}
        </div>
        {!editorOpen && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setEditorOpen(true)}
          >
            Change Age
          </Button>
        )}
      </div>

      {!editorOpen && <div className="text-sm">{summary}</div>}

      {editorOpen && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Band</span>
            <span>Age From</span>
            <span>Age To</span>
          </div>
          {BAND_KEYS.map((k) => {
            const range = getEffectiveBandRange(draft, packageBands, k);
            return (
              <div key={k} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center">
                <div className="text-sm font-medium">{BAND_LABELS[k]}</div>
                <Input
                  type="number"
                  min={0}
                  className="h-8"
                  value={range.from}
                  onChange={(e) => handleEdge(k, "from", e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  className="h-8"
                  value={range.to}
                  onChange={(e) => handleEdge(k, "to", e.target.value)}
                />
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={handleReset}
            >
              Reset to Package Bands
            </Button>
            {!useCustom && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AddonDayCardProps {
  day: AddonDayState;
  otherDays: number[];
  allMealOptions: string[];
  onChange: (patch: Partial<AddonDayState>) => void;
  onToggleMeal: (m: string) => void;
  onClear: () => void;
  onCopy: (targets: number[]) => void;
  overnightCitySearchFn: (search: string) => Promise<IOption[]>;
  overnightCityFetchByValue: (id: string) => Promise<IOption | null>;
  countriesSelected: boolean;
}

function AddonDayCard({
  day,
  otherDays,
  allMealOptions,
  onChange,
  onToggleMeal,
  onClear,
  onCopy,
  overnightCitySearchFn,
  overnightCityFetchByValue,
  countriesSelected,
}: AddonDayCardProps) {
  const [isOpen, setIsOpen] = useState(day.day_number === 1);
  const [clearOpen, setClearOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySelected, setCopySelected] = useState<Set<number>>(new Set());
  const [copyConfirm, setCopyConfirm] = useState(false);

  const allSelected = otherDays.length > 0 && copySelected.size === otherDays.length;

  const toggleAll = () => {
    if (allSelected) setCopySelected(new Set());
    else setCopySelected(new Set(otherDays));
  };

  const togglePick = (n: number) => {
    setCopySelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const confirmCopy = () => {
    onCopy(Array.from(copySelected).sort((a, b) => a - b));
    setCopyConfirm(false);
    setCopyOpen(false);
    setCopySelected(new Set());
  };

  const meals = day.meals_included;
  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
        </button>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          <span className="text-sm font-semibold shrink-0">Day {day.day_number}</span>
          <span className={cn("text-sm truncate", day.title ? "" : "text-muted-foreground italic")}>
            {day.title || "No title"}
          </span>
          {mealsSummary(meals) && (
            <>
              <span className="text-muted-foreground/50 shrink-0">·</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {mealsSummary(meals)}
              </span>
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
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="text-sm font-medium mb-2">Copy Day {day.day_number} to:</div>
            {otherDays.length === 0 ? (
              <div className="text-xs text-muted-foreground">No other days available.</div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                  <Checkbox
                    id={`addon-day-${day.day_number}-all`}
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor={`addon-day-${day.day_number}-all`} className="text-xs">
                    Select All
                  </Label>
                </div>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {otherDays.map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <Checkbox
                        id={`addon-day-${day.day_number}-target-${n}`}
                        checked={copySelected.has(n)}
                        onCheckedChange={() => togglePick(n)}
                      />
                      <Label
                        htmlFor={`addon-day-${day.day_number}-target-${n}`}
                        className="text-xs"
                      >
                        Day {n}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => copySelected.size > 0 && setCopyConfirm(true)}
                  disabled={copySelected.size === 0}
                >
                  Copy to {copySelected.size} {copySelected.size === 1 ? "day" : "days"}
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
          onClick={() => setClearOpen(true)}
          title="Clear day"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Day Title</Label>
            <Input
              placeholder={`Day ${day.day_number}`}
              value={day.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              placeholder="Describe the day's plan..."
              value={day.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Includes</Label>
            <Textarea
              rows={2}
              placeholder="What's included today..."
              value={day.includes}
              onChange={(e) => onChange({ includes: e.target.value })}
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
                <PopoverContent
                  className="w-72 max-h-[280px] overflow-y-auto p-2"
                  align="start"
                  onWheelCapture={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-1">
                    {allMealOptions.map((m) => (
                      <div
                        key={m}
                        className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer"
                        onClick={() => onToggleMeal(m)}
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
                        onClick={() => onToggleMeal(m)}
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
              <Autocomplete
                mode="server"
                value={day.overnight_city_id ?? undefined}
                onChange={(v) => onChange({ overnight_city_id: v || null })}
                onSearch={overnightCitySearchFn}
                fetchByValue={overnightCityFetchByValue}
                placeholder={
                  countriesSelected
                    ? "Search overnight city..."
                    : "Select countries in Tab 1 first"
                }
                disabled={!countriesSelected}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label className="text-xs">Accommodation Note</Label>
              <Input
                placeholder="e.g. 4-star hotel, Deluxe Room"
                value={day.accommodation_note}
                onChange={(e) => onChange({ accommodation_note: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label className="text-xs">Image URL</Label>
              <Input
                placeholder="https://..."
                value={day.image_url}
                onChange={(e) => onChange({ image_url: e.target.value })}
              />
              {day.image_url && /^https?:\/\//i.test(day.image_url) && (
                <div className="mt-1 h-32 w-full overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={day.image_url}
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
        </div>
      )}

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content on Day {day.day_number}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onClear(); setClearOpen(false); }}>
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copyConfirm} onOpenChange={setCopyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite content on{" "}
              {Array.from(copySelected)
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

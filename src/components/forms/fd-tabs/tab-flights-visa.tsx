"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import isEqual from "lodash/isEqual";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fdGetFlights,
  fdReplaceFlights,
  fdGetVisa,
  fdUpsertVisa,
  fdGetTaxes,
  fdReplaceTaxes,
  fdGetPackage,
} from "@/data-access/fixed-departures";
import type {
  FDFlightSegment,
  FDVisa,
  FDTax,
  FDValueType,
  FDPackageDetail,
} from "@/types/fixed-departures";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";
import { cn } from "@/lib/utils";

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

// ── Flight types ─────────────────────────────────────────────────────

interface SegmentRow {
  flight_type: string;
  airline: string;
  origin_city: string;
  origin_airport: string;
  destination_city: string;
  destination_airport: string;
  departure_time: string;
  arrival_time: string;
}

interface GroupState {
  name: string;
  included: boolean;
  segments: SegmentRow[];
}

const EMPTY_SEGMENT: SegmentRow = {
  flight_type: "internal",
  airline: "",
  origin_city: "",
  origin_airport: "",
  destination_city: "",
  destination_airport: "",
  departure_time: "",
  arrival_time: "",
};

function emptyGroup(name: string): GroupState {
  return { name, included: true, segments: [{ ...EMPTY_SEGMENT }] };
}

// Flat fd_flights[] → grouped form.
function groupFlights(flights: FDFlightSegment[]): GroupState[] {
  const sorted = [...flights].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const map = new Map<string, GroupState>();
  for (const f of sorted) {
    const name = f.flight_group ?? "";
    const seg: SegmentRow = {
      flight_type: f.flight_type ?? "internal",
      airline: f.airline ?? "",
      origin_city: f.origin_city ?? "",
      origin_airport: f.origin_airport ?? "",
      destination_city: f.destination_city ?? "",
      destination_airport: f.destination_airport ?? "",
      departure_time: f.departure_time ?? "",
      arrival_time: f.arrival_time ?? "",
    };
    const existing = map.get(name);
    if (existing) {
      existing.segments.push(seg);
    } else {
      map.set(name, {
        name,
        included: f.is_included ?? true,
        segments: [seg],
      });
    }
  }
  return Array.from(map.values());
}

// Grouped form → flat fd_flights[] payload (sort_order assigned).
function flattenFlights(groups: GroupState[]): Array<Omit<FDFlightSegment, "id" | "package_id">> {
  const rows: Array<Omit<FDFlightSegment, "id" | "package_id">> = [];
  let sort = 0;
  for (const g of groups) {
    for (const seg of g.segments) {
      rows.push({
        flight_group: g.name || null,
        flight_type: seg.flight_type || null,
        airline: seg.airline || null,
        origin_city: seg.origin_city || null,
        origin_airport: seg.origin_airport || null,
        destination_city: seg.destination_city || null,
        destination_airport: seg.destination_airport || null,
        departure_time: seg.departure_time || null,
        arrival_time: seg.arrival_time || null,
        is_direct: null,
        stops: null,
        sort_order: sort++,
        is_included: g.included,
        price_on_request: null,
      });
    }
  }
  return rows;
}

// ── Visa types ──────────────────────────────────────────────────────

interface VisaState {
  visa_included: boolean;
  visa_type: string;
  price_adult: number | null;
  price_child: number | null;
  price_infant: number | null;
  notes: string;
  insurance_included: boolean;
  insurance_price_adult: number | null;
  insurance_price_child: number | null;
  insurance_price_infant: number | null;
  insurance_notes: string;
  use_custom_age_policy: boolean;
  custom_infant_age_from: number | null;
  custom_infant_age_to: number | null;
  custom_child_age_from: number | null;
  custom_child_age_to: number | null;
  custom_adult_age_from: number | null;
  custom_adult_age_to: number | null;
}

const EMPTY_VISA: VisaState = {
  visa_included: false,
  visa_type: "",
  price_adult: null,
  price_child: null,
  price_infant: null,
  notes: "",
  insurance_included: false,
  insurance_price_adult: null,
  insurance_price_child: null,
  insurance_price_infant: null,
  insurance_notes: "",
  use_custom_age_policy: false,
  custom_infant_age_from: null,
  custom_infant_age_to: null,
  custom_child_age_from: null,
  custom_child_age_to: null,
  custom_adult_age_from: null,
  custom_adult_age_to: null,
};

function visaFromServer(v: FDVisa | null): VisaState {
  if (!v) return EMPTY_VISA;
  return {
    visa_included: !!v.visa_included,
    visa_type: v.visa_type ?? "",
    price_adult: v.price_adult ?? null,
    price_child: v.price_child ?? null,
    price_infant: v.price_infant ?? null,
    notes: v.notes ?? "",
    insurance_included: !!v.insurance_included,
    insurance_price_adult: v.insurance_price_adult ?? null,
    insurance_price_child: v.insurance_price_child ?? null,
    insurance_price_infant: v.insurance_price_infant ?? null,
    insurance_notes: v.insurance_notes ?? "",
    use_custom_age_policy: !!v.use_custom_age_policy,
    custom_infant_age_from: v.custom_infant_age_from ?? null,
    custom_infant_age_to: v.custom_infant_age_to ?? null,
    custom_child_age_from: v.custom_child_age_from ?? null,
    custom_child_age_to: v.custom_child_age_to ?? null,
    custom_adult_age_from: v.custom_adult_age_from ?? null,
    custom_adult_age_to: v.custom_adult_age_to ?? null,
  };
}

// ── Taxes types ─────────────────────────────────────────────────────

interface TaxRow {
  name: string;
  amount: number | null;
  value_type: FDValueType;
  basis: string;
  included: boolean;
}

const EMPTY_TAX: TaxRow = {
  name: "",
  amount: null,
  value_type: "percentage",
  basis: "total_amount",
  included: true,
};

const TAX_BASIS_OPTIONS = [
  { value: "total_amount", label: "Total amount" },
  { value: "per_adult", label: "Per adult" },
  { value: "per_pax", label: "Per pax" },
];

function taxFromServer(t: FDTax): TaxRow {
  return {
    name: t.name ?? "",
    amount: t.amount ?? null,
    value_type: (t.value_type ?? "percentage") as FDValueType,
    basis: t.basis ?? "total_amount",
    included: t.included ?? true,
  };
}

function taxesToPayload(rows: TaxRow[]): Array<Omit<FDTax, "id" | "package_id">> {
  return rows.map((r, idx) => ({
    name: r.name,
    amount: r.amount,
    value_type: r.value_type,
    basis: r.basis || null,
    included: r.included,
    sort_order: idx,
  }));
}

// ── Age band helpers (visa) ─────────────────────────────────────────

type BandKey = "infant" | "child" | "adult";
const BAND_KEYS: BandKey[] = ["infant", "child", "adult"];
const BAND_LABELS: Record<BandKey, string> = { infant: "Infant", child: "Child", adult: "Adult" };
const FALLBACK_BANDS: Record<BandKey, { from: number; to: number }> = {
  infant: { from: 0, to: 1 },
  child: { from: 2, to: 11 },
  adult: { from: 12, to: 99 },
};

function getPackageBand(pkg: FDPackageDetail | undefined, key: BandKey): { from: number; to: number } {
  const bands = (pkg?.fd_age_policies ?? []) as Array<{ band_name: string; age_from: number; age_to: number }>;
  const match = bands.find((b) => b.band_name?.toLowerCase() === key);
  if (match) return { from: match.age_from, to: match.age_to };
  return FALLBACK_BANDS[key];
}

function getEffectiveBand(visa: VisaState, pkg: FDPackageDetail | undefined, key: BandKey): { from: number; to: number } {
  if (visa.use_custom_age_policy) {
    const f = visa[`custom_${key}_age_from` as keyof VisaState] as number | null;
    const t = visa[`custom_${key}_age_to` as keyof VisaState] as number | null;
    const pkgBand = getPackageBand(pkg, key);
    return { from: f ?? pkgBand.from, to: t ?? pkgBand.to };
  }
  return getPackageBand(pkg, key);
}

function bandLabel(visa: VisaState, pkg: FDPackageDetail | undefined, key: BandKey): string {
  const r = getEffectiveBand(visa, pkg, key);
  return `${BAND_LABELS[key]} (${r.from}–${r.to} yrs)`;
}

// Tailwind needs literal class strings to include them in the build.
function bandGridClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  return "grid-cols-3";
}

// ── Component ───────────────────────────────────────────────────────

export const FDFlightsVisaTab = forwardRef<FDTabHandle, Props>(function FDFlightsVisaTab(
  { mode, packageId, onSaved, onAdvance: _onAdvance, onDirtyChange },
  ref,
) {
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [visa, setVisa] = useState<VisaState>(EMPTY_VISA);
  const [taxes, setTaxes] = useState<TaxRow[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set([0]));

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId, "for-flights-visa"],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });

  const { data: flightsData } = useQuery<FDFlightSegment[]>({
    queryKey: ["fd-package", packageId, "flights"],
    queryFn: () => fdGetFlights(packageId as string),
    enabled: !!packageId,
  });

  const { data: visaData } = useQuery<FDVisa | null>({
    queryKey: ["fd-package", packageId, "visa"],
    queryFn: () => fdGetVisa(packageId as string),
    enabled: !!packageId,
  });

  const { data: taxesData } = useQuery<FDTax[]>({
    queryKey: ["fd-package", packageId, "taxes"],
    queryFn: () => fdGetTaxes(packageId as string),
    enabled: !!packageId,
  });

  // Baselines are state (not refs) so updating them after save triggers a
  // re-render and the dirty memos recompute. With refs the memo deps would
  // see only the unchanged live value and keep returning the cached `true`.
  const [flightsBaseline, setFlightsBaseline] = useState<GroupState[]>([]);
  const [visaBaseline, setVisaBaseline] = useState<VisaState>(EMPTY_VISA);
  const [taxesBaseline, setTaxesBaseline] = useState<TaxRow[]>([]);

  useEffect(() => {
    if (hydrated) return;
    if (flightsData === undefined || visaData === undefined || taxesData === undefined) return;
    const initialGroups = flightsData.length > 0 ? groupFlights(flightsData) : [emptyGroup("")];
    const initialVisa = visaFromServer(visaData ?? null);
    const initialTaxes = (taxesData ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(taxFromServer);
    setGroups(initialGroups);
    setVisa(initialVisa);
    setTaxes(initialTaxes);
    setFlightsBaseline(initialGroups);
    setVisaBaseline(initialVisa);
    setTaxesBaseline(initialTaxes);
    setOpenGroups(new Set([0]));
    setHydrated(true);
  }, [flightsData, visaData, taxesData, hydrated]);

  const flightsDirty = useMemo(() => !isEqual(groups, flightsBaseline), [groups, flightsBaseline]);
  const visaDirty = useMemo(() => !isEqual(visa, visaBaseline), [visa, visaBaseline]);
  const taxesDirty = useMemo(() => !isEqual(taxes, taxesBaseline), [taxes, taxesBaseline]);
  const isDirty = hydrated && (flightsDirty || visaDirty || taxesDirty);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);
  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitImpl = async (): Promise<boolean> => {
    if (!packageId) {
      toast.error("Save Tab 1 first");
      return false;
    }
    // Validate: every group must have a non-empty unique name; every segment must have at least an airline or city.
    const trimmedNames = groups.map((g) => g.name.trim());
    if (trimmedNames.some((n) => !n)) {
      toast.error("Every flight group needs a name");
      return false;
    }
    const dupes = trimmedNames.filter((n, i) => trimmedNames.indexOf(n) !== i);
    if (dupes.length > 0) {
      toast.error(`Duplicate flight group name: ${dupes[0]}`);
      return false;
    }
    setIsSaving(true);
    try {
      if (flightsDirty) {
        const trimmedGroups = groups.map((g) => ({ ...g, name: g.name.trim() }));
        await fdReplaceFlights(packageId, flattenFlights(trimmedGroups));
        setFlightsBaseline(trimmedGroups);
        setGroups(trimmedGroups);
      }
      if (visaDirty) {
        await fdUpsertVisa(packageId, {
          visa_included: visa.visa_included,
          visa_type: visa.visa_type || null,
          price_adult: visa.price_adult,
          price_child: visa.price_child,
          price_infant: visa.price_infant,
          notes: visa.notes || null,
          insurance_included: visa.insurance_included,
          insurance_price_adult: visa.insurance_price_adult,
          insurance_price_child: visa.insurance_price_child,
          insurance_price_infant: visa.insurance_price_infant,
          insurance_notes: visa.insurance_notes || null,
          use_custom_age_policy: visa.use_custom_age_policy,
          custom_infant_age_from: visa.custom_infant_age_from,
          custom_infant_age_to: visa.custom_infant_age_to,
          custom_child_age_from: visa.custom_child_age_from,
          custom_child_age_to: visa.custom_child_age_to,
          custom_adult_age_from: visa.custom_adult_age_from,
          custom_adult_age_to: visa.custom_adult_age_to,
        });
        setVisaBaseline(visa);
      }
      if (taxesDirty) {
        await fdReplaceTaxes(packageId, taxesToPayload(taxes));
        setTaxesBaseline(taxes);
      }
      toast.success(mode === "create" ? "Flights & Visa saved" : "Flights & Visa updated");
      onSaved();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: async () => submitImpl(),
  }));

  // ── Flight group operations ───────────────────────────────────────

  const addGroup = () => {
    setGroups((prev) => {
      const idx = prev.length + 1;
      const next = [...prev, emptyGroup(`Group ${idx}`)];
      setOpenGroups((og) => new Set([...og, next.length - 1]));
      return next;
    });
  };

  const removeGroup = (groupIdx: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== groupIdx));
    setOpenGroups((og) => {
      const next = new Set<number>();
      for (const i of og) {
        if (i < groupIdx) next.add(i);
        else if (i > groupIdx) next.add(i - 1);
      }
      return next;
    });
  };

  const updateGroup = (groupIdx: number, patch: Partial<GroupState>) => {
    setGroups((prev) => prev.map((g, i) => (i === groupIdx ? { ...g, ...patch } : g)));
  };

  const addSegment = (groupIdx: number) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === groupIdx ? { ...g, segments: [...g.segments, { ...EMPTY_SEGMENT }] } : g)),
    );
  };

  const removeSegment = (groupIdx: number, segIdx: number) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIdx) return g;
        if (g.segments.length <= 1) return g;
        return { ...g, segments: g.segments.filter((_, si) => si !== segIdx) };
      }),
    );
  };

  const updateSegment = (groupIdx: number, segIdx: number, patch: Partial<SegmentRow>) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== groupIdx ? g : { ...g, segments: g.segments.map((s, si) => (si === segIdx ? { ...s, ...patch } : s)) },
      ),
    );
  };

  const toggleGroupOpen = (idx: number) => {
    setOpenGroups((og) => {
      const next = new Set(og);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── Tax operations ────────────────────────────────────────────────

  const addTax = () => setTaxes((prev) => [...prev, { ...EMPTY_TAX }]);
  const removeTax = (idx: number) => setTaxes((prev) => prev.filter((_, i) => i !== idx));
  const updateTax = (idx: number, patch: Partial<TaxRow>) =>
    setTaxes((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

  // ── Visa custom age policy ────────────────────────────────────────

  const enableCustomAge = () => {
    if (visa.use_custom_age_policy) return;
    // Seed all 6 fields from package bands so the override is fully specified.
    const seed: Partial<VisaState> = { use_custom_age_policy: true };
    for (const k of BAND_KEYS) {
      const pb = getPackageBand(pkg, k);
      seed[`custom_${k}_age_from` as const] = pb.from;
      seed[`custom_${k}_age_to` as const] = pb.to;
    }
    setVisa((v) => ({ ...v, ...seed }));
  };

  const resetCustomAge = () => {
    setVisa((v) => ({
      ...v,
      use_custom_age_policy: false,
      custom_infant_age_from: null,
      custom_infant_age_to: null,
      custom_child_age_from: null,
      custom_child_age_to: null,
      custom_adult_age_from: null,
      custom_adult_age_to: null,
    }));
  };

  const updateCustomBand = (key: BandKey, edge: "from" | "to", val: string) => {
    const num = val === "" ? null : Number(val);
    setVisa((v) => ({ ...v, [`custom_${key}_age_${edge}`]: num }));
  };

  const removeCustomBand = (key: BandKey) => {
    setVisa((v) => ({
      ...v,
      [`custom_${key}_age_from`]: null,
      [`custom_${key}_age_to`]: null,
      ...(key === "infant" ? { price_infant: null, insurance_price_infant: null } : {}),
      ...(key === "child" ? { price_child: null, insurance_price_child: null } : {}),
      ...(key === "adult" ? { price_adult: null, insurance_price_adult: null } : {}),
    }));
  };

  const activeBands: BandKey[] = useMemo(() => {
    if (!visa.use_custom_age_policy) return BAND_KEYS;
    return BAND_KEYS.filter((k) => {
      const f = visa[`custom_${k}_age_from` as keyof VisaState] as number | null;
      const t = visa[`custom_${k}_age_to` as keyof VisaState] as number | null;
      return !(f === null && t === null);
    });
  }, [visa]);

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save & Next</div>
      </div>
    );
  }

  if (!hydrated) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }

  const currency = (pkg?.currency as string | null | undefined) || "$";

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submitImpl(); }} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Flights & Visa</h2>
        <p className="text-muted-foreground">Define flight groups, visa & insurance details, and taxes</p>
      </div>

      {/* ── FLIGHTS ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flights</span>
          <Button type="button" size="sm" variant="outline" onClick={addGroup}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {groups.map((group, gIdx) => {
            const isOpen = openGroups.has(gIdx);
            return (
              <div key={gIdx} className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => toggleGroupOpen(gIdx)}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                  </button>
                  <Input
                    className="h-8 max-w-xs"
                    placeholder="Group name (e.g. Internal Flights)"
                    value={group.name}
                    onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                  />
                  <div className="flex-1" />
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      id={`group-included-${gIdx}`}
                      checked={group.included}
                      onCheckedChange={(c) => updateGroup(gIdx, { included: !!c })}
                    />
                    <label htmlFor={`group-included-${gIdx}`} className="text-xs text-muted-foreground select-none">
                      {group.included ? "Included" : "Excluded"}
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeGroup(gIdx)}
                    aria-label="Remove group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isOpen && (
                  <div className="border-t px-3 pb-3 pt-3 flex flex-col gap-3">
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="outline" onClick={() => addSegment(gIdx)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Segment
                      </Button>
                    </div>

                    {group.segments.map((seg, sIdx) => (
                      <div key={sIdx} className="rounded-md border bg-background p-3 flex flex-col gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={seg.flight_type}
                              onValueChange={(v) => updateSegment(gIdx, sIdx, { flight_type: v })}
                            >
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="internal">Internal</SelectItem>
                                <SelectItem value="main_sector">Main Sector</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Airline</Label>
                            <Input
                              className="h-8"
                              placeholder="e.g. Air India"
                              value={seg.airline}
                              onChange={(e) => updateSegment(gIdx, sIdx, { airline: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Departure Time</Label>
                            <Input
                              type="time"
                              className="h-8"
                              value={seg.departure_time}
                              onChange={(e) => updateSegment(gIdx, sIdx, { departure_time: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Arrival Time</Label>
                            <Input
                              type="time"
                              className="h-8"
                              value={seg.arrival_time}
                              onChange={(e) => updateSegment(gIdx, sIdx, { arrival_time: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_36px] gap-2 items-end">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">From City</Label>
                            <Input
                              className="h-8"
                              placeholder="e.g. Mumbai"
                              value={seg.origin_city}
                              onChange={(e) => updateSegment(gIdx, sIdx, { origin_city: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">From Airport</Label>
                            <Input
                              className="h-8"
                              placeholder="e.g. BOM"
                              value={seg.origin_airport}
                              onChange={(e) => updateSegment(gIdx, sIdx, { origin_airport: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">To City</Label>
                            <Input
                              className="h-8"
                              placeholder="e.g. Delhi"
                              value={seg.destination_city}
                              onChange={(e) => updateSegment(gIdx, sIdx, { destination_city: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">To Airport</Label>
                            <Input
                              className="h-8"
                              placeholder="e.g. DEL"
                              value={seg.destination_airport}
                              onChange={(e) => updateSegment(gIdx, sIdx, { destination_airport: e.target.value })}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeSegment(gIdx, sIdx)}
                            disabled={group.segments.length <= 1}
                            title={group.segments.length <= 1 ? "At least one segment per group" : "Remove segment"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Excluded means cost not included in package. Per-departure flight pricing is set in Tab 6 — Departure Dates.
        </p>
      </section>

      {/* ── VISA & INSURANCE ─────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visa & Insurance</span>
        <div className="rounded-lg border-2 border-muted bg-accent/30 p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visa */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Visa</span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="visa-included"
                    checked={visa.visa_included}
                    onCheckedChange={(c) => setVisa((v) => ({ ...v, visa_included: !!c }))}
                  />
                  <label htmlFor="visa-included" className="text-xs text-muted-foreground select-none">
                    {visa.visa_included ? "Included" : "Excluded"}
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Visa type / name</Label>
                <Input
                  className="h-8"
                  placeholder="e.g. USA Visa"
                  value={visa.visa_type}
                  onChange={(e) => setVisa((v) => ({ ...v, visa_type: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Add pricing even if excluded — shown as optional cost to agents</p>
              <div className={cn("grid gap-2", bandGridClass(activeBands.length))}>
                {activeBands.map((k) => {
                  const valKey = `price_${k}` as const;
                  return (
                    <div key={k} className="flex flex-col gap-1">
                      <Label className="text-xs">{bandLabel(visa, pkg, k)}</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{currency}</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8"
                          value={visa[valKey] ?? ""}
                          onChange={(e) =>
                            setVisa((v) => ({
                              ...v,
                              [valKey]: e.target.value === "" ? null : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. USA Visa Charges are excluded."
                  value={visa.notes}
                  onChange={(e) => setVisa((v) => ({ ...v, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Insurance */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Insurance</span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="insurance-included"
                    checked={visa.insurance_included}
                    onCheckedChange={(c) => setVisa((v) => ({ ...v, insurance_included: !!c }))}
                  />
                  <label htmlFor="insurance-included" className="text-xs text-muted-foreground select-none">
                    {visa.insurance_included ? "Included" : "Excluded"}
                  </label>
                </div>
              </div>
              <div className={cn("grid gap-2 mt-[26px]", bandGridClass(activeBands.length))}>
                {activeBands.map((k) => {
                  const valKey = `insurance_price_${k}` as const;
                  return (
                    <div key={k} className="flex flex-col gap-1">
                      <Label className="text-xs">{bandLabel(visa, pkg, k)}</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{currency}</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8"
                          value={visa[valKey] ?? ""}
                          onChange={(e) =>
                            setVisa((v) => ({
                              ...v,
                              [valKey]: e.target.value === "" ? null : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Overseas Mediclaim Policy (any age) as per Tour included."
                  value={visa.insurance_notes}
                  onChange={(e) => setVisa((v) => ({ ...v, insurance_notes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Custom age policy (shared) */}
          <div className="border-t pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Age Bands</span>
                {visa.use_custom_age_policy && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">Custom</span>
                )}
              </div>
              {!visa.use_custom_age_policy ? (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-emerald-700" onClick={enableCustomAge}>
                  Use custom age policy
                </Button>
              ) : (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={resetCustomAge}>
                  Reset to package bands
                </Button>
              )}
            </div>
            {visa.use_custom_age_policy && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[80px_1fr_1fr_32px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Band</span>
                  <span>Age From</span>
                  <span>Age To</span>
                  <span />
                </div>
                {activeBands.map((k) => {
                  const fKey = `custom_${k}_age_from` as const;
                  const tKey = `custom_${k}_age_to` as const;
                  return (
                    <div key={k} className="grid grid-cols-[80px_1fr_1fr_32px] gap-2 items-center">
                      <div className="text-sm font-medium">{BAND_LABELS[k]}</div>
                      <Input
                        type="number"
                        min={0}
                        className="h-8"
                        value={(visa[fKey] as number | null) ?? ""}
                        onChange={(e) => updateCustomBand(k, "from", e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0}
                        className="h-8"
                        value={(visa[tKey] as number | null) ?? ""}
                        onChange={(e) => updateCustomBand(k, "to", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCustomBand(k)}
                        disabled={activeBands.length <= 1}
                        title={activeBands.length <= 1 ? "At least one band must remain" : `Remove ${BAND_LABELS[k]} band`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TAXES ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Taxes <span className="ml-1 rounded-full bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 text-[10px]">{taxes.length}</span>
          </span>
          <Button type="button" size="sm" variant="outline" onClick={addTax}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Tax
          </Button>
        </div>

        {taxes.length === 0 ? (
          <div className="text-sm text-muted-foreground italic rounded-md border border-dashed p-3">No taxes added.</div>
        ) : (
          <Accordion type="single" collapsible defaultValue="taxes">
            <AccordionItem value="taxes" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
                Tax Rules
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[2fr_1fr_120px_180px_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                    <span>Name</span>
                    <span>Amount</span>
                    <span>Type</span>
                    <span>Basis</span>
                    <span />
                  </div>
                  {taxes.map((tax, idx) => (
                    <div key={idx} className="grid grid-cols-[2fr_1fr_120px_180px_36px] gap-2 items-center">
                      <Input
                        className="h-8"
                        placeholder="e.g. GST"
                        value={tax.name}
                        onChange={(e) => updateTax(idx, { name: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8"
                        value={tax.amount ?? ""}
                        onChange={(e) =>
                          updateTax(idx, { amount: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                      <ChargeTypeToggle
                        value={tax.value_type}
                        onChange={(v) => updateTax(idx, { value_type: v })}
                      />
                      <Select value={tax.basis} onValueChange={(v) => updateTax(idx, { basis: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TAX_BASIS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeTax(idx)}
                        aria-label="Remove tax"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </section>

      <button type="submit" className="hidden" disabled={isSaving} aria-hidden="true" tabIndex={-1} />
    </form>
  );
});

FDFlightsVisaTab.displayName = "FDFlightsVisaTab";

interface ChargeTypeToggleProps {
  value: FDValueType;
  onChange: (v: FDValueType) => void;
}

function ChargeTypeToggle({ value, onChange }: ChargeTypeToggleProps) {
  return (
    <div className="inline-flex h-8 rounded-md border bg-background overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => onChange("percentage")}
        className={cn(
          "px-3 transition-colors",
          value === "percentage" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        %
      </button>
      <button
        type="button"
        onClick={() => onChange("fixed")}
        className={cn(
          "px-3 transition-colors border-l",
          value === "fixed" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        Fixed
      </button>
    </div>
  );
}

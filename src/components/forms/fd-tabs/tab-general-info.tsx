"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import isEqual from "lodash/isEqual";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { Autocomplete } from "@/components/ui/autocomplete";
import { ImagePicker } from "@/components/ui/image-picker";
import {
  fdGetCountries,
  fdGetCitiesByCountry,
  fdGetCitiesGlobal,
  fdGetCurrencies,
  fdGetPackageCountries,
  fdGetPackageCities,
  fdCreatePackage,
  fdUpdatePackage,
  fdReplacePackageCountries,
  fdReplacePackageCities,
  fdReplaceAgePolicies,
} from "@/data-access/fixed-departures";
import { FDGeneralInfoSchema, type IFDGeneralInfo } from "@/components/forms/schemas/fixed-departures-schema";
import type { FDPackageDetail, FDCity } from "@/types/fixed-departures";
import type { IOption } from "@/types/common";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";

const DEFAULT_AGE_BANDS = [
  { band_name: "Infant", age_from: 0, age_to: 1, band_order: 1 },
  { band_name: "Child", age_from: 2, age_to: 11, band_order: 2 },
  { band_name: "Adult", age_from: 12, age_to: 99, band_order: 3 },
];

// Stable empty-array sentinel — avoids new-reference-on-every-render when useQuery returns undefined
const EMPTY_ROWS: never[] = [];

const FALLBACK_CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD", "SGD"];

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  initialData: FDPackageDetail | null;
  onSaved: (newId?: string) => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const FDGeneralInfoTab = forwardRef<FDTabHandle, Props>(function FDGeneralInfoTab({
  mode,
  packageId,
  initialData,
  onSaved,
  onAdvance: _onAdvance,
  onDirtyChange,
}, ref) {
  const [isSaving, setIsSaving] = useState(false);

  const { data: countries = [] } = useQuery({
    queryKey: ["fd-meta-countries"],
    queryFn: fdGetCountries,
    staleTime: 30 * 60 * 1000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["fd-meta-currencies"],
    queryFn: fdGetCurrencies,
    staleTime: 30 * 60 * 1000,
  });

  const { data: existingPkgCountries = EMPTY_ROWS } = useQuery({
    queryKey: ["fd-pkg-countries", packageId],
    queryFn: () => fdGetPackageCountries(packageId as string),
    enabled: !!packageId,
  });

  const { data: existingPkgCities = EMPTY_ROWS } = useQuery({
    queryKey: ["fd-pkg-cities", packageId],
    queryFn: () => fdGetPackageCities(packageId as string),
    enabled: !!packageId,
  });

  const form = useForm<IFDGeneralInfo>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(FDGeneralInfoSchema) as any,
    defaultValues: {
      name: "",
      tour_code: "",
      country_ids: [],
      city_ids: [],
      departure_city_id: null,
      duration_nights: 7,
      max_group_size: null,
      currency: null,
      status: "active",
      age_restriction: false,
      min_age: null,
      max_age: null,
      banner_image_url: "",
      description: "",
      age_policies: DEFAULT_AGE_BANDS,
    },
  });

  const { fields: ageFields, update: updateAgeBand, remove: removeAgeBand } = useFieldArray({ control: form.control, name: "age_policies" });

  // Derive stable ID arrays from query data. When the query is loading, existingPkg* is EMPTY_ROWS
  // (a stable module-level reference), so these memos don't recompute every render. When the
  // query resolves, existingPkg* gets a new reference → memos recompute → scalar keys change →
  // the reset effect fires exactly once per data transition. No infinite loops.
  const existingCountryIds = useMemo(
    () => existingPkgCountries.map((c) => c.id),
    [existingPkgCountries],
  );
  const existingCityIds = useMemo(
    () => existingPkgCities.map((c) => c.id),
    [existingPkgCities],
  );
  const countryIdsKey = existingCountryIds.join(",");
  const cityIdsKey = existingCityIds.join(",");

  // Baseline values for value-comparison dirty tracking. Updated on every
  // hydration and after every successful save; isDirty is then derived by
  // deep-comparing live form values against this baseline. Solves the RHF
  // quirk where `formState.isDirty` doesn't auto-revert when a user types and
  // then erases (the field stays in `dirtyFields` even when value matches
  // default).
  const baselineRef = useRef<IFDGeneralInfo | null>(null);

  useEffect(() => {
    console.count("[FD-DEBUG] Tab1:hydrate-effect");
    if (!initialData) return;
    const next: IFDGeneralInfo = {
      id: initialData.id,
      name: (initialData.name as string) ?? "",
      tour_code: (initialData.tour_code as string | null) ?? "",
      country_ids: existingCountryIds,
      city_ids: existingCityIds,
      departure_city_id: (initialData.departure_city_id as string | null) ?? null,
      duration_nights: (initialData.duration_nights as number | null) ?? 7,
      max_group_size: (initialData.max_group_size as number | null) ?? null,
      currency: (initialData.currency as string | null) ?? null,
      status: ((initialData.status as "active" | "inactive" | null) ?? "active"),
      age_restriction: (initialData.age_restriction as boolean | null) ?? false,
      min_age: (initialData.min_age as number | null) ?? null,
      max_age: (initialData.max_age as number | null) ?? null,
      banner_image_url: (initialData.banner_image_url as string | null) ?? "",
      description: (initialData.description as string | null) ?? "",
      age_policies:
        Array.isArray(initialData.fd_age_policies) && initialData.fd_age_policies.length > 0
          ? initialData.fd_age_policies
              .map((b) => ({
                band_name: b.band_name,
                age_from: b.age_from,
                age_to: b.age_to,
                band_order: b.band_order,
              }))
              .sort((a, b) => a.band_order - b.band_order)
          : DEFAULT_AGE_BANDS,
    };
    form.reset(next);
    baselineRef.current = next;
    // countryIdsKey/cityIdsKey are scalar proxies for existingCountryIds/existingCityIds — using
    // them as deps means the effect fires when IDs actually change, not on every array reference
    // rotation caused by inline `= []` defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, countryIdsKey, cityIdsKey]);

  const selectedCountries = form.watch("country_ids") ?? [];
  const selectedCities = form.watch("city_ids") ?? [];
  const ageRestriction = form.watch("age_restriction");
  const bannerUrl = form.watch("banner_image_url");

  const countryLabelMap = useMemo(
    () => Object.fromEntries(existingPkgCountries.map((c) => [c.id, c.country_name])),
    [existingPkgCountries],
  );
  const cityLabelMap = useMemo(
    () => Object.fromEntries(existingPkgCities.map((c) => [c.id, (c as FDCity).city_name])),
    [existingPkgCities],
  );

  // Only clear cities/departure when the user explicitly removes all countries (length goes
  // from >0 to 0). Ignores transitions that happen during form.reset() hydration where
  // country_ids starts as [] and was never non-empty.
  const prevCountriesLenRef = useRef(0);
  useEffect(() => {
    console.count("[FD-DEBUG] Tab1:country-clear-effect");
    const prev = prevCountriesLenRef.current;
    prevCountriesLenRef.current = selectedCountries.length;
    if (selectedCountries.length === 0 && prev > 0) {
      if (selectedCities.length > 0) form.setValue("city_ids", []);
      if (form.getValues("departure_city_id") != null) form.setValue("departure_city_id", null);
    }
  }, [selectedCountries, selectedCities, form]);

  const currencyCodes = useMemo(() => {
    if (currencies.length > 0) return currencies.map((c) => c.code);
    return FALLBACK_CURRENCIES;
  }, [currencies]);

  // Countries fetch: client-side prefix filter over the loaded list
  const countriesFetchFn = useCallback(
    async (search: string) => {
      const q = search.trim().toLowerCase();
      return countries
        .filter((c) => !q || c.country_name.toLowerCase().startsWith(q))
        .map((c) => ({ id: c.id, label: c.country_name }));
    },
    [countries]
  );

  // Cities fetch: prefix search across all selected countries, merged + deduped
  const citiesFetchFn = useCallback(
    async (search: string): Promise<{ id: string; label: string }[]> => {
      if (selectedCountries.length === 0) return [];
      const all = await Promise.all(
        selectedCountries.map((cid) => fdGetCitiesByCountry(cid, search || undefined))
      );
      const map = new Map<string, string>();
      for (const city of (all.flat() as FDCity[])) map.set(city.id, city.city_name);
      return Array.from(map.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    [selectedCountries]
  );

  // Departure city fetch: global search across all countries via single endpoint
  const departureCitySearchFn = useCallback(
    async (search: string): Promise<IOption[]> => {
      const q = search.trim();
      if (!q) return [];
      const cities = await fdGetCitiesGlobal(q);
      return cities
        .map((c) => ({ value: c.id, label: c.city_name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    []
  );

  // Hydrate departure city label in edit mode
  const departureCityFetchByValue = useCallback(
    async (id: string): Promise<IOption | null> => {
      const existing = existingPkgCities.find((c) => c.id === id);
      if (existing) return { value: existing.id, label: (existing as FDCity).city_name };
      return null;
    },
    [existingPkgCities]
  );

  const submitImpl = async (values: IFDGeneralInfo): Promise<boolean> => {
    setIsSaving(true);
    try {
      const packagePayload = {
        name: values.name,
        tour_code: values.tour_code || null,
        description: values.description || null,
        banner_image_url: values.banner_image_url || null,
        departure_city_id: values.departure_city_id || null,
        duration_nights: values.duration_nights,
        max_group_size: values.max_group_size ?? null,
        currency: values.currency || null,
        status: values.status,
        age_restriction: values.age_restriction,
        min_age: values.age_restriction ? values.min_age ?? null : null,
        max_age: values.age_restriction ? values.max_age ?? null : null,
      };

      let currentId = packageId;
      if (!currentId) {
        const created = await fdCreatePackage(packagePayload);
        currentId = created.id;
      } else {
        await fdUpdatePackage(currentId, packagePayload);
      }

      if (!currentId) throw new Error("Package id was not returned by create");

      const errors: string[] = [];
      try {
        await fdReplacePackageCountries(currentId, values.country_ids);
      } catch (e) {
        errors.push(`Countries: ${e instanceof Error ? e.message : "failed"}`);
      }
      try {
        await fdReplacePackageCities(currentId, values.city_ids);
      } catch (e) {
        errors.push(`Cities: ${e instanceof Error ? e.message : "failed"}`);
      }
      try {
        await fdReplaceAgePolicies(currentId, values.age_policies);
      } catch (e) {
        errors.push(`Age policies: ${e instanceof Error ? e.message : "failed"}`);
      }

      if (errors.length > 0) {
        toast.error(`Saved package, but some steps failed: ${errors.join("; ")}`);
      } else if (mode === "create") {
        toast.success("Package created");
      } else {
        toast.success("Package saved");
      }

      onSaved(mode === "create" ? currentId : undefined);
      form.reset(values, { keepValues: true });
      baselineRef.current = values;
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = (values: IFDGeneralInfo) => { void submitImpl(values); };

  // Dirty propagation — compares live values against the hydration/save
  // baseline so a typed-then-reverted field correctly clears dirty.
  const watched = useWatch({ control: form.control });
  const isDirty = useMemo(
    () => baselineRef.current !== null && !isEqual(watched, baselineRef.current),
    [watched],
  );
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    console.count("[FD-DEBUG] Tab1:dirty-report-effect");
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);
  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      const valid = await form.trigger();
      if (!valid) {
        toast.error("Fix form errors before saving");
        return false;
      }
      return submitImpl(form.getValues());
    },
  }));

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">Enter the basic details about this fixed departure</p>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Identity</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Package Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Maldives Luxury Escape" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tour Code</Label>
            <Input placeholder="e.g. EUR-LUX-7N" {...form.register("tour_code")} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Locations</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Countries</Label>
            <Controller
              control={form.control}
              name="country_ids"
              render={({ field }) => (
                <MultiSelectSearch
                  placeholder="Search countries..."
                  fetchFn={countriesFetchFn}
                  value={field.value}
                  onChange={field.onChange}
                  initialLabelMap={countryLabelMap}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Cities {selectedCountries.length === 0 && <span className="text-xs text-muted-foreground">(select countries first)</span>}
            </Label>
            <Controller
              control={form.control}
              name="city_ids"
              render={({ field }) => (
                <MultiSelectSearch
                  placeholder={selectedCountries.length === 0 ? "Select countries first" : "Search cities..."}
                  fetchFn={citiesFetchFn}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={selectedCountries.length === 0}
                  initialLabelMap={cityLabelMap}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-full">
            <Label>Departure City</Label>
            <Controller
              control={form.control}
              name="departure_city_id"
              render={({ field }) => (
                <Autocomplete
                  mode="server"
                  value={field.value ?? undefined}
                  onChange={(v) => field.onChange(v || null)}
                  onSearch={departureCitySearchFn}
                  fetchByValue={departureCityFetchByValue}
                  placeholder={selectedCountries.length === 0 ? "Select countries first" : "Search departure city..."}
                  disabled={selectedCountries.length === 0}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Trip Details</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Duration (nights)</Label>
            <Input type="number" min={1} {...form.register("duration_nights", { valueAsNumber: true })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Max Group Size</Label>
            <Input
              type="number"
              min={0}
              placeholder="No limit"
              {...form.register("max_group_size", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Currency</Label>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value ?? "_none"} onValueChange={(v) => field.onChange(v === "_none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {currencyCodes.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Restrictions</span>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="age_restriction"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>Age Restriction</Label>
          </div>
          {ageRestriction && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
              <div className="flex flex-col gap-1.5">
                <Label>Min Age</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register("min_age", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Max Age</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register("max_age", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                />
                {form.formState.errors.max_age && (
                  <p className="text-xs text-destructive">{form.formState.errors.max_age.message}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Media &amp; Description</span>
        <div className="flex flex-col gap-4">
          <ImagePicker
            label="Banner Image"
            value={bannerUrl || null}
            onChange={(url) => form.setValue("banner_image_url", url ?? "", { shouldDirty: true })}
            aspectRatio="16/9"
            size="lg"
            packageId={packageId}
          />
          {form.formState.errors.banner_image_url && (
            <p className="text-xs text-destructive">{form.formState.errors.banner_image_url.message}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea rows={4} placeholder="Package description..." {...form.register("description")} />
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue="age">
        <AccordionItem value="age" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">Age Policies</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[120px_1fr_1fr_32px] gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Band Type</span>
                <span>Age From</span>
                <span>Age To</span>
                <span />
              </div>
              {ageFields.map((band, idx) => {
                const lastOne = ageFields.length === 1;
                return (
                  <div key={band.id} className="grid grid-cols-[120px_1fr_1fr_32px] gap-3 items-center">
                    <div className="text-sm font-medium">{band.band_name}</div>
                    <Input
                      type="number"
                      min={0}
                      className="h-8"
                      value={form.watch(`age_policies.${idx}.age_from`)}
                      onChange={(e) =>
                        updateAgeBand(idx, {
                          ...form.getValues(`age_policies.${idx}`),
                          age_from: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      className="h-8"
                      value={form.watch(`age_policies.${idx}.age_to`)}
                      onChange={(e) =>
                        updateAgeBand(idx, {
                          ...form.getValues(`age_policies.${idx}`),
                          age_to: Number(e.target.value),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAgeBand(idx)}
                      disabled={lastOne}
                      title={lastOne ? "At least one band must remain" : `Remove ${band.band_name} band`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              {form.formState.errors.age_policies && (
                <p className="text-xs text-destructive">
                  {(form.formState.errors.age_policies as { message?: string }).message ??
                    "Fix age band errors"}
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Hidden submit so Enter key still triggers save via parent */}
      <button type="submit" className="hidden" disabled={isSaving} aria-hidden="true" tabIndex={-1} />
    </form>
  );
});

FDGeneralInfoTab.displayName = "FDGeneralInfoTab";

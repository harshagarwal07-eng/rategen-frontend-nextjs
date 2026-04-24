"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, ChevronRight, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  fdGetCountries,
  fdGetCitiesByCountry,
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

const DEFAULT_AGE_BANDS = [
  { band_name: "Infant", age_from: 0, age_to: 2, band_order: 1 },
  { band_name: "Child", age_from: 2, age_to: 12, band_order: 2 },
  { band_name: "Teen", age_from: 12, age_to: 18, band_order: 3 },
  { band_name: "Adult", age_from: 18, age_to: 99, band_order: 4 },
];

const FALLBACK_CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD", "SGD"];

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  initialData: FDPackageDetail | null;
  onSaved: (newId?: string) => void;
  onAdvance: () => void;
}

export function FDGeneralInfoTab({ mode, packageId, initialData, onSaved, onAdvance }: Props) {
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

  const { data: existingPkgCountries = [] } = useQuery({
    queryKey: ["fd-pkg-countries", packageId],
    queryFn: () => fdGetPackageCountries(packageId as string),
    enabled: !!packageId,
  });

  const { data: existingPkgCities = [] } = useQuery({
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

  const { fields: ageFields, update: updateAgeBand } = useFieldArray({ control: form.control, name: "age_policies" });

  useEffect(() => {
    if (!initialData) return;
    form.reset({
      id: initialData.id,
      name: (initialData.name as string) ?? "",
      tour_code: (initialData.tour_code as string | null) ?? "",
      country_ids: existingPkgCountries.map((c) => c.id),
      city_ids: existingPkgCities.map((c) => c.id),
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
    });
  }, [initialData, existingPkgCountries, existingPkgCities, form]);

  const selectedCountries = form.watch("country_ids") ?? [];
  const selectedCities = form.watch("city_ids") ?? [];
  const ageRestriction = form.watch("age_restriction");
  const bannerUrl = form.watch("banner_image_url");

  const citiesQueries = useQuery({
    queryKey: ["fd-cities-for-countries", selectedCountries],
    queryFn: async () => {
      if (selectedCountries.length === 0) return [] as FDCity[];
      const all = await Promise.all(selectedCountries.map((cid) => fdGetCitiesByCountry(cid)));
      const flat: FDCity[] = all.flat();
      const map = new Map<string, FDCity>();
      for (const c of flat) map.set(c.id, c);
      return Array.from(map.values()).sort((a, b) => a.city_name.localeCompare(b.city_name));
    },
    enabled: selectedCountries.length > 0,
    staleTime: 15 * 60 * 1000,
  });

  const availableCities = citiesQueries.data ?? [];

  useEffect(() => {
    if (selectedCountries.length === 0 && selectedCities.length > 0) {
      form.setValue("city_ids", []);
    } else if (availableCities.length > 0) {
      const allowed = new Set(availableCities.map((c) => c.id));
      const kept = selectedCities.filter((id) => allowed.has(id));
      if (kept.length !== selectedCities.length) form.setValue("city_ids", kept);
    }
  }, [selectedCountries, availableCities, selectedCities, form]);

  const currencyCodes = useMemo(() => {
    if (currencies.length > 0) return currencies.map((c) => c.code);
    return FALLBACK_CURRENCIES;
  }, [currencies]);

  const onSubmit = async (values: IFDGeneralInfo) => {
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
      if (mode === "create") {
        const created = await fdCreatePackage(packagePayload);
        currentId = created.id;
      } else {
        if (!currentId) throw new Error("Missing package id for edit");
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

      if (mode === "create") onAdvance();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
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

        <div className="flex flex-col gap-1.5">
          <Label>Countries</Label>
          <Controller
            control={form.control}
            name="country_ids"
            render={({ field }) => (
              <MultiPicker
                placeholder="Select countries..."
                options={countries.map((c) => ({ value: c.id, label: c.country_name }))}
                values={field.value}
                onChange={field.onChange}
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
              <MultiPicker
                placeholder={selectedCountries.length === 0 ? "Select countries first" : "Select cities..."}
                options={availableCities.map((c) => ({ value: c.id, label: c.city_name }))}
                values={field.value}
                onChange={field.onChange}
                disabled={selectedCountries.length === 0}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Departure City</Label>
          <Controller
            control={form.control}
            name="departure_city_id"
            render={({ field }) => (
              <SinglePicker
                placeholder={selectedCountries.length === 0 ? "Select countries first" : "Select departure city..."}
                options={availableCities.map((c) => ({ value: c.id, label: c.city_name }))}
                value={field.value ?? null}
                onChange={(v) => field.onChange(v)}
                disabled={selectedCountries.length === 0}
              />
            )}
          />
        </div>

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

        <div className="flex flex-col gap-1.5 col-span-full">
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
            <div className="grid grid-cols-2 gap-4 pl-10 mt-2">
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

        <div className="flex flex-col gap-1.5 col-span-full">
          <Label>Banner Image URL</Label>
          <Input placeholder="https://..." {...form.register("banner_image_url")} />
          {form.formState.errors.banner_image_url && (
            <p className="text-xs text-destructive">{form.formState.errors.banner_image_url.message}</p>
          )}
          {bannerUrl && /^https?:\/\//i.test(bannerUrl) && (
            <div className="mt-2 h-32 w-full overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt="Banner preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 col-span-full">
          <Label>Description</Label>
          <Textarea rows={4} placeholder="Package description..." {...form.register("description")} />
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue="age">
        <AccordionItem value="age">
          <AccordionTrigger>Age Policies</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              {ageFields.map((band, idx) => (
                <div key={band.id} className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
                  <div className="text-sm font-medium">{band.band_name}</div>
                  <div>
                    <Label className="text-xs">Age From</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.watch(`age_policies.${idx}.age_from`)}
                      onChange={(e) =>
                        updateAgeBand(idx, {
                          ...form.getValues(`age_policies.${idx}`),
                          age_from: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Age To</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.watch(`age_policies.${idx}.age_to`)}
                      onChange={(e) =>
                        updateAgeBand(idx, {
                          ...form.getValues(`age_policies.${idx}`),
                          age_to: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
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
    </form>
  );
}

interface PickerOption {
  value: string;
  label: string;
}

function MultiPicker({
  placeholder,
  options,
  values,
  onChange,
  disabled,
}: {
  placeholder: string;
  options: PickerOption[];
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("min-h-9 h-auto w-full justify-between px-3 py-1.5 font-normal", values.length === 0 && "text-muted-foreground")}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedLabels.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selectedLabels.slice(0, 5).map((l) => (
                <Badge key={l} variant="secondary" className="text-[11px] font-normal py-0 px-1.5">{l}</Badge>
              ))
            )}
            {selectedLabels.length > 5 && <span className="text-xs">+{selectedLabels.length - 5}</span>}
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    onSelect={() => {
                      onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value]);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                    {o.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {values.length > 0 && (
          <div className="border-t px-2 py-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{values.length} selected</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange([])}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SinglePicker({
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: {
  placeholder: string;
  options: PickerOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("h-9 w-full justify-between px-3 font-normal", !label && "text-muted-foreground")}
        >
          {label ?? placeholder}
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value == null ? "opacity-100" : "opacity-0")} />
                <span className="italic text-muted-foreground">None</span>
              </CommandItem>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

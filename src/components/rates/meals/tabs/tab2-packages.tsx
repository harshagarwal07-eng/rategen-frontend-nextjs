"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, createRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertModal } from "@/components/ui/alert-modal";
import { Plus, Trash2, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createPackage,
  updatePackage,
  deletePackage,
  replaceAgePolicies,
  replacePricing,
  replaceCancellationPolicies,
} from "@/data-access/meals";
import { MealPackage, MealCuisine, MealProduct, MealAgePolicies, MealPricing, MealCancellationPolicy } from "@/types/meals";

// ── Types ──────────────────────────────────────────────────────

type PackageStateEntry = MealPackage & { _localId: string };

export type PackageCardHandle = {
  save: () => Promise<SaveResult>;
};

type SaveResult =
  | { success: true; name: string; updatedPkg: PackageStateEntry }
  | { success: false; name: string; error: string };

// ── Defaults ──────────────────────────────────────────────────

const DEFAULT_AGE_BANDS = [
  { band_type: "adult" as const, age_from: 12, age_to: 99, amount: 0 },
  { band_type: "child" as const, age_from: 3, age_to: 11, amount: 0 },
  { band_type: "infant" as const, age_from: 0, age_to: 2, amount: 0 },
];

const TYPE_LABELS: Record<string, string> = {
  veg: "Veg",
  "non-veg": "Non-Veg",
  "veg-non-veg": "Veg & Non-Veg",
};

// ── Schemas ───────────────────────────────────────────────────

const AgeBandRowSchema = z.object({
  band_type: z.enum(["adult", "child", "infant"]),
  age_from: z.coerce.number().min(0),
  age_to: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
});

const CancellationPolicyRowSchema = z.object({
  from_days: z.coerce.number().min(0),
  to_days: z.coerce.number().min(0),
  date_anchor: z.enum(["after_booking", "before_service"]),
  penalty_type: z.enum(["percentage", "fixed"]),
  penalty_amount: z.coerce.number().min(0),
});

const PackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  type: z.enum(["veg", "non-veg", "veg-non-veg"]),
  cuisine_id: z.string().nullable().optional(),
  venue_name: z.string().nullable().optional(),
  menu_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  inclusions: z.string().nullable().optional(),
  exclusions: z.string().nullable().optional(),
  is_preferred: z.boolean().optional(),
  is_non_refundable: z.boolean().optional(),
  age_bands: z.array(AgeBandRowSchema),
  cancellation_policies: z.array(CancellationPolicyRowSchema),
});

type PackageFormValues = z.infer<typeof PackageFormSchema>;

// ── Helpers ───────────────────────────────────────────────────

function getDuplicateName(originalName: string, existingNames: string[]): string {
  const base = `${originalName} (Copy)`;
  if (!existingNames.includes(base)) return base;
  let i = 1;
  while (existingNames.includes(`${originalName} (Copy ${i})`)) i++;
  return `${originalName} (Copy ${i})`;
}

// ── Cancellation Policy Section ───────────────────────────────

interface CancellationSectionProps {
  form: ReturnType<typeof useForm<PackageFormValues>>;
}

function CancellationSection({ form }: CancellationSectionProps) {
  const isNonRefundable = form.watch("is_non_refundable");
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cancellation_policies",
  });

  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">
        Cancellation Policy
      </span>

      <FormField
        control={form.control}
        name="is_non_refundable"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <FormLabel className="text-xs font-medium mt-0">Non-Refundable</FormLabel>
            <FormControl>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) form.setValue("cancellation_policies", []);
                }}
              />
            </FormControl>
            {field.value && (
              <span className="text-xs text-muted-foreground">
                100% charge applies. No cancellation rules needed.
              </span>
            )}
          </div>
        )}
      />

      {!isNonRefundable && (
        <>
          {fields.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <div className="grid grid-cols-[80px_80px_180px_110px_80px_32px] gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[600px]">
                <span>From</span>
                <span>To</span>
                <span>Date</span>
                <span>Charge Type</span>
                <span>Amount</span>
                <span />
              </div>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[80px_80px_180px_110px_80px_32px] items-center gap-2 px-3 py-1.5 border-b last:border-b-0 min-w-[600px]"
                >
                  <FormField
                    control={form.control}
                    name={`cancellation_policies.${index}.from_days`}
                    render={({ field: f }) => (
                      <Input type="number" min={0} className="h-7 text-xs" {...f} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`cancellation_policies.${index}.to_days`}
                    render={({ field: f }) => (
                      <Input type="number" min={0} className="h-7 text-xs" {...f} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`cancellation_policies.${index}.date_anchor`}
                    render={({ field: f }) => (
                      <Select onValueChange={f.onChange} value={f.value}>
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="after_booking">After booking date</SelectItem>
                          <SelectItem value="before_service">Before service date</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`cancellation_policies.${index}.penalty_type`}
                    render={({ field: f }) => (
                      <div className="flex rounded border p-0.5">
                        {(["percentage", "fixed"] as const).map((ct) => (
                          <button
                            key={ct}
                            type="button"
                            onClick={() => f.onChange(ct)}
                            className={cn(
                              "flex-1 rounded px-1 py-0.5 text-xs font-medium transition-colors",
                              f.value === ct
                                ? "bg-green-600 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {ct === "percentage" ? "%" : "Fixed"}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`cancellation_policies.${index}.penalty_amount`}
                    render={({ field: f }) => (
                      <Input type="number" min={0} step="0.01" className="h-7 text-xs" {...f} />
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-7 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              append({ from_days: 0, to_days: 7, date_anchor: "before_service", penalty_type: "percentage", penalty_amount: 100 })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add Rule
          </Button>
        </>
      )}
    </div>
  );
}

// ── PackageCard ───────────────────────────────────────────────

interface PackageCardProps {
  mealId: string;
  pkg: PackageStateEntry;
  cuisines: MealCuisine[];
  currency: string;
  onDeleted: () => void;
  onDuplicate: (liveValues: PackageFormValues) => void;
  onDirtyChange: (localId: string, isDirty: boolean) => void;
}

const PackageCard = forwardRef<PackageCardHandle, PackageCardProps>(
  function PackageCard({ mealId, pkg, cuisines, currency, onDeleted, onDuplicate, onDirtyChange }, ref) {
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isPending = !pkg.id;

    const pkgRef = useRef(pkg);
    pkgRef.current = pkg;

    const defaultAgeBands: PackageFormValues["age_bands"] =
      pkg.meal_age_policies && pkg.meal_age_policies.length > 0
        ? pkg.meal_age_policies.map((ap) => {
            const pricing = pkg.meal_pricing?.find((p) => p.band_type === ap.band_type);
            return {
              band_type: ap.band_type as "adult" | "child" | "infant",
              age_from: ap.age_from,
              age_to: ap.age_to,
              amount: pricing?.amount ?? 0,
            };
          })
        : DEFAULT_AGE_BANDS;

    const form = useForm<PackageFormValues>({
      resolver: zodResolver(PackageFormSchema),
      defaultValues: {
        name: pkg.name || "New Package",
        type: (pkg.type as "veg" | "non-veg" | "veg-non-veg") || "veg",
        cuisine_id: pkg.cuisine_id || null,
        venue_name: pkg.venue_name || null,
        menu_url: pkg.menu_url || null,
        description: pkg.description || null,
        inclusions: pkg.inclusions || null,
        exclusions: pkg.exclusions || null,
        is_preferred: pkg.is_preferred || false,
        is_non_refundable: pkg.is_non_refundable ?? false,
        age_bands: defaultAgeBands,
        cancellation_policies:
          pkg.meal_cancellation_policies?.map((cp) => ({
            from_days: cp.from_days,
            to_days: cp.to_days,
            date_anchor: cp.date_anchor as "after_booking" | "before_service",
            penalty_type: cp.penalty_type as "percentage" | "fixed",
            penalty_amount: cp.penalty_amount,
          })) || [],
      },
    });

    const { fields: ageBandFields, append: appendBand, remove: removeBand } = useFieldArray({
      control: form.control,
      name: "age_bands",
    });

    const watchName = form.watch("name");
    const watchType = form.watch("type");
    const watchCuisineId = form.watch("cuisine_id");
    const watchAgeBands = form.watch("age_bands");
    const cuisineName = cuisines.find((c) => c.id === watchCuisineId)?.name || "—";
    const adultBand = watchAgeBands.find((b) => b.band_type === "adult");
    const rateDisplay =
      adultBand !== undefined ? `${adultBand.amount} ${currency}` : "—";

    const { isDirty } = form.formState;
    const isCardDirty = isDirty || isPending;

    const onDirtyChangeRef = useRef(onDirtyChange);
    onDirtyChangeRef.current = onDirtyChange;
    const localIdRef = useRef(pkg._localId);
    localIdRef.current = pkg._localId;
    const lastReportedCardDirty = useRef<boolean | undefined>(undefined);

    useEffect(() => {
      if (lastReportedCardDirty.current !== isCardDirty) {
        lastReportedCardDirty.current = isCardDirty;
        onDirtyChangeRef.current(localIdRef.current, isCardDirty);
      }
    }, [isCardDirty]);

    useImperativeHandle(ref, () => ({
      save: async (): Promise<SaveResult> => {
        const currentPkg = pkgRef.current;
        const values = form.getValues();
        const { age_bands, cancellation_policies, is_non_refundable, ...meta } = values;
        const pkgMeta = {
          name: meta.name,
          type: meta.type,
          cuisine_id: meta.cuisine_id || null,
          venue_name: meta.venue_name || null,
          menu_url: meta.menu_url || null,
          description: meta.description || null,
          inclusions: meta.inclusions || null,
          exclusions: meta.exclusions || null,
          is_preferred: meta.is_preferred,
          is_non_refundable: is_non_refundable ?? false,
        };

        try {
          let savedPkg: MealPackage;
          if (currentPkg.id) {
            const { data, error } = await updatePackage(mealId, currentPkg.id, pkgMeta);
            if (error) throw new Error(error);
            savedPkg = data!;
          } else {
            const { data, error } = await createPackage(mealId, pkgMeta);
            if (error || !data?.id) throw new Error(error || "No package ID returned");
            savedPkg = data!;
          }

          const [ageR, pricingR, cancelR] = await Promise.all([
            replaceAgePolicies(
              mealId,
              savedPkg.id!,
              age_bands.map((b) => ({ band_type: b.band_type, age_from: b.age_from, age_to: b.age_to }))
            ),
            replacePricing(
              mealId,
              savedPkg.id!,
              age_bands.map((b) => ({ band_type: b.band_type, amount: b.amount }))
            ),
            replaceCancellationPolicies(mealId, savedPkg.id!, cancellation_policies),
          ]);

          if (ageR.error || pricingR.error || cancelR.error)
            throw new Error(ageR.error || pricingR.error || cancelR.error || "Save failed");

          const updatedPkg: PackageStateEntry = {
            ...savedPkg,
            _localId: savedPkg.id!,
            meal_age_policies: (ageR.data ?? []) as MealAgePolicies[],
            meal_pricing: (pricingR.data ?? []) as MealPricing[],
            meal_cancellation_policies: (cancelR.data ?? []) as MealCancellationPolicy[],
          };

          form.reset({
            name: updatedPkg.name,
            type: updatedPkg.type,
            cuisine_id: updatedPkg.cuisine_id ?? null,
            venue_name: updatedPkg.venue_name ?? null,
            menu_url: updatedPkg.menu_url ?? null,
            description: updatedPkg.description ?? null,
            inclusions: updatedPkg.inclusions ?? null,
            exclusions: updatedPkg.exclusions ?? null,
            is_preferred: updatedPkg.is_preferred ?? false,
            is_non_refundable: updatedPkg.is_non_refundable ?? false,
            age_bands: (updatedPkg.meal_age_policies ?? []).map((ap) => ({
              band_type: ap.band_type,
              age_from: ap.age_from,
              age_to: ap.age_to,
              amount: (updatedPkg.meal_pricing ?? []).find((p) => p.band_type === ap.band_type)?.amount ?? 0,
            })),
            cancellation_policies: (updatedPkg.meal_cancellation_policies ?? []).map((cp) => ({
              from_days: cp.from_days,
              to_days: cp.to_days,
              date_anchor: cp.date_anchor,
              penalty_type: cp.penalty_type,
              penalty_amount: cp.penalty_amount,
            })),
          });

          return { success: true, name: values.name, updatedPkg };
        } catch (e) {
          return { success: false, name: values.name, error: e instanceof Error ? e.message : "Save failed" };
        }
      },
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <>
        <AlertModal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => { setDeleteOpen(false); onDeleted(); }}
          loading={false}
          title="Remove package?"
          description="This package will be removed. The deletion will be applied to the server when you save."
        />

        <AccordionItem
          value={pkg._localId}
          className="border-2 border-muted bg-accent/30 rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors [&>svg]:hidden group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                {isCardDirty && (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" aria-label="Unsaved changes" />
                )}
                <span className="font-semibold text-sm truncate">
                  {watchName || "New Package"}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {TYPE_LABELS[watchType] ?? watchType}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {cuisineName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                  {rateDisplay}
                </span>
              </div>
              <div
                className="flex items-center gap-1 ml-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => onDuplicate(form.getValues())}
                >
                  <Copy className="h-3 w-3" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant={isPending ? "ghost" : "destructive"}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => {
                    if (isPending) {
                      onDeleted();
                    } else {
                      setDeleteOpen(true);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  {!isPending && "Delete"}
                </Button>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            <Form {...form}>
              <form className="space-y-5 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Premium Buffet" className="h-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="veg">Veg</SelectItem>
                            <SelectItem value="non-veg">Non-Veg</SelectItem>
                            <SelectItem value="veg-non-veg">Veg & Non-Veg</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cuisine_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cuisine</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                          value={field.value || "__none"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select cuisine" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none">None</SelectItem>
                            {cuisines.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="venue_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Garden Restaurant"
                            className="h-9"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="menu_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menu URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            className="h-9"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Describe this package..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inclusions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inclusions</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="What's included..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exclusions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exclusions</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="What's not included..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_preferred"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel className="mt-0">Preferred</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        {field.value ? "Yes" : "No"}
                      </span>
                    </FormItem>
                  )}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Age Bands & Pricing</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendBand({ band_type: "child", age_from: 3, age_to: 11, amount: 0 })
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Band
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    At least one adult band required.
                  </p>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Band Type</th>
                          <th className="px-3 py-2 text-left">Age From</th>
                          <th className="px-3 py-2 text-left">Age To</th>
                          <th className="px-3 py-2 text-left">
                            Rate {currency ? `(${currency})` : ""}
                          </th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {ageBandFields.map((field, index) => (
                          <tr key={field.id} className="border-t">
                            <td className="px-3 py-2">
                              <FormField
                                control={form.control}
                                name={`age_bands.${index}.band_type`}
                                render={({ field: f }) => (
                                  <Select onValueChange={f.onChange} value={f.value}>
                                    <SelectTrigger className="h-8 w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="adult">Adult</SelectItem>
                                      <SelectItem value="child">Child</SelectItem>
                                      <SelectItem value="infant">Infant</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <FormField
                                control={form.control}
                                name={`age_bands.${index}.age_from`}
                                render={({ field: f }) => (
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 w-20 text-xs"
                                    {...f}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <FormField
                                control={form.control}
                                name={`age_bands.${index}.age_to`}
                                render={({ field: f }) => (
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 w-20 text-xs"
                                    {...f}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <FormField
                                control={form.control}
                                name={`age_bands.${index}.amount`}
                                render={({ field: f }) => (
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="h-8 w-24 text-xs"
                                    {...f}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeBand(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {ageBandFields.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-3 text-center text-xs text-muted-foreground"
                            >
                              No bands. Add at least one adult band.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <CancellationSection form={form} />
              </form>
            </Form>
          </AccordionContent>
        </AccordionItem>
      </>
    );
  }
);

// ── MealPackagesForm (wrapper for fullscreen form) ────────────

const DoneFormSchema = z.object({});
type DoneFormValues = z.infer<typeof DoneFormSchema>;

interface MealPackagesFormProps {
  initialData: MealProduct;
  cuisines: MealCuisine[];
  onNext: (data: Record<string, unknown>) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function MealPackagesForm({
  initialData,
  cuisines,
  onNext,
  setIsLoading,
  formRef,
  onDirtyChange,
}: MealPackagesFormProps) {
  const mealId = initialData.id!;
  const currency = initialData.currency || "";

  const [packages, setPackages] = useState<PackageStateEntry[]>(
    (initialData.meal_packages ?? []).map((p) => ({ ...p, _localId: p.id! }))
  );
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<PackageStateEntry[]>([]);
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());

  const cardRefsMap = useRef<Map<string, React.RefObject<PackageCardHandle | null>>>(new Map());

  const form = useForm<DoneFormValues>({ resolver: zodResolver(DoneFormSchema) });

  const anyDirty = dirtySet.size > 0 || pendingDeletes.length > 0;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedAnyDirty = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (lastReportedAnyDirty.current !== anyDirty) {
      lastReportedAnyDirty.current = anyDirty;
      onDirtyChangeRef.current?.(anyDirty);
    }
  }, [anyDirty]);

  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePackageDirtyChange = useCallback((localId: string, isDirty: boolean) => {
    setDirtySet((prev) => {
      const alreadyPresent = prev.has(localId);
      if (isDirty === alreadyPresent) return prev;
      const next = new Set(prev);
      if (isDirty) next.add(localId);
      else next.delete(localId);
      return next;
    });
  }, []);

  const getOrCreateRef = (localId: string): React.RefObject<PackageCardHandle | null> => {
    if (!cardRefsMap.current.has(localId)) {
      cardRefsMap.current.set(localId, createRef<PackageCardHandle>());
    }
    return cardRefsMap.current.get(localId)!;
  };

  const handleAddPackage = () => {
    const localId = `pending-${Date.now()}`;
    const newPkg: PackageStateEntry = {
      _localId: localId,
      name: "New Package",
      type: "veg",
      cuisine_id: null,
      venue_name: null,
      menu_url: null,
      description: null,
      inclusions: null,
      exclusions: null,
      is_preferred: false,
      is_non_refundable: false,
      meal_age_policies: [],
      meal_pricing: [],
      meal_cancellation_policies: [],
    };
    getOrCreateRef(localId);
    setPackages((prev) => [...prev, newPkg]);
    setOpenCards((prev) => [...prev, localId]);
  };

  const handleDuplicate = (index: number, liveValues: PackageFormValues) => {
    const existingNames = packages.map((p) => p.name);
    const newName = getDuplicateName(liveValues.name, existingNames);
    const localId = `pending-${Date.now()}`;
    const newPkg: PackageStateEntry = {
      _localId: localId,
      name: newName,
      type: liveValues.type,
      cuisine_id: liveValues.cuisine_id ?? null,
      venue_name: liveValues.venue_name ?? null,
      menu_url: liveValues.menu_url ?? null,
      description: liveValues.description ?? null,
      inclusions: liveValues.inclusions ?? null,
      exclusions: liveValues.exclusions ?? null,
      is_preferred: liveValues.is_preferred ?? false,
      is_non_refundable: liveValues.is_non_refundable ?? false,
      meal_age_policies: liveValues.age_bands.map((b) => ({
        band_type: b.band_type,
        age_from: b.age_from,
        age_to: b.age_to,
      })),
      meal_pricing: liveValues.age_bands.map((b) => ({
        band_type: b.band_type,
        amount: b.amount,
      })),
      meal_cancellation_policies: liveValues.cancellation_policies.map((cp) => ({
        from_days: cp.from_days,
        to_days: cp.to_days,
        date_anchor: cp.date_anchor,
        penalty_type: cp.penalty_type,
        penalty_amount: cp.penalty_amount,
      })),
    };
    getOrCreateRef(localId);
    setPackages((prev) => [...prev, newPkg]);
    setOpenCards((prev) => [...prev, localId]);
  };

  const handleSaved = (prevLocalId: string, updated: PackageStateEntry) => {
    const newLocalId = updated.id!;
    setPackages((prev) =>
      prev.map((p) => (p._localId === prevLocalId ? { ...updated, _localId: newLocalId } : p))
    );
    if (prevLocalId !== newLocalId) {
      setOpenCards((prev) => prev.map((id) => (id === prevLocalId ? newLocalId : id)));
      const existingRef = cardRefsMap.current.get(prevLocalId);
      if (existingRef) {
        cardRefsMap.current.delete(prevLocalId);
        cardRefsMap.current.set(newLocalId, existingRef);
      }
    }
    setDirtySet((prev) => {
      const next = new Set(prev);
      next.delete(prevLocalId);
      next.delete(newLocalId);
      return next;
    });
  };

  const handleDeleted = (localId: string) => {
    const pkg = packages.find((p) => p._localId === localId);
    if (pkg?.id) {
      setPendingDeletes((prev) => [...prev, pkg]);
    }
    setPackages((prev) => prev.filter((p) => p._localId !== localId));
    setOpenCards((prev) => prev.filter((id) => id !== localId));
    cardRefsMap.current.delete(localId);
    setDirtySet((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  };

  const onSubmit = async () => {
    setIsLoading?.(true);

    const total = packages.length + pendingDeletes.length;
    let saved = 0;
    const failures: string[] = [];

    for (const pkg of pendingDeletes) {
      if (pkg.id) {
        const { error } = await deletePackage(mealId, pkg.id);
        if (error) {
          failures.push(`Package "${pkg.name}" (delete): ${error}`);
        } else {
          saved++;
        }
      }
    }

    const packagesSnapshot = [...packages];
    for (const pkg of packagesSnapshot) {
      const cardRef = cardRefsMap.current.get(pkg._localId);
      if (!cardRef?.current) continue;

      const result = await cardRef.current.save();
      if (result.success) {
        saved++;
        handleSaved(pkg._localId, result.updatedPkg);
      } else {
        failures.push(`Package "${result.name}": ${result.error}`);
      }
    }

    if (failures.length === 0) {
      setPendingDeletes([]);
      toast.success("All packages saved.");
      setIsLoading?.(false);
      onNext({});
    } else {
      const successCount = saved;
      toast.error(
        `Saved ${successCount} of ${total}. ${failures.join(" ")}`
      );
      const failedDeleteNames = failures
        .filter((f) => f.includes("(delete)"))
        .map((f) => f.match(/"([^"]+)" \(delete\)/)?.[1] ?? "");
      setPendingDeletes((prev) => prev.filter((p) => failedDeleteNames.includes(p.name)));
      setIsLoading?.(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Packages</h2>
        <p className="text-muted-foreground">
          Add packages with age bands, pricing, and cancellation policies
        </p>
      </div>

      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="hidden" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {packages.length} package{packages.length !== 1 ? "s" : ""}
          {pendingDeletes.length > 0 && (
            <span className="ml-2 text-yellow-600 text-xs">
              ({pendingDeletes.length} pending deletion)
            </span>
          )}
        </p>
        <Button variant="outline" size="sm" onClick={handleAddPackage}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package
        </Button>
      </div>

      {packages.length === 0 && pendingDeletes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">No packages yet. Add your first package above.</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={openCards}
          onValueChange={setOpenCards}
          className="space-y-3"
        >
          {packages.map((pkg, index) => {
            const cardRef = getOrCreateRef(pkg._localId);
            return (
              <PackageCard
                ref={cardRef as unknown as React.RefObject<PackageCardHandle>}
                key={pkg._localId}
                mealId={mealId}
                pkg={pkg}
                cuisines={cuisines}
                currency={currency}
                onDeleted={() => handleDeleted(pkg._localId)}
                onDuplicate={(liveValues) => handleDuplicate(index, liveValues)}
                onDirtyChange={handlePackageDirtyChange}
              />
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

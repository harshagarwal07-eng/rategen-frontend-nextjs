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
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { AlertModal } from "@/components/ui/alert-modal";
import { Plus, Trash2, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createPackage,
  patchPackage,
  deletePackage,
  replacePackageTiers,
  replacePackageOperationalHours,
  replacePackageSupplements,
} from "@/data-access/guides";
import {
  Guide,
  GuidePackage,
  GuidePackageOperationalHour,
  GuidePackageSupplement,
  GuidePackageTier,
  GuideSupplementMaster,
  Language,
  DayOfWeek,
  GuideType,
  DurationType,
  RateUnit,
} from "@/types/guides";

// ── Types ──────────────────────────────────────────────────────

type PackageStateEntry = GuidePackage & { _localId: string };

export type PackageCardHandle = {
  save: () => Promise<SaveResult>;
};

type SaveResult =
  | { success: true; name: string; updatedPkg: PackageStateEntry }
  | { success: false; name: string; error: string };

// ── Constants ─────────────────────────────────────────────────

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const GUIDE_TYPE_OPTIONS: { value: GuideType; label: string }[] = [
  { value: "local_guide", label: "Local Guide" },
  { value: "tour_manager", label: "Tour Manager" },
  { value: "language_guide", label: "Language Guide" },
  { value: "driver_guide", label: "Driver Guide" },
  { value: "transfer_guide", label: "Transfer Guide" },
];

const DURATION_TYPE_OPTIONS: { value: DurationType; label: string }[] = [
  { value: "half_day", label: "Half Day" },
  { value: "full_day", label: "Full Day" },
  { value: "multi_day", label: "Multi Day" },
  { value: "per_service", label: "Per Service" },
];

const RATE_UNIT_OPTIONS: { value: RateUnit; label: string }[] = [
  { value: "adult", label: "Per Adult" },
  { value: "day", label: "Per Day" },
  { value: "guide", label: "Per Guide" },
  { value: "hour", label: "Per Hour" },
  { value: "unit", label: "Per Unit" },
];

// ── Schemas ───────────────────────────────────────────────────

const OperationalHourRowSchema = z.object({
  day_of_week: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  is_active: z.boolean(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
});

const TierRowSchema = z.object({
  min_pax: z.coerce.number().min(0),
  max_pax: z.union([z.coerce.number().min(0), z.null()]),
  rate_per_guide: z.coerce.number().min(0),
  rate_unit: z.enum(["adult", "day", "guide", "hour", "unit"]).nullable(),
});

const SupplementRowSchema = z.object({
  supplement_id: z.string(),
  supplement_name: z.string(),
  is_included: z.boolean(),
  rate_value: z.coerce.number().nullable(),
  rate_unit: z.enum(["adult", "day", "guide", "hour", "unit"]).nullable(),
  is_per_actuals: z.boolean(),
});

const PackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  guide_type: z.enum(["local_guide", "tour_manager", "language_guide", "driver_guide", "transfer_guide"]),
  duration_type: z.enum(["half_day", "full_day", "multi_day", "per_service"]),
  duration_hours: z.coerce.number().nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean(),
  languages: z.array(z.string()),
  operational_hours: z.array(OperationalHourRowSchema).length(7),
  tiers: z.array(TierRowSchema).min(1, "At least one tier is required"),
  supplements: z.array(SupplementRowSchema),
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

function defaultOpHours(existing?: GuidePackageOperationalHour[]): PackageFormValues["operational_hours"] {
  const byDay = new Map<DayOfWeek, GuidePackageOperationalHour>();
  (existing ?? []).forEach((h) => byDay.set(h.day_of_week, h));
  return DAYS.map(({ key }) => {
    const src = byDay.get(key);
    return {
      day_of_week: key,
      is_active: src?.is_active ?? false,
      start_time: src?.start_time ?? "08:00",
      end_time: src?.end_time ?? "18:00",
    };
  });
}

function sortSupplements<T extends { supplement_name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aIsOvertime = a.supplement_name.toLowerCase().includes("overtime");
    const bIsOvertime = b.supplement_name.toLowerCase().includes("overtime");
    if (aIsOvertime && !bIsOvertime) return -1;
    if (!aIsOvertime && bIsOvertime) return 1;
    return a.supplement_name.localeCompare(b.supplement_name);
  });
}

function mergeSupplements(
  master: GuideSupplementMaster[],
  existing: GuidePackageSupplement[] | undefined,
): PackageFormValues["supplements"] {
  const byId = new Map<string, GuidePackageSupplement>();
  (existing ?? []).forEach((s) => byId.set(s.supplement_id, s));
  const rows: PackageFormValues["supplements"] = master.map((m) => {
    const existingRow = byId.get(m.id);
    return {
      supplement_id: m.id,
      supplement_name: m.name,
      is_included: existingRow?.is_included ?? false,
      rate_value: existingRow?.rate_value ?? null,
      rate_unit: existingRow?.rate_unit ?? null,
      is_per_actuals: existingRow?.is_per_actuals ?? false,
    };
  });
  return sortSupplements(rows);
}

// ── PackageCard ───────────────────────────────────────────────

interface PackageCardProps {
  guideId: string;
  pkg: PackageStateEntry;
  currency: string;
  supplementsMaster: GuideSupplementMaster[];
  languagesMaster: Language[];
  onDeleted: () => void;
  onDuplicate: (liveValues: PackageFormValues) => void;
  onDirtyChange: (localId: string, isDirty: boolean) => void;
}

const PackageCard = forwardRef<PackageCardHandle, PackageCardProps>(
  function PackageCard({ guideId, pkg, currency, supplementsMaster, languagesMaster, onDeleted, onDuplicate, onDirtyChange }, ref) {
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isPending = !pkg.id;

    const pkgRef = useRef(pkg);
    pkgRef.current = pkg;

    const form = useForm<PackageFormValues>({
      resolver: zodResolver(PackageFormSchema),
      defaultValues: {
        name: pkg.name || "New Package",
        guide_type: pkg.guide_type || "local_guide",
        duration_type: pkg.duration_type || "full_day",
        duration_hours: pkg.duration_hours ?? null,
        description: pkg.description ?? null,
        is_active: pkg.is_active ?? true,
        languages: (pkg.guide_package_languages ?? []).map((l) => l.language),
        operational_hours: defaultOpHours(pkg.guide_package_operational_hours),
        tiers: (pkg.guide_package_tiers && pkg.guide_package_tiers.length > 0
          ? pkg.guide_package_tiers
          : [{ min_pax: 1, max_pax: null, rate_per_guide: 0, rate_unit: "day" as RateUnit }]
        ).map((t) => ({
          min_pax: t.min_pax,
          max_pax: t.max_pax,
          rate_per_guide: t.rate_per_guide,
          rate_unit: t.rate_unit,
        })),
        supplements: mergeSupplements(supplementsMaster, pkg.guide_package_supplements),
      },
    });

    const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
      control: form.control,
      name: "tiers",
    });

    const watchName = form.watch("name");
    const watchGuideType = form.watch("guide_type");
    const watchDurationType = form.watch("duration_type");
    const watchIsActive = form.watch("is_active");

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

        const valid = await form.trigger();
        const values = form.getValues();
        if (!valid) {
          return { success: false, name: values.name, error: "Fix validation errors before saving" };
        }

        const meta = {
          name: values.name,
          guide_type: values.guide_type,
          duration_type: values.duration_type,
          duration_hours:
            values.duration_type === "multi_day" ? values.duration_hours ?? null : null,
          description: values.description || null,
          is_active: values.is_active,
          languages: values.languages,
        };

        try {
          let savedPkg: GuidePackage;
          if (currentPkg.id) {
            const { data, error } = await patchPackage(guideId, currentPkg.id, meta);
            if (error || !data) throw new Error(error || "Update failed");
            savedPkg = data;
          } else {
            const { data, error } = await createPackage(guideId, meta);
            if (error || !data?.id) throw new Error(error || "Create failed");
            savedPkg = data;
          }

          const packageId = savedPkg.id!;

          const hoursPayload = values.operational_hours.map((h) => ({
            day_of_week: h.day_of_week,
            is_active: h.is_active,
            start_time: h.is_active ? h.start_time : null,
            end_time: h.is_active ? h.end_time : null,
          }));
          const tiersPayload = values.tiers.map((t, idx) => ({
            min_pax: t.min_pax,
            max_pax: t.max_pax,
            rate_per_guide: t.rate_per_guide,
            rate_unit: t.rate_unit,
            sort_order: idx,
          }));
          const supplementsPayload = values.supplements.map((s) => ({
            supplement_id: s.supplement_id,
            is_included: s.is_included,
            rate_value: s.is_included || s.is_per_actuals ? null : s.rate_value,
            rate_unit: s.is_included || s.is_per_actuals ? null : s.rate_unit,
            is_per_actuals: s.is_per_actuals,
          }));

          const [hoursR, tiersR, supplementsR] = await Promise.all([
            replacePackageOperationalHours(guideId, packageId, hoursPayload),
            replacePackageTiers(guideId, packageId, tiersPayload),
            replacePackageSupplements(guideId, packageId, supplementsPayload),
          ]);

          if (hoursR.error || tiersR.error || supplementsR.error) {
            throw new Error(hoursR.error || tiersR.error || supplementsR.error || "Save failed");
          }

          const updatedPkg: PackageStateEntry = {
            ...savedPkg,
            _localId: packageId,
            guide_package_operational_hours: hoursR.data ?? [],
            guide_package_tiers: tiersR.data ?? [],
            guide_package_supplements: supplementsR.data ?? [],
            guide_package_languages: values.languages.map((lang) => ({ language: lang })),
          };

          form.reset({
            name: updatedPkg.name,
            guide_type: updatedPkg.guide_type,
            duration_type: updatedPkg.duration_type,
            duration_hours: updatedPkg.duration_hours ?? null,
            description: updatedPkg.description ?? null,
            is_active: updatedPkg.is_active,
            languages: values.languages,
            operational_hours: defaultOpHours(updatedPkg.guide_package_operational_hours),
            tiers: (updatedPkg.guide_package_tiers ?? []).map((t) => ({
              min_pax: t.min_pax,
              max_pax: t.max_pax,
              rate_per_guide: t.rate_per_guide,
              rate_unit: t.rate_unit,
            })),
            supplements: mergeSupplements(supplementsMaster, updatedPkg.guide_package_supplements),
          });

          return { success: true, name: values.name, updatedPkg };
        } catch (e) {
          return { success: false, name: values.name, error: e instanceof Error ? e.message : "Save failed" };
        }
      },
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    const guideTypeLabel = GUIDE_TYPE_OPTIONS.find((o) => o.value === watchGuideType)?.label ?? watchGuideType;
    const durationTypeLabel = DURATION_TYPE_OPTIONS.find((o) => o.value === watchDurationType)?.label ?? watchDurationType;

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
                <span className="text-xs text-muted-foreground shrink-0">{guideTypeLabel}</span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{durationTypeLabel}</span>
                {!watchIsActive && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">Inactive</span>
                )}
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
                    if (isPending) onDeleted();
                    else setDeleteOpen(true);
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
                          <Input placeholder="e.g. City Tour" className="h-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guide_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guide Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GUIDE_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchDurationType === "multi_day" && (
                  <FormField
                    control={form.control}
                    name="duration_hours"
                    render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel>Duration (Hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-9"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? null : Number(v));
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

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

                <FormField
                  control={form.control}
                  name="languages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Languages</FormLabel>
                      <FormControl>
                        <MultiSelector
                          values={field.value}
                          onValuesChange={field.onChange}
                          loop={false}
                        >
                          <MultiSelectorTrigger data={languagesMaster.map((l) => ({ value: l.name, label: l.name }))}>
                            <MultiSelectorInput placeholder="Select languages..." />
                          </MultiSelectorTrigger>
                          <MultiSelectorContent>
                            <MultiSelectorList>
                              {languagesMaster.map((l) => (
                                <MultiSelectorItem key={l.id} value={l.name}>
                                  {l.name}
                                </MultiSelectorItem>
                              ))}
                            </MultiSelectorList>
                          </MultiSelectorContent>
                        </MultiSelector>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel className="mt-0">Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        {field.value ? "Yes" : "No"}
                      </span>
                    </FormItem>
                  )}
                />

                <OperationalHoursSection form={form} />
                <TiersSection
                  form={form}
                  tierFields={tierFields}
                  appendTier={appendTier}
                  removeTier={removeTier}
                  currency={currency}
                />
                <SupplementsSection form={form} currency={currency} />
              </form>
            </Form>
          </AccordionContent>
        </AccordionItem>
      </>
    );
  }
);

// ── Operational Hours Section ────────────────────────────────

function OperationalHoursSection({ form }: { form: ReturnType<typeof useForm<PackageFormValues>> }) {
  const hours = form.watch("operational_hours");
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Operational Hours</h4>
      <div className="rounded-md border overflow-x-auto">
        <div className="grid grid-cols-[140px_80px_120px_120px] gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[500px]">
          <span>Day</span>
          <span>Active</span>
          <span>Start</span>
          <span>End</span>
        </div>
        {DAYS.map((d, index) => {
          const row = hours[index];
          const active = row?.is_active ?? false;
          return (
            <div
              key={d.key}
              className="grid grid-cols-[140px_80px_120px_120px] items-center gap-2 px-3 py-1.5 border-b last:border-b-0 min-w-[500px]"
            >
              <span className="text-sm">{d.label}</span>
              <FormField
                control={form.control}
                name={`operational_hours.${index}.is_active`}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <FormField
                control={form.control}
                name={`operational_hours.${index}.start_time`}
                render={({ field }) => (
                  <Input
                    type="time"
                    className="h-8 text-xs"
                    disabled={!active}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                )}
              />
              <FormField
                control={form.control}
                name={`operational_hours.${index}.end_time`}
                render={({ field }) => (
                  <Input
                    type="time"
                    className="h-8 text-xs"
                    disabled={!active}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tiers Section ────────────────────────────────────────────

interface TiersSectionProps {
  form: ReturnType<typeof useForm<PackageFormValues>>;
  tierFields: ReturnType<typeof useFieldArray<PackageFormValues, "tiers">>["fields"];
  appendTier: (value: PackageFormValues["tiers"][number]) => void;
  removeTier: (index: number) => void;
  currency: string;
}

function TiersSection({ form, tierFields, appendTier, removeTier, currency }: TiersSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Pricing Tiers</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            appendTier({ min_pax: 1, max_pax: null, rate_per_guide: 0, rate_unit: "day" })
          }
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Tier
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">At least one tier required. Leave max empty for ∞.</p>
      <div className="rounded-md border overflow-x-auto">
        <div className="grid grid-cols-[90px_90px_110px_110px_32px] gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[520px]">
          <span>Min Pax</span>
          <span>Max Pax</span>
          <span>Rate {currency ? `(${currency})` : ""}</span>
          <span>Unit</span>
          <span />
        </div>
        {tierFields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[90px_90px_110px_110px_32px] items-center gap-2 px-3 py-1.5 border-b last:border-b-0 min-w-[520px]"
          >
            <FormField
              control={form.control}
              name={`tiers.${index}.min_pax`}
              render={({ field: f }) => (
                <Input type="number" min={0} className="h-7 text-xs" {...f} />
              )}
            />
            <FormField
              control={form.control}
              name={`tiers.${index}.max_pax`}
              render={({ field: f }) => (
                <Input
                  type="number"
                  min={0}
                  placeholder="∞"
                  className="h-7 text-xs"
                  value={f.value ?? ""}
                  onChange={(e) => f.onChange(e.target.value === "" ? null : Number(e.target.value))}
                />
              )}
            />
            <FormField
              control={form.control}
              name={`tiers.${index}.rate_per_guide`}
              render={({ field: f }) => (
                <Input type="number" min={0} step="0.01" className="h-7 text-xs" {...f} />
              )}
            />
            <FormField
              control={form.control}
              name={`tiers.${index}.rate_unit`}
              render={({ field: f }) => (
                <Select onValueChange={(v) => f.onChange(v as RateUnit)} value={f.value ?? ""}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeTier(index)}
              disabled={tierFields.length === 1}
              className="h-7 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      {form.formState.errors.tiers?.message && (
        <p className="text-xs text-destructive mt-1">{form.formState.errors.tiers.message}</p>
      )}
    </div>
  );
}

// ── Supplements Section ──────────────────────────────────────

function SupplementsSection({ form, currency }: { form: ReturnType<typeof useForm<PackageFormValues>>; currency: string }) {
  const supplements = form.watch("supplements");
  if (supplements.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold mb-2">Supplements</h4>
        <p className="text-xs text-muted-foreground">No supplements configured in master.</p>
      </div>
    );
  }
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Supplements</h4>
      <div className="rounded-md border overflow-x-auto">
        <div className="grid grid-cols-[1fr_90px_120px_100px_110px] gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[620px]">
          <span>Name</span>
          <span>Included</span>
          <span>Rate {currency ? `(${currency})` : ""}</span>
          <span>Unit</span>
          <span>Per Actuals</span>
        </div>
        {supplements.map((sup, index) => {
          const disabled = sup.is_included || sup.is_per_actuals;
          return (
            <div
              key={sup.supplement_id}
              className="grid grid-cols-[1fr_90px_120px_100px_110px] items-center gap-2 px-3 py-1.5 border-b last:border-b-0 min-w-[620px]"
            >
              <span className="text-sm">{sup.supplement_name}</span>
              <FormField
                control={form.control}
                name={`supplements.${index}.is_included`}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <FormField
                control={form.control}
                name={`supplements.${index}.rate_value`}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-7 text-xs"
                    disabled={disabled}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  />
                )}
              />
              <FormField
                control={form.control}
                name={`supplements.${index}.rate_unit`}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(v as RateUnit)}
                    value={field.value ?? ""}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATE_UNIT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                control={form.control}
                name={`supplements.${index}.is_per_actuals`}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GuidePackagesForm (wrapper) ──────────────────────────────

const DoneFormSchema = z.object({});
type DoneFormValues = z.infer<typeof DoneFormSchema>;

interface GuidePackagesFormProps {
  initialData: Guide;
  supplementsMaster: GuideSupplementMaster[];
  languagesMaster: Language[];
  onNext: (data: Record<string, unknown>) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function GuidePackagesForm({
  initialData,
  supplementsMaster,
  languagesMaster,
  onNext,
  setIsLoading,
  formRef,
  onDirtyChange,
}: GuidePackagesFormProps) {
  const guideId = initialData.id!;
  const currency = initialData.currency || "";

  const [packages, setPackages] = useState<PackageStateEntry[]>(
    (initialData.guide_packages ?? []).map((p) => ({ ...p, _localId: p.id! }))
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
      guide_type: "local_guide",
      duration_type: "full_day",
      duration_hours: null,
      description: null,
      is_active: true,
      guide_package_languages: [],
      guide_package_operational_hours: [],
      guide_package_tiers: [],
      guide_package_supplements: [],
    };
    getOrCreateRef(localId);
    setPackages((prev) => [...prev, newPkg]);
    setOpenCards((prev) => [...prev, localId]);
  };

  const handleDuplicate = (liveValues: PackageFormValues) => {
    const existingNames = packages.map((p) => p.name);
    const newName = getDuplicateName(liveValues.name, existingNames);
    const localId = `pending-${Date.now()}`;
    const newPkg: PackageStateEntry = {
      _localId: localId,
      name: newName,
      guide_type: liveValues.guide_type,
      duration_type: liveValues.duration_type,
      duration_hours: liveValues.duration_hours ?? null,
      description: liveValues.description ?? null,
      is_active: liveValues.is_active,
      guide_package_languages: liveValues.languages.map((lang) => ({ language: lang })),
      guide_package_operational_hours: liveValues.operational_hours.map((h) => ({
        day_of_week: h.day_of_week,
        is_active: h.is_active,
        start_time: h.start_time,
        end_time: h.end_time,
      })),
      guide_package_tiers: liveValues.tiers.map((t) => ({
        min_pax: t.min_pax,
        max_pax: t.max_pax,
        rate_per_guide: t.rate_per_guide,
        rate_unit: t.rate_unit,
      })),
      guide_package_supplements: liveValues.supplements
        .filter((s) => s.is_included || s.is_per_actuals || s.rate_value != null)
        .map((s) => ({
          supplement_id: s.supplement_id,
          is_included: s.is_included,
          rate_value: s.rate_value,
          rate_unit: s.rate_unit,
          is_per_actuals: s.is_per_actuals,
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
        const { error } = await deletePackage(guideId, pkg.id);
        if (error) failures.push(`Package "${pkg.name}" (delete): ${error}`);
        else saved++;
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
      toast.error(`Saved ${saved} of ${total}. ${failures.join(" ")}`);
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
          Add packages with languages, operational hours, pricing tiers, and supplements
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
          {packages.map((pkg) => {
            const cardRef = getOrCreateRef(pkg._localId);
            return (
              <PackageCard
                ref={cardRef as unknown as React.RefObject<PackageCardHandle>}
                key={pkg._localId}
                guideId={guideId}
                pkg={pkg}
                currency={currency}
                supplementsMaster={supplementsMaster}
                languagesMaster={languagesMaster}
                onDeleted={() => handleDeleted(pkg._localId)}
                onDuplicate={(liveValues) => handleDuplicate(liveValues)}
                onDirtyChange={handlePackageDirtyChange}
              />
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

"use client";

// The expanded body for a tour PackageCard.
// Routes to category-specific section blocks via simple conditional
// rendering on `category`. Persistence is hoisted to the parent
// (Tab2Packages → PackageCard ref → save()), so this component only
// owns presentation + non-RHF section state (linked masters, combo
// pool, itinerary days, combo locations, op hours, age policies).

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import GeoNodePicker from "@/components/shared/geo-node-picker";
import {
  TourAgePolicyBand,
  TourComboLocation,
  TourItineraryDay,
  TourLinkedPackage,
  TourMasterCatalogItem,
  TourPackageAddonLink,
  TourPackageCategory,
  TourPackageDetail,
  TourPackageRateMode,
  TourPackageSalesMode,
  TourTransferCoverage,
} from "@/types/tours";

import PackageCategoryToggle from "./package-category-toggle";
import PackageSalesModeToggle from "./package-sales-mode-toggle";
import MasterCatalogPicker from "./master-catalog-picker";
import ComboPoolBuilder from "./combo-pool-builder";
import ComboPrimaryLocationsSection from "./combo-primary-locations-section";
import MultiDayItineraryBuilder, {
  ItineraryRow,
  buildItineraryRows,
} from "./multi-day-itinerary-builder";
import OperationalHoursSection, {
  HoursMode,
  OpHourRow,
} from "./operational-hours-section";
import AgePolicySection, {
  AgeBandRow,
  bandsToRows,
} from "./age-policy-section";
import CancellationPolicySection, {
  CancellationRuleRow,
} from "./cancellation-policy-section";

import { PackageFormValues } from "./package-card";

// Per old code: `ticket` locks transfer_coverage to `none`.
const TRANSFER_COVERAGE_OPTIONS: {
  value: TourTransferCoverage;
  label: string;
}[] = [
  { value: "none", label: "No Transport" },
  { value: "pickup_dropoff", label: "Pickup & Drop-off" },
  { value: "disposal", label: "Disposal" },
];

function getTransferOptions(salesMode: TourPackageSalesMode): {
  options: TourTransferCoverage[];
  defaultValue: TourTransferCoverage;
  locked: boolean;
} {
  if (salesMode === "ticket")
    return { options: ["none"], defaultValue: "none", locked: true };
  if (salesMode === "shared")
    return {
      options: ["pickup_dropoff", "disposal"],
      defaultValue: "pickup_dropoff",
      locked: false,
    };
  if (salesMode === "private")
    return {
      options: ["pickup_dropoff", "disposal"],
      defaultValue: "pickup_dropoff",
      locked: false,
    };
  return {
    options: ["none", "pickup_dropoff", "disposal"],
    defaultValue: "none",
    locked: false,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────

export interface PackageBodyHandle {
  // Snapshot getters used by PackageCard's save() to flush all child
  // state in one shot. The parent owns the API calls.
  getLinkedMasters: () => TourMasterCatalogItem[];
  getComboPool: () => TourLinkedPackage[];
  getComboLocations: () => TourComboLocation[];
  getItineraryDays: () => ItineraryRow[];
  getOpHours: () => OpHourRow[];
  getOpHoursMode: () => HoursMode;
  getAgeBands: () => AgeBandRow[];
}

interface PackageCardBodyProps {
  pkg: TourPackageDetail;
  isPending: boolean;
  /** Tour-level country (uuid). Scopes the master-catalog picker. */
  countryId: string | null;
  form: UseFormReturn<PackageFormValues>;
  category: TourPackageCategory;
  salesMode: TourPackageSalesMode;
  // Internal state (hoisted into parent so PackageCard can save).
  linkedMasters: TourMasterCatalogItem[];
  setLinkedMasters: (next: TourMasterCatalogItem[]) => void;
  comboPool: TourLinkedPackage[];
  setComboPool: (next: TourLinkedPackage[]) => void;
  comboLocations: TourComboLocation[];
  setComboLocations: (next: TourComboLocation[]) => void;
  itineraryRows: ItineraryRow[];
  setItineraryRows: (next: ItineraryRow[]) => void;
  opHourRows: OpHourRow[];
  setOpHourRows: (next: OpHourRow[]) => void;
  opHourMode: HoursMode;
  setOpHourMode: (next: HoursMode) => void;
  ageBandRows: AgeBandRow[];
  setAgeBandRows: (next: AgeBandRow[]) => void;
  cancellationRules: CancellationRuleRow[];
  setCancellationRules: (next: CancellationRuleRow[]) => void;
  cancellationNonRefundable: boolean;
  setCancellationNonRefundable: (value: boolean) => void;
  /** Notify parent that a non-RHF section was edited. */
  onSectionDirty: () => void;
}

export default function PackageCardBody({
  pkg,
  isPending,
  countryId,
  form,
  category,
  salesMode,
  linkedMasters,
  setLinkedMasters,
  comboPool,
  setComboPool,
  comboLocations,
  setComboLocations,
  itineraryRows,
  setItineraryRows,
  opHourRows,
  setOpHourRows,
  opHourMode,
  setOpHourMode,
  ageBandRows,
  setAgeBandRows,
  cancellationRules,
  setCancellationRules,
  cancellationNonRefundable,
  setCancellationNonRefundable,
  onSectionDirty,
}: PackageCardBodyProps) {
  const transferState = useMemo(
    () => getTransferOptions(salesMode),
    [salesMode],
  );

  // Coerce transfer_coverage to legal value when sales_mode changes.
  useEffect(() => {
    const cur = form.getValues("transfer_coverage");
    if (!transferState.options.includes(cur)) {
      form.setValue("transfer_coverage", transferState.defaultValue, {
        shouldDirty: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesMode]);

  const [showPaxLimits, setShowPaxLimits] = useState(
    !!(pkg.min_pax || pkg.max_participants),
  );

  // Apply auto-fill from a linked master entry. We populate empty form
  // fields only — the user's edits are never overwritten. The actual
  // age-policy / op-hours hydration would normally hit the master's
  // /:id/full endpoint; the new backend's `searchMasterCatalog` row
  // already contains `typical_duration_min`, so we hydrate duration
  // here and leave deeper fields to the dedicated sections.
  function applyMasterFill(item: TourMasterCatalogItem) {
    const v = form.getValues();
    const hasDuration =
      v.duration_days > 0 || v.duration_hours > 0 || v.duration_minutes > 0;
    if (!hasDuration && item.typical_duration_min) {
      const m = item.typical_duration_min;
      form.setValue("duration_days", Math.floor(m / 1440), {
        shouldDirty: true,
      });
      form.setValue("duration_hours", Math.floor((m % 1440) / 60), {
        shouldDirty: true,
      });
      form.setValue("duration_minutes", m % 60, { shouldDirty: true });
    }
    // Auto-set primary geo when empty.
    if (!v.primary_geo_id && item.geo_id) {
      form.setValue("primary_geo_id", item.geo_id, { shouldDirty: true });
    }
  }

  return (
    <div className="border-t px-4 py-4 flex flex-col gap-5">
      <Form {...form}>
        {/* Section 0 — Category */}
        <div>
          <Label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Category *
          </Label>
          <PackageCategoryToggle
            value={category}
            onChange={(v) =>
              form.setValue("category", v, { shouldDirty: true })
            }
          />
        </div>

        {/* Section A — Name + Preferred */}
        <div className="grid grid-cols-[1fr_140px] gap-3 items-end">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="is_preferred"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between border rounded-md px-3 h-10">
                <FormLabel className="mt-0 text-xs">Preferred</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Section A2 — Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Section B — Sales Mode + Transfer Coverage */}
        <div className="grid gap-4 md:grid-cols-[auto_auto] items-end">
          <div>
            <Label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sales Mode *
            </Label>
            <PackageSalesModeToggle
              value={salesMode}
              category={category}
              onChange={(v) =>
                form.setValue("sales_mode", v, { shouldDirty: true })
              }
            />
          </div>
          <FormField
            control={form.control}
            name="transfer_coverage"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel>Transfer Coverage</FormLabel>
                <Select
                  value={field.value}
                  disabled={transferState.locked}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 w-56">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRANSFER_COVERAGE_OPTIONS.filter((o) =>
                      transferState.options.includes(o.value),
                    ).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transferState.locked && (
                  <p className="absolute left-0 top-full mt-0.5 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none">
                    Auto-locked to &quot;No Transport&quot; for ticket sales mode.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section D — Master catalog / Combo / Day-trip multi-pick */}
        {(category === "attraction" || category === "activity") && (
          <MasterCatalogPicker
            kind={category === "attraction" ? "venue" : "activity"}
            countryId={countryId}
            selected={linkedMasters}
            maxSelections={1}
            onChange={(next) => {
              setLinkedMasters(next);
              onSectionDirty();
              if (next.length === 1) applyMasterFill(next[0]);
            }}
          />
        )}
        {category === "day_trip" && (
          <MasterCatalogPicker
            countryId={countryId}
            selected={linkedMasters}
            maxSelections={10}
            onChange={(next) => {
              setLinkedMasters(next);
              onSectionDirty();
              if (next.length > linkedMasters.length) {
                const added = next.find(
                  (n) => !linkedMasters.some((p) => p.id === n.id),
                );
                if (added) applyMasterFill(added);
              }
            }}
          />
        )}
        {category === "combo" && (
          <ComboPoolBuilder
            items={comboPool}
            onChange={(next) => {
              setComboPool(next);
              onSectionDirty();
            }}
          />
        )}

        {/* Section E — Combo settings */}
        {category === "combo" && (
          <div className="rounded-md border bg-muted/20 p-3 grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="combo_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Combo Mode</FormLabel>
                  <Select
                    value={field.value ?? "fixed"}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="pick">Pick</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {form.watch("combo_mode") === "pick" && (
              <FormField
                control={form.control}
                name="combo_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pick Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="h-9"
                        value={field.value ?? 2}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 2)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="combo_applicability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicability</FormLabel>
                  <Select
                    value={field.value ?? "same_day"}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="same_day">Same Day</SelectItem>
                      <SelectItem value="any_day">Any Day</SelectItem>
                      <SelectItem value="consecutive_days">
                        Consecutive Days
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Section F — Duration */}
        <div>
          <Label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Duration
          </Label>
          <div className="flex items-center gap-2 h-9">
            <FormField
              control={form.control}
              name="duration_days"
              render={({ field }) => (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-16 text-sm"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    d
                  </span>
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="duration_hours"
              render={({ field }) => (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-16 text-sm"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    h
                  </span>
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-16 text-sm"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    m
                  </span>
                </div>
              )}
            />
          </div>
        </div>

        {/* Section G — Multi-day itinerary */}
        {category === "multi_day" && (
          <MultiDayItineraryBuilder
            durationDays={form.watch("duration_days")}
            rows={itineraryRows}
            onChange={(rows) => {
              setItineraryRows(rows);
              onSectionDirty();
            }}
          />
        )}

        {/* Section H — Primary location (single picker; combo uses per-item) */}
        {category !== "multi_day" && category !== "combo" && (
          <FormField
            control={form.control}
            name="primary_geo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Location</FormLabel>
                <FormControl>
                  <GeoNodePicker
                    value={field.value ?? null}
                    onChange={(id) => field.onChange(id)}
                    placeholder="Search zone/area…"
                  />
                </FormControl>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Auto-set when a master attraction is linked.
                </p>
              </FormItem>
            )}
          />
        )}
        {category === "combo" && !isPending && (
          <ComboPrimaryLocationsSection
            packageId={pkg.id}
            value={comboLocations}
            onChange={(next) => {
              setComboLocations(next);
              onSectionDirty();
            }}
          />
        )}

        {/* Section I — Participant limits */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Switch
              checked={showPaxLimits}
              onCheckedChange={(v) => {
                setShowPaxLimits(v);
                if (!v) {
                  form.setValue("min_pax", null, { shouldDirty: true });
                  form.setValue("max_participants", null, {
                    shouldDirty: true,
                  });
                }
              }}
            />
            <span className="text-sm">Set participant limits</span>
          </div>
          {showPaxLimits && (
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <FormField
                control={form.control}
                name="min_pax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Pax</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-9"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-9"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Section J — Logistics (meeting / pickup / dropoff) */}
        <div className="rounded-md border bg-muted/20 p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="meeting_point"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meeting Point</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className="h-9"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pickup_point"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pickup Point</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className="h-9"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dropoff_point"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dropoff Point</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className="h-9"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Section K — Inclusions / Exclusions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="inclusions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inclusions</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
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
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Section L — Age policy
           Tab 2 is the canonical owner per the legacy app: age bands
           live on the package, drive auto-fill for masters, and seed
           every season's pax-rate row labels. Tab 3 also persists this
           collection (`replacePackageAgePolicies`) — the latest write
           wins, so editing in either tab is safe. */}
        <AgePolicySection
          rows={ageBandRows}
          onChange={(rows) => {
            setAgeBandRows(rows);
            onSectionDirty();
          }}
        />

        {/* Section M — Operational hours (Range / Slots) */}
        <OperationalHoursSection
          rows={opHourRows}
          mode={opHourMode}
          onRowsChange={(rows) => {
            setOpHourRows(rows);
            onSectionDirty();
          }}
          onModeChange={(m) => {
            setOpHourMode(m);
            onSectionDirty();
          }}
        />

        {/* Section N — Cancellation Policy (saved with package) */}
        <CancellationPolicySection
          isNonRefundable={cancellationNonRefundable}
          rules={cancellationRules}
          onIsNonRefundableChange={(v) => {
            setCancellationNonRefundable(v);
            onSectionDirty();
          }}
          onRulesChange={(next) => {
            setCancellationRules(next);
            onSectionDirty();
          }}
        />
      </Form>
    </div>
  );
}

// ─── Re-exports for the parent ─────────────────────────────────────────

export type { AgeBandRow, OpHourRow, ItineraryRow };
export { bandsToRows, buildItineraryRows };

// Helper used by the parent's save() to coerce body state into payloads.
export function buildAddonLinks(
  links: TourPackageAddonLink[],
): TourPackageAddonLink[] {
  return links.map((l) => ({
    addon_id: l.addon_id,
    is_mandatory: !!l.is_mandatory,
  }));
}

// Re-exports needed for the Tab 2 orchestration code.
export type {
  TourComboLocation,
  TourItineraryDay,
  TourLinkedPackage,
  TourMasterCatalogItem,
  TourPackageRateMode,
};

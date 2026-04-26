"use client";

// PackageCard — the collapsible per-package card for Tab 2.
// Owns the RHF form, all child section state, and the save()
// imperative handle that Tab2Packages calls once per package.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/ui/alert-modal";
import { ChevronDown, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  TourComboLocation,
  TourLinkedPackage,
  TourMasterCatalogItem,
  TourPackageCategory,
  TourPackageCreateInput,
  TourPackageDetail,
  TourPackageSalesMode,
  TourPackageRateMode,
  TourTransferCoverage,
} from "@/types/tours";
import {
  createTourPackage,
  updateTourPackage,
  deleteTourPackage,
  replaceOperationalHours,
  replacePackageLinkedPackages,
  replacePackageComboLocations,
  replaceItineraryDays,
  replacePackageComponents,
  replacePackageAgePolicies,
  getPackageComponents,
  getPackageLinkedPackages,
  getPackageComboLocations,
} from "@/data-access/tours-api";

import PackageCardBody, {
  AgeBandRow,
  OpHourRow,
  ItineraryRow,
  bandsToRows,
  buildItineraryRows,
} from "./package-card-body";
import {
  defaultOpHourRows,
  rowsToTourOpHours,
  HoursMode,
} from "./operational-hours-section";
import { rowsToBands } from "./age-policy-section";

// ─── Schema ────────────────────────────────────────────────────────────

const PackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  category: z.enum([
    "attraction",
    "activity",
    "combo",
    "day_trip",
    "multi_day",
  ]),
  description: z.string().nullable().optional(),
  sales_mode: z.enum(["ticket", "shared", "private", "exclusive"]),
  transfer_coverage: z.enum(["none", "pickup_dropoff", "disposal"]),
  combo_mode: z.string().nullable().optional(),
  combo_count: z.number().nullable().optional(),
  combo_applicability: z.string().nullable().optional(),
  primary_geo_id: z.string().nullable().optional(),
  duration_days: z.coerce.number().min(0),
  duration_hours: z.coerce.number().min(0),
  duration_minutes: z.coerce.number().min(0),
  min_pax: z.number().nullable().optional(),
  max_participants: z.number().nullable().optional(),
  meeting_point: z.string().nullable().optional(),
  pickup_point: z.string().nullable().optional(),
  dropoff_point: z.string().nullable().optional(),
  inclusions: z.string().nullable().optional(),
  exclusions: z.string().nullable().optional(),
  is_preferred: z.boolean().optional(),
  rate_mode: z
    .enum(["per_pax", "per_vehicle", "total"])
    .nullable()
    .optional(),
});

export type PackageFormValues = z.infer<typeof PackageFormSchema>;

// ─── Public types ──────────────────────────────────────────────────────

export type PackageStateEntry = TourPackageDetail & { _localId: string };

export type SaveResult =
  | { success: true; name: string; updatedPkg: PackageStateEntry }
  | { success: false; name: string; error: string };

export type PackageCardHandle = {
  save: () => Promise<SaveResult>;
};

// ─── Helpers ───────────────────────────────────────────────────────────

function formatDuration(d: number, h: number, m: number): string {
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "—";
}

// ─── Component ─────────────────────────────────────────────────────────

interface PackageCardProps {
  tourId: string;
  pkg: PackageStateEntry;
  isOpen: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onDuplicate: () => Promise<void>;
  onDirtyChange: (localId: string, isDirty: boolean) => void;
}

const PackageCard = forwardRef<PackageCardHandle, PackageCardProps>(
  function PackageCard(
    { tourId, pkg, isOpen, onToggle, onDeleted, onDuplicate, onDirtyChange },
    ref,
  ) {
    const isPending = pkg.id.startsWith("pending");

    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // ── Section state ─────────────────────────────────────────────────
    const [linkedMasters, setLinkedMasters] = useState<
      TourMasterCatalogItem[]
    >([]);
    const [comboPool, setComboPool] = useState<TourLinkedPackage[]>([]);
    const [comboLocations, setComboLocations] = useState<TourComboLocation[]>(
      [],
    );
    const initialOpHours = useMemo(
      () => defaultOpHourRows(pkg.tour_operational_hours),
      [pkg.tour_operational_hours],
    );
    const [opHourRows, setOpHourRows] = useState<OpHourRow[]>(
      initialOpHours.rows,
    );
    const [opHourMode, setOpHourMode] = useState<HoursMode>(initialOpHours.mode);
    const [ageBandRows, setAgeBandRows] = useState<AgeBandRow[]>(
      bandsToRows(pkg.tour_package_age_policies ?? []),
    );
    const [itineraryRows, setItineraryRows] = useState<ItineraryRow[]>(
      buildItineraryRows(
        pkg.duration_days || 0,
        pkg.tour_package_itinerary_days ?? [],
      ),
    );
    const [sectionsDirty, setSectionsDirty] = useState(false);

    // ── Form ──────────────────────────────────────────────────────────
    const form = useForm<PackageFormValues>({
      resolver: zodResolver(PackageFormSchema),
      mode: "onBlur",
      defaultValues: {
        name: pkg.name,
        category: pkg.category,
        description: pkg.description ?? null,
        sales_mode: pkg.sales_mode,
        transfer_coverage: pkg.transfer_coverage,
        combo_mode: pkg.combo_mode ?? null,
        combo_count: pkg.combo_count ?? null,
        combo_applicability: pkg.combo_applicability ?? null,
        primary_geo_id: pkg.primary_geo_id ?? null,
        duration_days: pkg.duration_days || 0,
        duration_hours: pkg.duration_hours || 0,
        duration_minutes: pkg.duration_minutes || 0,
        min_pax: pkg.min_pax ?? null,
        max_participants: pkg.max_participants ?? null,
        meeting_point: pkg.meeting_point ?? null,
        pickup_point: pkg.pickup_point ?? null,
        dropoff_point: pkg.dropoff_point ?? null,
        inclusions: pkg.inclusions ?? null,
        exclusions: pkg.exclusions ?? null,
        is_preferred: pkg.is_preferred ?? false,
        rate_mode: pkg.rate_mode,
      },
    });

    const liveTitle = form.watch("name");
    const category = form.watch("category") as TourPackageCategory;
    const salesMode = form.watch("sales_mode") as TourPackageSalesMode;

    // ── Initial load of linked master / combo pool / combo locs ──────
    useEffect(() => {
      if (isPending) return;
      let cancelled = false;
      (async () => {
        const [comps, lp, cl] = await Promise.all([
          getPackageComponents(pkg.id),
          getPackageLinkedPackages(pkg.id),
          getPackageComboLocations(pkg.id),
        ]);
        if (cancelled) return;
        if (Array.isArray(comps.data)) {
          setLinkedMasters(
            comps.data
              .map((c) => c.master_catalog)
              .filter((m): m is TourMasterCatalogItem => !!m),
          );
        }
        if (Array.isArray(lp.data)) setComboPool(lp.data);
        if (Array.isArray(cl.data)) setComboLocations(cl.data);
      })();
      return () => {
        cancelled = true;
      };
    }, [pkg.id, isPending]);

    // ── Dirty bubble-up ───────────────────────────────────────────────
    const { isDirty: formDirty } = form.formState;
    const isDirty = formDirty || sectionsDirty || isPending;

    const onDirtyChangeRef = useRef(onDirtyChange);
    onDirtyChangeRef.current = onDirtyChange;
    const lastReported = useRef<boolean | undefined>(undefined);
    useEffect(() => {
      if (lastReported.current !== isDirty) {
        lastReported.current = isDirty;
        onDirtyChangeRef.current?.(pkg._localId, isDirty);
      }
    }, [isDirty, pkg._localId]);

    const markSectionsDirty = useCallback(() => {
      setSectionsDirty(true);
    }, []);

    // ── save() — orchestrates the whole package save ─────────────────
    useImperativeHandle(ref, () => ({
      save: async (): Promise<SaveResult> => {
        const valid = await form.trigger();
        if (!valid) {
          return {
            success: false,
            name: form.getValues("name") || pkg.name,
            error: "Validation failed",
          };
        }
        const v = form.getValues();
        setSaving(true);
        try {
          const payload: TourPackageCreateInput = {
            name: v.name.trim(),
            category: v.category as TourPackageCategory,
            description: v.description?.trim() || null,
            sales_mode: v.sales_mode as TourPackageSalesMode,
            transfer_coverage:
              v.transfer_coverage as TourTransferCoverage,
            combo_mode: v.category === "combo" ? v.combo_mode ?? "fixed" : null,
            combo_count:
              v.category === "combo" && v.combo_mode === "pick"
                ? (v.combo_count ?? 2)
                : null,
            combo_applicability:
              v.category === "combo" ? v.combo_applicability ?? "same_day" : null,
            primary_geo_id:
              v.category === "multi_day" ? null : (v.primary_geo_id ?? null),
            duration_days: v.duration_days,
            duration_hours: v.duration_hours,
            duration_minutes: v.duration_minutes,
            min_pax: v.min_pax ?? null,
            max_participants: v.max_participants ?? null,
            meeting_point: v.meeting_point?.trim() || null,
            pickup_point: v.pickup_point?.trim() || null,
            dropoff_point: v.dropoff_point?.trim() || null,
            inclusions: v.inclusions?.trim() || null,
            exclusions: v.exclusions?.trim() || null,
            is_preferred: !!v.is_preferred,
            is_multi_day: v.category === "multi_day",
            status: pkg.status || "draft",
            rate_mode: (v.rate_mode as TourPackageRateMode) ?? null,
          };

          // 1. Create or update the package row.
          let saved: TourPackageDetail;
          if (isPending) {
            const res = await createTourPackage(tourId, payload);
            if (res.error || !res.data) {
              throw new Error(res.error ?? "Failed to create package");
            }
            saved = res.data;
          } else {
            const res = await updateTourPackage(pkg.id, payload);
            if (res.error || !res.data) {
              throw new Error(res.error ?? "Failed to update package");
            }
            saved = res.data;
          }

          // 2. Operational hours
          const opRes = await replaceOperationalHours(
            saved.id,
            rowsToTourOpHours(opHourRows, opHourMode),
          );
          if (opRes.error) throw new Error(`Hours: ${opRes.error}`);

          // 3. Combo: linked packages
          if (v.category === "combo") {
            const lpRes = await replacePackageLinkedPackages(
              saved.id,
              comboPool.map((c, i) => ({
                linked_type: c.linked_type,
                linked_tour_package_id: c.linked_tour_package_id,
                linked_transfer_package_id: c.linked_transfer_package_id,
                geo_id: c.geo_id,
                free_text_name: c.free_text_name,
                sort_order: i,
              })),
            );
            if (lpRes.error) throw new Error(`Combo pool: ${lpRes.error}`);
          }

          // 4. Combo: per-pool-item primary locations
          if (v.category === "combo" && comboLocations.length > 0) {
            const clRes = await replacePackageComboLocations(
              saved.id,
              comboLocations.map((c) => ({
                pool_item_id: c.pool_item_id,
                geo_id: c.geo_id,
              })),
            );
            if (clRes.error)
              throw new Error(`Combo locations: ${clRes.error}`);
          }

          // 5. Multi-day itinerary
          if (v.category === "multi_day") {
            const idRes = await replaceItineraryDays(
              saved.id,
              itineraryRows.map((r) => ({
                day_number: r.day_number,
                origin_city_id: r.origin_city_id,
                destination_city_id: r.destination_city_id,
                description: r.description,
              })),
            );
            if (idRes.error) throw new Error(`Itinerary: ${idRes.error}`);
          }

          // 6. Linked master catalog → components
          if (
            v.category === "attraction" ||
            v.category === "activity" ||
            v.category === "day_trip"
          ) {
            const compsRes = await replacePackageComponents(
              saved.id,
              linkedMasters.map((m, i) => ({
                master_catalog_id: m.id,
                sort_order: i,
              })),
            );
            if (compsRes.error)
              throw new Error(`Components: ${compsRes.error}`);
          }

          // 7. Age policies (Tab 2 owns the canonical set; Tab 3 also
          //    persists but the latest write wins — matches old code).
          if (ageBandRows.length > 0) {
            const apRes = await replacePackageAgePolicies(
              saved.id,
              rowsToBands(ageBandRows),
            );
            if (apRes.error)
              throw new Error(`Age policy: ${apRes.error}`);
          }

          const updated: PackageStateEntry = {
            ...saved,
            _localId: isPending ? saved.id : pkg._localId,
          };
          form.reset(v);
          setSectionsDirty(false);
          return { success: true, name: v.name, updatedPkg: updated };
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to save package";
          return {
            success: false,
            name: v.name || pkg.name,
            error: msg,
          };
        } finally {
          setSaving(false);
        }
      },
    }));

    const onDelete = async () => {
      if (isPending) {
        onDeleted();
        return;
      }
      setSaving(true);
      try {
        const res = await deleteTourPackage(pkg.id);
        if (res.error) throw new Error(res.error);
        toast.success("Package deleted");
        onDeleted();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      } finally {
        setSaving(false);
        setDeleteConfirm(false);
      }
    };

    const hasDuration =
      pkg.duration_days > 0 || pkg.duration_hours > 0 || pkg.duration_minutes > 0;

    return (
      <>
        <div className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center gap-2 px-4 py-3 hover:bg-accent/40 transition-colors">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
              onClick={onToggle}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            <button
              type="button"
              className="flex flex-1 items-center gap-2 min-w-0 text-left"
              onClick={onToggle}
            >
              {(isDirty || isPending) && (
                <span
                  className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
                  aria-label="Unsaved changes"
                />
              )}
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  !liveTitle && "text-muted-foreground italic",
                )}
              >
                {liveTitle || "Unnamed Package"}
              </span>
              {isPending && (
                <span className="shrink-0 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  Unsaved
                </span>
              )}
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground capitalize">
                {category.replace("_", " ")}
              </span>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {salesMode}
              </span>
              {hasDuration && (
                <>
                  <span className="text-muted-foreground/50 shrink-0">·</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDuration(
                      pkg.duration_days,
                      pkg.duration_hours,
                      pkg.duration_minutes,
                    )}
                  </span>
                </>
              )}
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Duplicate"
              onClick={() => onDuplicate()}
              disabled={isPending}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={() => setDeleteConfirm(true)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Expanded body ── */}
          {isOpen && (
            <PackageCardBody
              pkg={pkg}
              isPending={isPending}
              form={form}
              category={category}
              salesMode={salesMode}
              linkedMasters={linkedMasters}
              setLinkedMasters={(next) => {
                setLinkedMasters(next);
                markSectionsDirty();
              }}
              comboPool={comboPool}
              setComboPool={(next) => {
                setComboPool(next);
                markSectionsDirty();
              }}
              comboLocations={comboLocations}
              setComboLocations={(next) => {
                setComboLocations(next);
                markSectionsDirty();
              }}
              itineraryRows={itineraryRows}
              setItineraryRows={(next) => {
                setItineraryRows(next);
                markSectionsDirty();
              }}
              opHourRows={opHourRows}
              setOpHourRows={(next) => {
                setOpHourRows(next);
                markSectionsDirty();
              }}
              opHourMode={opHourMode}
              setOpHourMode={(next) => {
                setOpHourMode(next);
                markSectionsDirty();
              }}
              ageBandRows={ageBandRows}
              setAgeBandRows={(next) => {
                setAgeBandRows(next);
                markSectionsDirty();
              }}
              onSectionDirty={markSectionsDirty}
            />
          )}
        </div>

        <AlertModal
          isOpen={deleteConfirm}
          onClose={() => setDeleteConfirm(false)}
          onConfirm={onDelete}
          loading={saving}
          title="Delete Package"
          description="Are you sure you want to delete this package? This action cannot be undone."
        />
      </>
    );
  },
);

export default PackageCard;

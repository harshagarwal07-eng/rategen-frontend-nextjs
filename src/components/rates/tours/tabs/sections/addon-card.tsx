"use client";

// AddonCard — collapsible per-add-on card for Tab 4.
// Owns its RHF form (header fields), section state (age policy bands,
// per-band rates, total-rate tiers, package links, images), and an
// imperative `save()` handle that Tab4Addons calls once per card.
//
// Save sequence (parent invokes via formRef → onSubmit):
//   1. createTourAddon() | updateTourAddon()
//   2. replaceAddonAgePolicies()
//   3. replaceAddonRates()
//   4. replaceAddonTotalRates()
//   5. For each package whose link state changed, recompute the FULL
//      list of addons currently linked to that package (via the
//      tab-level snapshot of all OTHER addons' link maps) and call
//      replacePackageAddons(packageId, fullList).

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
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/ui/alert-modal";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  TourAddonAgePolicyBand,
  TourAddonDetail,
  TourAddonImage,
  TourAddonRate,
  TourAddonTotalRateTier,
  TourPackageAddonLink,
  TourPackageDetail,
} from "@/types/tours";
import {
  createTourAddon,
  deleteTourAddon,
  replaceAddonAgePolicies,
  replaceAddonRates,
  replaceAddonTotalRates,
  replacePackageAddons,
  updateTourAddon,
} from "@/data-access/tours-api";

import AddonCardBody from "./addon-card-body";
import {
  AddonAgeBandRow,
  addonRowsToBands,
  bandsToAddonRows,
} from "./addon-age-policy-section";
import {
  AddonRateMap,
  mapToRates,
  ratesToMap,
} from "./addon-rates-section";
import {
  AddonTotalRateRow,
  rowsToTiers,
  tiersToRows,
} from "./addon-total-rate-section";
import {
  AddonLinkMap,
  initLinkMap,
} from "./addon-package-links-section";

// ─── Schema ────────────────────────────────────────────────────────────

const AddonFormSchema = z.object({
  name: z.string().min(1, "Add-on name is required"),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  total_rate: z.number().nullable().optional(),
  max_participants: z.number().nullable().optional(),
  is_mandatory: z.boolean().optional(),
});

export type AddonFormValues = z.infer<typeof AddonFormSchema>;

// ─── Public types ──────────────────────────────────────────────────────

export type AddonStateEntry = TourAddonDetail & { _localId: string };

export type AddonSaveResult =
  | { success: true; name: string; updatedAddon: AddonStateEntry }
  | { success: false; name: string; error: string };

export type AddonCardHandle = {
  save: () => Promise<AddonSaveResult>;
  /** Live snapshot of this card's package-link state — used by the
   *  tab-level orchestrator so other cards can compute full per-package
   *  lists on save. */
  getLinkMap: () => AddonLinkMap;
};

// ─── Component ─────────────────────────────────────────────────────────

interface AddonCardProps {
  tourId: string;
  addon: AddonStateEntry;
  packages: TourPackageDetail[];
  /** Snapshot of every other addon's link map. Excludes self. */
  getOtherLinkMaps: () => Map<string, AddonLinkMap>;
  isOpen: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onDirtyChange: (localId: string, isDirty: boolean) => void;
}

const AddonCard = forwardRef<AddonCardHandle, AddonCardProps>(
  function AddonCard(
    {
      tourId,
      addon,
      packages,
      getOtherLinkMaps,
      isOpen,
      onToggle,
      onDeleted,
      onDirtyChange,
    },
    ref,
  ) {
    const isPending = addon.id.startsWith("pending");
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // ── Section state ─────────────────────────────────────────────────
    const initialBands = useMemo(
      () => bandsToAddonRows(addon.tour_addon_age_policies ?? []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [addon.id],
    );
    const [ageBandRows, setAgeBandRows] =
      useState<AddonAgeBandRow[]>(initialBands);

    const initialRates = useMemo(
      () => ratesToMap(addon.tour_addon_rates ?? []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [addon.id],
    );
    const [rateMap, setRateMap] = useState<AddonRateMap>(initialRates);

    const initialTiers = useMemo(
      () => tiersToRows(addon.tour_addon_total_rates ?? []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [addon.id],
    );
    const [tierRows, setTierRows] =
      useState<AddonTotalRateRow[]>(initialTiers);

    const initialLinks = useMemo(
      () => initLinkMap(packages, addon.id),
      [packages, addon.id],
    );
    const [linkMap, setLinkMap] = useState<AddonLinkMap>(initialLinks);
    // Whenever the parent's package list changes, re-init link map for
    // any newly-added package. Existing entries are preserved.
    useEffect(() => {
      setLinkMap((prev) => {
        const fresh = initLinkMap(packages, addon.id);
        return { ...fresh, ...prev };
      });
    }, [packages, addon.id]);

    const [images, setImages] = useState<TourAddonImage[]>(
      addon.tour_addon_images ?? [],
    );

    // Snapshot baselines for non-RHF dirty detection.
    const baselineBands = useRef(JSON.stringify(initialBands));
    const baselineRates = useRef(JSON.stringify(initialRates));
    const baselineTiers = useRef(JSON.stringify(initialTiers));
    const baselineLinks = useRef(JSON.stringify(initialLinks));

    // ── Form ──────────────────────────────────────────────────────────
    const form = useForm<AddonFormValues>({
      resolver: zodResolver(AddonFormSchema),
      mode: "onBlur",
      defaultValues: {
        name: addon.name ?? "",
        description: addon.description ?? null,
        notes: addon.notes ?? null,
        total_rate: addon.total_rate ?? null,
        max_participants: addon.max_participants ?? null,
        is_mandatory: addon.is_mandatory ?? false,
      },
    });

    const liveTitle = form.watch("name");

    // ── Dirty bubble-up ───────────────────────────────────────────────
    const { isDirty: formDirty } = form.formState;
    const sectionsDirty =
      JSON.stringify(ageBandRows) !== baselineBands.current ||
      JSON.stringify(rateMap) !== baselineRates.current ||
      JSON.stringify(tierRows) !== baselineTiers.current ||
      JSON.stringify(linkMap) !== baselineLinks.current;
    const isDirty = formDirty || sectionsDirty || isPending;

    const onDirtyChangeRef = useRef(onDirtyChange);
    onDirtyChangeRef.current = onDirtyChange;
    const lastReported = useRef<boolean | undefined>(undefined);
    useEffect(() => {
      if (lastReported.current !== isDirty) {
        lastReported.current = isDirty;
        onDirtyChangeRef.current?.(addon._localId, isDirty);
      }
    }, [isDirty, addon._localId]);

    // ── Helpers ───────────────────────────────────────────────────────
    const sortedBands = useMemo(
      () =>
        addonRowsToBands(ageBandRows).sort(
          (a, b) => (a.band_order ?? 0) - (b.band_order ?? 0),
        ),
      [ageBandRows],
    );

    // ── save() — orchestrates the whole add-on save ──────────────────
    useImperativeHandle(ref, () => ({
      getLinkMap: () => linkMap,
      save: async (): Promise<AddonSaveResult> => {
        const valid = await form.trigger();
        if (!valid) {
          return {
            success: false,
            name: form.getValues("name") || addon.name,
            error: "Validation failed",
          };
        }
        const v = form.getValues();
        setSaving(true);
        try {
          const payload: Partial<TourAddonDetail> = {
            name: v.name.trim(),
            description: v.description?.trim() || null,
            notes: v.notes?.trim() || null,
            total_rate: v.total_rate ?? null,
            max_participants: v.max_participants ?? null,
            is_mandatory: !!v.is_mandatory,
            status: addon.status || "active",
            sort_order: addon.sort_order ?? 0,
          };

          // 1. Create or update the add-on row.
          let saved: TourAddonDetail;
          if (isPending) {
            const res = await createTourAddon(tourId, payload);
            if (res.error || !res.data)
              throw new Error(res.error ?? "Failed to create add-on");
            saved = res.data;
          } else {
            const res = await updateTourAddon(addon.id, payload);
            if (res.error || !res.data)
              throw new Error(res.error ?? "Failed to update add-on");
            saved = res.data;
          }

          // 2. Age policies
          const bandsPayload: TourAddonAgePolicyBand[] = addonRowsToBands(
            ageBandRows.filter((r) => r.band_name.trim()),
          );
          const apRes = await replaceAddonAgePolicies(saved.id, bandsPayload);
          if (apRes.error) throw new Error(`Age policy: ${apRes.error}`);

          // 3. Per-age-band rates
          const ratesPayload: TourAddonRate[] = mapToRates(
            bandsPayload,
            rateMap,
          );
          const rRes = await replaceAddonRates(saved.id, ratesPayload);
          if (rRes.error) throw new Error(`Rates: ${rRes.error}`);

          // 4. Total-rate tiers
          const tiersPayload: TourAddonTotalRateTier[] = rowsToTiers(tierRows);
          const tRes = await replaceAddonTotalRates(saved.id, tiersPayload);
          if (tRes.error) throw new Error(`Total rates: ${tRes.error}`);

          // 5. Package links — for each package whose link state for
          //    THIS addon differs from the server, recompute the full
          //    list (combining all addons that link to it) and PUT.
          const baseline = JSON.parse(baselineLinks.current) as AddonLinkMap;
          const otherMaps = getOtherLinkMaps();
          const errors: string[] = [];
          for (const pkg of packages) {
            const desired = linkMap[pkg.id] ?? {
              applies: false,
              is_mandatory: false,
            };
            const prev = baseline[pkg.id] ?? {
              applies: false,
              is_mandatory: false,
            };
            const changed =
              prev.applies !== desired.applies ||
              prev.is_mandatory !== desired.is_mandatory;
            if (!changed) continue;

            const fullList: TourPackageAddonLink[] = [];
            for (const [otherAddonId, otherMap] of otherMaps.entries()) {
              const s = otherMap[pkg.id];
              if (s?.applies) {
                fullList.push({
                  addon_id: otherAddonId,
                  is_mandatory: !!s.is_mandatory,
                });
              }
            }
            if (desired.applies) {
              fullList.push({
                addon_id: saved.id,
                is_mandatory: !!desired.is_mandatory,
              });
            }
            const lr = await replacePackageAddons(pkg.id, fullList);
            if (lr.error) errors.push(`${pkg.name}: ${lr.error}`);
          }
          if (errors.length > 0)
            throw new Error(`Package links: ${errors.join("; ")}`);

          // ── Reset baselines ────────────────────────────────────────
          form.reset(v);
          baselineBands.current = JSON.stringify(ageBandRows);
          baselineRates.current = JSON.stringify(rateMap);
          baselineTiers.current = JSON.stringify(tierRows);
          baselineLinks.current = JSON.stringify(linkMap);

          const updated: AddonStateEntry = {
            ...saved,
            tour_addon_images: saved.tour_addon_images ?? images,
            _localId: isPending ? saved.id : addon._localId,
          };
          return { success: true, name: v.name, updatedAddon: updated };
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to save add-on";
          return {
            success: false,
            name: v.name || addon.name,
            error: msg,
          };
        } finally {
          setSaving(false);
        }
      },
    }));

    // ── Delete ─────────────────────────────────────────────────────
    const onDelete = useCallback(async () => {
      if (isPending) {
        onDeleted();
        return;
      }
      setSaving(true);
      try {
        const res = await deleteTourAddon(addon.id);
        if (res.error) throw new Error(res.error);
        toast.success("Add-on deleted");
        onDeleted();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      } finally {
        setSaving(false);
        setDeleteConfirm(false);
      }
    }, [addon.id, isPending, onDeleted]);

    // ── Header summary ────────────────────────────────────────────
    const appliedCount = Object.values(linkMap).filter((s) => s.applies).length;
    const mandatoryCount = Object.values(linkMap).filter(
      (s) => s.applies && s.is_mandatory,
    ).length;

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
                {liveTitle || "Unnamed Add-on"}
              </span>
              {isPending && (
                <span className="shrink-0 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  Unsaved
                </span>
              )}
              <Badge variant="outline" className="text-[10px] shrink-0">
                {appliedCount > 0
                  ? `${appliedCount} pkg${appliedCount !== 1 ? "s" : ""}${
                      mandatoryCount > 0
                        ? ` · ${mandatoryCount} mandatory`
                        : ""
                    }`
                  : "Not linked"}
              </Badge>
            </button>

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
            <AddonCardBody
              addonId={addon.id}
              isPending={isPending}
              form={form}
              packages={packages}
              ageBandRows={ageBandRows}
              setAgeBandRows={setAgeBandRows}
              sortedBands={sortedBands}
              rateMap={rateMap}
              setRateMap={setRateMap}
              tierRows={tierRows}
              setTierRows={setTierRows}
              linkMap={linkMap}
              setLinkMap={setLinkMap}
              images={images}
              setImages={setImages}
            />
          )}
        </div>

        <AlertModal
          isOpen={deleteConfirm}
          onClose={() => setDeleteConfirm(false)}
          onConfirm={onDelete}
          loading={saving}
          title="Delete Add-on"
          description="Are you sure you want to delete this add-on? This action cannot be undone."
        />
      </>
    );
  },
);

export default AddonCard;

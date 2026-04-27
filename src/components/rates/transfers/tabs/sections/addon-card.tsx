"use client";

// AddonCard — collapsible per-add-on card for Tab 4.
// Owns its RHF form (header fields), section state (age policy bands,
// per-band rates, package links, images), and an imperative `save()`
// handle that Tab4Addons calls once per dirty card.
//
// Save sequence (parent invokes from tab-level Save All button):
//   1. createTransferAddon() | updateTransferAddon()  — also writes total_rate
//      + max_participants
//   2. replaceTransferAddonAgePolicies()  (if bands dirty or pending)
//   3. replaceTransferAddonRates()        (if rates dirty or pending)
//   4. For each package whose link state changed, recompute the FULL
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
  TransferAddonAgePolicyBand,
  TransferAddonDetail,
  TransferAddonImage,
  TransferAddonRate,
  TransferPackageAddonLink,
  TransferPackageDetail,
} from "@/types/transfers";
import {
  createTransferAddon,
  deleteTransferAddon,
  replaceTransferAddonAgePolicies,
  replaceTransferAddonRates,
  replacePackageAddons,
  updateTransferAddon,
} from "@/data-access/transfers-api";

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
});

export type AddonFormValues = z.infer<typeof AddonFormSchema>;

// ─── Public types ──────────────────────────────────────────────────────

export type AddonStateEntry = TransferAddonDetail & { _localId: string };

export type AddonSaveResult =
  | { success: true; name: string; updatedAddon: AddonStateEntry }
  | { success: false; name: string; error: string };

export type AddonCardHandle = {
  save: () => Promise<AddonSaveResult>;
  /** Live snapshot of this card's package-link state — used by the
   *  tab-level orchestrator so other cards can compute full per-package
   *  lists on save. */
  getLinkMap: () => AddonLinkMap;
  /** True if this card has any unsaved changes. The tab-level Save All
   *  uses this to skip saving non-dirty cards. */
  isDirty: () => boolean;
};

// ─── Component ─────────────────────────────────────────────────────────

interface AddonCardProps {
  transferId: string;
  addon: AddonStateEntry;
  packages: TransferPackageDetail[];
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
      transferId,
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
      () => bandsToAddonRows(addon.transfer_addon_age_policies ?? []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [addon.id],
    );
    const [ageBandRows, setAgeBandRows] =
      useState<AddonAgeBandRow[]>(initialBands);

    const initialRates = useMemo(
      () => ratesToMap(addon.transfer_addon_rates ?? []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [addon.id],
    );
    const [rateMap, setRateMap] = useState<AddonRateMap>(initialRates);

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

    const [images, setImages] = useState<TransferAddonImage[]>(
      addon.transfer_addon_images ?? [],
    );

    // Snapshot baselines for non-RHF dirty detection.
    const baselineBands = useRef(JSON.stringify(initialBands));
    const baselineRates = useRef(JSON.stringify(initialRates));
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
      },
    });

    const liveTitle = form.watch("name");

    // ── Dirty bubble-up ───────────────────────────────────────────────
    const { isDirty: formDirty } = form.formState;
    const bandsDirty =
      JSON.stringify(ageBandRows) !== baselineBands.current;
    const ratesDirty = JSON.stringify(rateMap) !== baselineRates.current;
    const linksDirty = JSON.stringify(linkMap) !== baselineLinks.current;
    const sectionsDirty = bandsDirty || ratesDirty || linksDirty;
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
      isDirty: () => isDirty,
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
          const payload: Partial<TransferAddonDetail> = {
            name: v.name.trim(),
            description: v.description?.trim() || null,
            notes: v.notes?.trim() || null,
            total_rate: v.total_rate ?? null,
            max_participants: v.max_participants ?? null,
            status: addon.status || "active",
            sort_order: addon.sort_order ?? 0,
          };

          // 1. Create or update the add-on row.
          let saved: TransferAddonDetail;
          if (isPending) {
            const res = await createTransferAddon(transferId, payload);
            if (res.error || !res.data)
              throw new Error(res.error ?? "Failed to create add-on");
            saved = res.data;
          } else {
            const res = await updateTransferAddon(addon.id, payload);
            if (res.error || !res.data)
              throw new Error(res.error ?? "Failed to update add-on");
            saved = res.data;
          }

          // 2. Age policies — only PUT if dirty or just-created.
          const bandsPayload: TransferAddonAgePolicyBand[] = addonRowsToBands(
            ageBandRows.filter((r) => r.band_name.trim()),
          );
          if (bandsDirty || isPending) {
            const apRes = await replaceTransferAddonAgePolicies(
              saved.id,
              bandsPayload,
            );
            if (apRes.error) throw new Error(`Age policy: ${apRes.error}`);
          }

          // 3. Per-age-band rates — only PUT if dirty or just-created.
          if (ratesDirty || bandsDirty || isPending) {
            const ratesPayload: TransferAddonRate[] = mapToRates(
              bandsPayload,
              rateMap,
            );
            const rRes = await replaceTransferAddonRates(
              saved.id,
              ratesPayload,
            );
            if (rRes.error) throw new Error(`Rates: ${rRes.error}`);
          }

          // 4. Package links — for each package whose link state for
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

            const fullList: TransferPackageAddonLink[] = [];
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
          baselineLinks.current = JSON.stringify(linkMap);

          const updated: AddonStateEntry = {
            ...saved,
            transfer_addon_age_policies:
              saved.transfer_addon_age_policies ?? bandsPayload,
            transfer_addon_rates:
              saved.transfer_addon_rates ??
              mapToRates(bandsPayload, rateMap),
            transfer_addon_total_rates:
              saved.transfer_addon_total_rates ?? [],
            transfer_addon_images: saved.transfer_addon_images ?? images,
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
        const res = await deleteTransferAddon(addon.id);
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

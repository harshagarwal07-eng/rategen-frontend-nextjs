"use client";

// Tab 3 — Seasons & Rates (Tours).
// Per-package: age policy → seasons → taxes. Save is per-package via
// in-card buttons. The wizard footer's "Save & Continue" only advances
// when nothing is dirty — same pattern as transfers Tab 3.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TourAgePolicyBand,
  TourDetail,
  TourPackageDetail,
  TourPackageSalesMode,
  TourPackageRateMode,
  TourPackageSeason,
  TourVehicleRateType,
} from "@/types/tours";
import {
  createSeason,
  deleteSeason,
  listPackageSeasons,
  listTourPackages,
  listTourCurrencies,
  patchSeason,
  replaceSeasonBlackoutDates,
  replaceSeasonDateRanges,
  replaceSeasonPaxRates,
  replaceSeasonPrivateRates,
  replaceSeasonVehicleRates,
  replacePackageTaxes,
  getPackageTaxes,
} from "@/data-access/tours-api";

import SeasonCard, {
  TourSeasonEditState,
  defaultTourSeasonState,
} from "./sections/season-card";
import TaxesEditor, {
  TaxRow,
  rowsToTaxes,
  taxesToRows,
} from "./sections/taxes-editor";
import {
  paxRatesToRows,
  rowsToPaxRates,
  cellsToPrivateRates,
  privateRatesToCells,
  privateRatesToTiers,
  tiersToPrivateRates,
  rowsToVehicleRates,
  vehicleRatesToRows,
} from "./sections/season-rates-editor";
// We can reuse transfers' overlap utility and copy dialog as-is — they
// are pure (no transfer-specific types).
import {
  detectInterSeasonOverlaps,
  detectRangeOverlaps,
} from "@/components/rates/transfers/tabs/sections/date-range-overlap";
import SeasonCopyDialog, {
  CopyTargetPackage,
} from "@/components/rates/transfers/tabs/sections/season-copy-dialog";

// ─── Helpers ────────────────────────────────────────────────────────────

const DEFAULT_AGE_BANDS: TourAgePolicyBand[] = [
  { band_name: "Infant", age_from: 0, age_to: 1 },
  { band_name: "Child", age_from: 2, age_to: 11 },
  { band_name: "Adult", age_from: 12, age_to: 99 },
];

function readBands(pkg: TourPackageDetail): TourAgePolicyBand[] {
  const raw = pkg.tour_package_age_policies;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_AGE_BANDS;
  return [...raw]
    .map((b) => ({
      id: b.id,
      band_name: b.band_name,
      age_from: Number(b.age_from),
      age_to: Number(b.age_to),
    }))
    .sort((a, b) => a.age_from - b.age_from);
}

function seasonFromServer(
  s: TourPackageSeason,
  bands: TourAgePolicyBand[],
): TourSeasonEditState {
  const privateRates = s.tour_season_private_rates ?? [];
  return {
    _localId: s.id,
    id: s.id,
    status: s.status || "active",
    exception_rules: s.exception_rules ?? "",
    vehicle_rate_type: s.vehicle_rate_type,
    rate_type: s.rate_type ?? "per_pax",
    private_rate_mode: s.private_rate_mode ?? "per_pax",
    child_discount_type: s.child_discount_type,
    child_discount_value:
      s.child_discount_value == null ? "" : String(s.child_discount_value),
    infant_discount_type: s.infant_discount_type,
    infant_discount_value:
      s.infant_discount_value == null ? "" : String(s.infant_discount_value),
    date_ranges: (s.tour_season_date_ranges ?? []).map((r) => ({
      valid_from: r.valid_from,
      valid_till: r.valid_till,
    })),
    blackout_dates: (s.tour_season_blackout_dates ?? []).map(
      (b) => b.blackout_date,
    ),
    pax_rows: paxRatesToRows(s.tour_season_pax_rates ?? [], bands),
    vehicle_rows: vehicleRatesToRows(s.tour_season_vehicle_rates ?? []),
    private_cells: privateRatesToCells(privateRates),
    private_tier_rows: privateRatesToTiers(privateRates),
    total_rate: s.total_rate == null ? "" : String(s.total_rate),
    total_max_capacity:
      s.total_max_pax == null ? "" : String(s.total_max_pax),
  };
}

// Stable JSON snapshot for dirty detection.
function snapshotPackage(
  taxes: TaxRow[],
  seasons: TourSeasonEditState[],
): string {
  return JSON.stringify({
    taxes: rowsToTaxes(taxes),
    seasons: seasons.map((s) => ({
      id: s.id,
      exception_rules: s.exception_rules.trim(),
      vehicle_rate_type: s.vehicle_rate_type,
      rate_type: s.rate_type,
      child_discount_type: s.child_discount_type,
      child_discount_value: s.child_discount_value.trim(),
      infant_discount_type: s.infant_discount_type,
      infant_discount_value: s.infant_discount_value.trim(),
      date_ranges: s.date_ranges,
      blackout_dates: [...s.blackout_dates].sort(),
      pax_rows: s.pax_rows,
      vehicle_rows: s.vehicle_rows.map((v) => ({
        vehicle_type_id: v.vehicle_type_id,
        rate: v.rate,
      })),
      private_rate_mode: s.private_rate_mode,
      private_cells: s.private_cells.map((c) => ({
        pax_count: c.pax_count,
        rate: c.rate,
      })),
      private_tier_rows: s.private_tier_rows.map((t) => ({
        min_pax: t.min_pax,
        max_pax: t.max_pax,
        rate: t.rate,
      })),
      total_rate: s.total_rate.trim(),
      total_max_capacity: s.total_max_capacity.trim(),
    })),
  });
}

// ─── PackageRatesCard ───────────────────────────────────────────────────

interface PackageStateEntry {
  pkg: TourPackageDetail;
  /** Read-only — sourced from pkg.tour_package_age_policies (Tab 2 owns edits). */
  bands: TourAgePolicyBand[];
  taxes: TaxRow[];
  seasons: TourSeasonEditState[];
  snapshot: string;
}

interface PackageRatesCardProps {
  entry: PackageStateEntry;
  /** 3-letter currency code piped to season cards for header breakdowns. */
  currency: string;
  isOpen: boolean;
  saving: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PackageStateEntry>) => void;
  onSavePackage: () => void;
  onCopyAllToOther: () => void;
  onCopyOneSeasonToOther: (seasonLocalId: string) => void;
  onDeleteSeason: (seasonLocalId: string) => void;
}

function PackageRatesCard({
  entry,
  currency,
  isOpen,
  saving,
  onToggle,
  onChange,
  onSavePackage,
  onCopyAllToOther,
  onCopyOneSeasonToOther,
  onDeleteSeason,
}: PackageRatesCardProps) {
  const { pkg, bands, taxes, seasons, snapshot } = entry;
  const [openSeasonIds, setOpenSeasonIds] = useState<Set<string>>(new Set());

  const ageBandsForLabels = bands;
  const currentSnapshot = snapshotPackage(taxes, seasons);
  const isDirty = currentSnapshot !== snapshot;

  // Overlap detection.
  const seasonRangeErrors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const s of seasons) {
      const errs: string[] = new Array(s.date_ranges.length).fill("");
      for (const c of detectRangeOverlaps(s.date_ranges)) {
        errs[c.index] = c.message;
      }
      map[s._localId] = errs;
    }
    const inter = detectInterSeasonOverlaps(
      seasons.map((s) => ({
        seasonLocalId: s._localId,
        seasonName: "Season",
        ranges: s.date_ranges,
      })),
    );
    for (const c of inter) {
      const arr = map[c.seasonLocalId];
      if (!arr) continue;
      arr[c.rangeIndex] = arr[c.rangeIndex]
        ? `${arr[c.rangeIndex]}; ${c.message}`
        : c.message;
    }
    return map;
  }, [seasons]);

  const hasOverlapErrors = useMemo(
    () =>
      Object.values(seasonRangeErrors).some((errs) =>
        errs.some((e) => e.length > 0),
      ),
    [seasonRangeErrors],
  );

  function toggleSeason(localId: string) {
    setOpenSeasonIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }

  function addSeason() {
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fresh = defaultTourSeasonState(localId, ageBandsForLabels);
    onChange({ seasons: [...seasons, fresh] });
    setOpenSeasonIds((prev) => new Set(prev).add(localId));
  }

  function updateSeason(localId: string, next: TourSeasonEditState) {
    onChange({
      seasons: seasons.map((s) => (s._localId === localId ? next : s)),
    });
  }

  function handleDeleteSeason(localId: string) {
    setOpenSeasonIds((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
    onDeleteSeason(localId);
  }

  function duplicateSeasonLocal(localId: string) {
    const src = seasons.find((s) => s._localId === localId);
    if (!src) return;
    const newId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copy: TourSeasonEditState = {
      ...src,
      _localId: newId,
      id: newId,
      vehicle_rows: src.vehicle_rows.map((v) => ({
        ...v,
        _key: `vr-${Date.now()}-${Math.random()}`,
      })),
      private_cells: src.private_cells.map((c) => ({
        ...c,
        _key: `pp-${c.pax_count}-${Date.now()}`,
      })),
      private_tier_rows: src.private_tier_rows.map((t) => ({
        ...t,
        _key: `tr-${Date.now()}-${Math.random()}`,
      })),
    };
    onChange({ seasons: [...seasons, copy] });
    setOpenSeasonIds((prev) => new Set(prev).add(newId));
  }

  return (
    <div className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
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
          {isDirty && (
            <span
              className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
              aria-label="Unsaved changes"
            />
          )}
          <span className="text-sm font-semibold truncate">
            {pkg.name || "Unnamed Package"}
          </span>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground capitalize">
            {pkg.category.replace("_", " ")}
          </span>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {pkg.sales_mode}
          </span>
          <span className="text-muted-foreground/50 shrink-0">·</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {seasons.length} season{seasons.length !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground/50 shrink-0">·</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {taxes.length} tax{taxes.length !== 1 ? "es" : ""}
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Copy all seasons to another package"
          onClick={onCopyAllToOther}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 pt-3 border-t flex flex-col gap-5">
          {/* Seasons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold">Seasons</p>
                <p className="text-[11px] text-muted-foreground/80">
                  Date ranges, blackouts, and rates per season.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSeason}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Season
              </Button>
            </div>

            {seasons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                <p className="text-sm">
                  No seasons yet. Click &quot;Add Season&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {seasons.map((s) => (
                  <SeasonCard
                    key={s._localId}
                    season={s}
                    salesMode={pkg.sales_mode}
                    ageBands={ageBandsForLabels}
                    currency={currency}
                    isOpen={openSeasonIds.has(s._localId)}
                    isDirty={
                      s.id.startsWith("pending") ||
                      currentSnapshot !== snapshot
                    }
                    rangeErrors={seasonRangeErrors[s._localId]}
                    onToggle={() => toggleSeason(s._localId)}
                    onChange={(next) => updateSeason(s._localId, next)}
                    onDelete={() => handleDeleteSeason(s._localId)}
                    onDuplicate={() => duplicateSeasonLocal(s._localId)}
                    onCopyToOther={() => onCopyOneSeasonToOther(s._localId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Taxes */}
          <TaxesEditor
            rows={taxes}
            onChange={(rows) => onChange({ taxes: rows })}
          />

          {/* Save */}
          <div className="flex justify-end items-center gap-2 pt-2 border-t">
            {hasOverlapErrors && (
              <span className="text-xs text-destructive">
                Resolve overlapping date ranges first.
              </span>
            )}
            <Button
              type="button"
              onClick={onSavePackage}
              disabled={saving || !isDirty || hasOverlapErrors}
              title={
                hasOverlapErrors
                  ? "Resolve overlapping date ranges first."
                  : undefined
              }
              className="min-w-40"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Package
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab3 root ──────────────────────────────────────────────────────────

interface Tab3SeasonsRatesProps {
  initialData: Partial<TourDetail> | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function Tab3SeasonsRates({
  initialData,
  onDirtyChange,
}: Tab3SeasonsRatesProps) {
  const tourId = initialData?.id;
  const [entries, setEntries] = useState<PackageStateEntry[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingPkgId, setSavingPkgId] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>("");

  // Resolve the tour's currency_id → 3-letter code for header breakdowns.
  useEffect(() => {
    const id = initialData?.currency_id;
    if (!id) {
      setCurrencyCode("");
      return;
    }
    let cancelled = false;
    listTourCurrencies().then((res) => {
      if (cancelled) return;
      const match = res.data?.find((c) => c.id === id);
      setCurrencyCode(match?.code ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [initialData?.currency_id]);

  const [copyDialog, setCopyDialog] = useState<{
    open: boolean;
    mode: "single" | "all";
    sourcePkgId: string;
    sourceSeasonLocalId?: string;
  } | null>(null);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReported = useRef<boolean | undefined>(undefined);

  const anyDirty = useMemo(
    () =>
      entries.some(
        (e) => snapshotPackage(e.taxes, e.seasons) !== e.snapshot,
      ),
    [entries],
  );

  useEffect(() => {
    if (lastReported.current !== anyDirty) {
      lastReported.current = anyDirty;
      onDirtyChangeRef.current?.(anyDirty);
    }
  }, [anyDirty]);

  useEffect(
    () => () => {
      onDirtyChangeRef.current?.(false);
    },
    [],
  );

  // Load packages + seasons + taxes.
  useEffect(() => {
    if (!tourId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const pkgsRes = await listTourPackages(tourId);
      if (cancelled) return;
      const pkgs = (pkgsRes.data ?? []) as TourPackageDetail[];

      const loaded: PackageStateEntry[] = await Promise.all(
        pkgs.map(async (pkg) => {
          const [seasonsRes, taxesRes] = await Promise.all([
            listPackageSeasons(pkg.id),
            getPackageTaxes(pkg.id),
          ]);
          const bands = readBands(pkg);
          const seasons = (seasonsRes.data ?? []).map((s) =>
            seasonFromServer(s, bands),
          );
          const taxes = taxesToRows(taxesRes.data ?? []);
          return {
            pkg,
            bands,
            taxes,
            seasons,
            snapshot: snapshotPackage(taxes, seasons),
          };
        }),
      );
      if (cancelled) return;
      setEntries(loaded);
      setOpenIds(new Set(loaded.length === 1 ? [loaded[0].pkg.id] : []));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  function toggleCard(pkgId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  }

  function patchEntry(pkgId: string, patch: Partial<PackageStateEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.pkg.id === pkgId ? { ...e, ...patch } : e)),
    );
  }

  const handleDeleteSeason = useCallback(
    async (pkgId: string, seasonLocalId: string) => {
      const entry = entries.find((e) => e.pkg.id === pkgId);
      if (!entry) return;
      const season = entry.seasons.find((s) => s._localId === seasonLocalId);
      if (!season) return;
      const isPersisted = !season.id.startsWith("pending");
      if (isPersisted) {
        const res = await deleteSeason(season.id);
        if (res.error) {
          toast.error(`Delete failed: ${res.error}`);
          return;
        }
      }
      setEntries((prev) =>
        prev.map((e) => {
          if (e.pkg.id !== pkgId) return e;
          const nextSeasons = e.seasons.filter(
            (s) => s._localId !== seasonLocalId,
          );
          return {
            ...e,
            seasons: nextSeasons,
            snapshot: isPersisted
              ? snapshotPackage(e.taxes, nextSeasons)
              : e.snapshot,
          };
        }),
      );
      if (isPersisted) toast.success("Season deleted.");
    },
    [entries],
  );

  function openCopyAll(sourcePkgId: string) {
    setCopyDialog({ open: true, mode: "all", sourcePkgId });
  }

  function openCopyOne(sourcePkgId: string, seasonLocalId: string) {
    setCopyDialog({
      open: true,
      mode: "single",
      sourcePkgId,
      sourceSeasonLocalId: seasonLocalId,
    });
  }

  function closeCopy() {
    setCopyDialog(null);
  }

  function cloneSeason(src: TourSeasonEditState): TourSeasonEditState {
    const newId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      ...src,
      _localId: newId,
      id: newId,
      vehicle_rows: src.vehicle_rows.map((v) => ({
        ...v,
        _key: `vr-${Date.now()}-${Math.random()}`,
      })),
      private_cells: src.private_cells.map((c) => ({
        ...c,
        _key: `pp-${c.pax_count}-${Date.now()}`,
      })),
      private_tier_rows: src.private_tier_rows.map((t) => ({
        ...t,
        _key: `tr-${Date.now()}-${Math.random()}`,
      })),
    };
  }

  function applyCopy(targetIds: string[]) {
    if (!copyDialog) return;
    const source = entries.find((e) => e.pkg.id === copyDialog.sourcePkgId);
    if (!source) {
      closeCopy();
      return;
    }
    const sourceSeasons =
      copyDialog.mode === "all"
        ? source.seasons
        : source.seasons.filter(
            (s) => s._localId === copyDialog.sourceSeasonLocalId,
          );
    if (sourceSeasons.length === 0) {
      closeCopy();
      return;
    }

    setEntries((prev) =>
      prev.map((e) => {
        if (!targetIds.includes(e.pkg.id)) return e;
        const cloned = sourceSeasons.map(cloneSeason);
        return { ...e, seasons: [...e.seasons, ...cloned] };
      }),
    );

    const numCopied = sourceSeasons.length;
    const numTargets = targetIds.length;
    toast.success(
      copyDialog.mode === "all"
        ? `${numCopied} season${numCopied !== 1 ? "s" : ""} copied to ${numTargets} package${numTargets !== 1 ? "s" : ""}. Save each package to persist.`
        : `Season copied to ${numTargets} package${numTargets !== 1 ? "s" : ""}. Save each package to persist.`,
    );
    closeCopy();
  }

  // ── Save orchestration per package ────────────────────────────────
  async function saveOnePackage(pkgId: string) {
    const entry = entries.find((e) => e.pkg.id === pkgId);
    if (!entry) return;

    setSavingPkgId(pkgId);
    try {
      // Age policies live on the package (Tab 2) — Tab 3 does not edit them.

      // 1. Taxes
      const taxRes = await replacePackageTaxes(
        entry.pkg.id,
        rowsToTaxes(entry.taxes),
      );
      if (taxRes.error) throw new Error(`Taxes: ${taxRes.error}`);

      // 2. Seasons (POST first when pending, then PATCH + PUT children).
      const updatedSeasons: TourSeasonEditState[] = [];
      for (const s of entry.seasons) {
        let realId = s.id;
        if (s.id.startsWith("pending")) {
          const created = await createSeason(entry.pkg.id, {
            status: "active",
            sort_order: updatedSeasons.length,
          });
          if (created.error || !created.data) {
            throw new Error(`Season create: ${created.error ?? "unknown"}`);
          }
          realId = created.data.id;
        }

        const childVal =
          s.child_discount_value === ""
            ? null
            : Number(s.child_discount_value);
        const infantVal =
          s.infant_discount_value === ""
            ? null
            : Number(s.infant_discount_value);

        // Total fields only persist when rate_type === 'total'; other
        // modes clear them so a stale value never resurfaces.
        const isTotalMode = s.rate_type === "total";
        const totalRateNum = isTotalMode
          ? s.total_rate.trim() === ""
            ? null
            : Number(s.total_rate)
          : null;
        const totalMaxNum = isTotalMode
          ? s.total_max_capacity.trim() === ""
            ? null
            : Number(s.total_max_capacity)
          : null;

        const patchRes = await patchSeason(realId, {
          exception_rules: s.exception_rules.trim() || null,
          vehicle_rate_type: s.vehicle_rate_type as TourVehicleRateType | null,
          rate_type: s.rate_type,
          private_rate_mode: s.private_rate_mode,
          child_discount_type: s.child_discount_type,
          child_discount_value: childVal,
          infant_discount_type: s.infant_discount_type,
          infant_discount_value: infantVal,
          total_rate: totalRateNum,
          total_max_pax: totalMaxNum,
        });
        if (patchRes.error) throw new Error(`Season: ${patchRes.error}`);

        const drRes = await replaceSeasonDateRanges(realId, s.date_ranges);
        if (drRes.error)
          throw new Error(`Season dates: ${drRes.error}`);

        const bdRes = await replaceSeasonBlackoutDates(
          realId,
          s.blackout_dates,
        );
        if (bdRes.error)
          throw new Error(`Season blackouts: ${bdRes.error}`);

        // Rate-type-driven persistence: only the active shape's editor
        // pushes data; the other two shapes are cleared (delete-all) so
        // toggling modes can't leave stale rate rows behind.
        const salesMode = entry.pkg.sales_mode;
        const isPrivateOrExclusive =
          salesMode === "private" || salesMode === "exclusive";

        const writePax =
          s.rate_type === "per_pax" &&
          (salesMode === "ticket" || salesMode === "shared");
        const writePrivate =
          s.rate_type === "per_pax" && isPrivateOrExclusive;
        const writeVehicle = s.rate_type === "vehicle";

        const paxPayload = writePax ? rowsToPaxRates(s.pax_rows) : [];
        const privatePayload = writePrivate
          ? s.private_rate_mode === "tiered"
            ? tiersToPrivateRates(s.private_tier_rows)
            : cellsToPrivateRates(s.private_cells)
          : [];
        const vehiclePayload = writeVehicle
          ? rowsToVehicleRates(s.vehicle_rows)
          : [];

        const prRes = await replaceSeasonPaxRates(realId, paxPayload);
        if (prRes.error) throw new Error(`Season pax rates: ${prRes.error}`);
        const ppRes = await replaceSeasonPrivateRates(realId, privatePayload);
        if (ppRes.error)
          throw new Error(`Season private rates: ${ppRes.error}`);
        const vrRes = await replaceSeasonVehicleRates(realId, vehiclePayload);
        if (vrRes.error)
          throw new Error(`Season vehicle rates: ${vrRes.error}`);

        updatedSeasons.push({ ...s, id: realId, _localId: realId });
      }

      const fresh: PackageStateEntry = {
        ...entry,
        seasons: updatedSeasons,
        snapshot: snapshotPackage(entry.taxes, updatedSeasons),
      };
      setEntries((prev) =>
        prev.map((e) => (e.pkg.id === pkgId ? fresh : e)),
      );
      toast.success(`Package "${entry.pkg.name}" saved.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      toast.error(msg);
    } finally {
      setSavingPkgId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Loading packages and seasons…</p>
      </div>
    );
  }

  if (!tourId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Save the General Info tab first to enable Seasons &amp; Rates.</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Seasons &amp; Rates</h2>
          <p className="text-muted-foreground">
            Per-package seasons, rates, age policy, and taxes.
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">
            No packages yet. Add packages in Tab 2 first.
          </p>
        </div>
      </div>
    );
  }

  const dialogTargets: CopyTargetPackage[] = copyDialog
    ? entries
        .filter((e) => e.pkg.id !== copyDialog.sourcePkgId)
        .map((e) => ({ id: e.pkg.id, name: e.pkg.name }))
    : [];
  const dialogSource = copyDialog
    ? entries.find((e) => e.pkg.id === copyDialog.sourcePkgId)
    : null;
  const dialogSourceSeason =
    copyDialog?.mode === "single" && dialogSource
      ? dialogSource.seasons.find(
          (s) => s._localId === copyDialog.sourceSeasonLocalId,
        )
      : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Seasons &amp; Rates</h2>
        <p className="text-muted-foreground">
          Per-package seasons, rates, age policy, and taxes.
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <PackageRatesCard
            key={entry.pkg.id}
            entry={entry}
            currency={currencyCode}
            isOpen={openIds.has(entry.pkg.id)}
            saving={savingPkgId === entry.pkg.id}
            onToggle={() => toggleCard(entry.pkg.id)}
            onChange={(patch) => patchEntry(entry.pkg.id, patch)}
            onSavePackage={() => saveOnePackage(entry.pkg.id)}
            onCopyAllToOther={() => openCopyAll(entry.pkg.id)}
            onCopyOneSeasonToOther={(seasonLocalId) =>
              openCopyOne(entry.pkg.id, seasonLocalId)
            }
            onDeleteSeason={(seasonLocalId) =>
              handleDeleteSeason(entry.pkg.id, seasonLocalId)
            }
          />
        ))}
      </div>

      <SeasonCopyDialog
        isOpen={!!copyDialog}
        mode={copyDialog?.mode ?? "single"}
        sourcePackageName={dialogSource?.pkg.name ?? ""}
        sourceSeasonName={
          dialogSourceSeason
            ? `Season (${dialogSourceSeason.date_ranges.length} ranges)`
            : undefined
        }
        targets={dialogTargets}
        onClose={closeCopy}
        onConfirm={applyCopy}
      />
    </div>
  );
}

// Re-export so other callers can hint at the type without re-importing.
export type { TourPackageSalesMode, TourPackageRateMode };

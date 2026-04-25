"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Send, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TransferModeOfTransport,
  TransferPackageDetail,
  TransferSeason,
} from "@/types/transfers";
import {
  listTransferPackages,
  listPackageSeasons,
  listPackageTaxes,
  createSeason,
  patchSeason,
  deleteSeason,
  replaceSeasonDateRanges,
  replaceSeasonBlackoutDates,
  replaceSeasonSicRates,
  replaceSeasonPrivateRates,
  replaceSeasonVehicleRates,
  replacePackageAgePolicies,
  replacePackageTaxes,
} from "@/data-access/transfers-api";
import SeasonCard, {
  SeasonEditState,
  defaultSeasonState,
} from "./sections/season-card";
import AgePolicySection, {
  AgeBandRow,
  bandsToRows,
  rowsToBands,
} from "./sections/age-policy-section";
import TaxesEditor, {
  TaxRow,
  taxesToRows,
  rowsToTaxes,
} from "./sections/taxes-editor";
import SeasonCopyDialog, {
  CopyTargetPackage,
} from "./sections/season-copy-dialog";
import {
  sicRatesToRow,
  rowToSicRates,
  privateRatesToCells,
  cellsToPrivateRates,
  vehicleRatesToRows,
  rowsToVehicleRates,
} from "./sections/season-rates-editor";

// ─── Helpers ───────────────────────────────────────────────────────────

type AgePolicyBandRow = {
  id?: string;
  band_name: string;
  age_from: number;
  age_to: number;
};

function packageHasAgePolicy(
  pkg: TransferPackageDetail,
  modeOfTransport: TransferModeOfTransport | string | null,
): boolean {
  // Only PVT P2P shows package age policy. SIC and Disposal hide it.
  return pkg.service_mode === "private" && modeOfTransport === "vehicle_p2p";
}

function readBands(pkg: TransferPackageDetail): AgePolicyBandRow[] {
  const raw = (pkg as unknown as { transfer_package_age_policies?: AgePolicyBandRow[] })
    .transfer_package_age_policies;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => ({
      id: b.id,
      band_name: b.band_name,
      age_from: Number(b.age_from),
      age_to: Number(b.age_to),
    }))
    .sort((a, b) => a.age_from - b.age_from);
}

function seasonFromServer(s: TransferSeason): SeasonEditState {
  return {
    _localId: s.id,
    id: s.id,
    name: s.name ?? "",
    status: s.status || "active",
    exception_rules: s.exception_rules ?? "",
    vehicle_rate_type: s.vehicle_rate_type,
    child_discount_type: s.child_discount_type,
    child_discount_value:
      s.child_discount_value == null ? "" : String(s.child_discount_value),
    infant_discount_type: s.infant_discount_type,
    infant_discount_value:
      s.infant_discount_value == null ? "" : String(s.infant_discount_value),
    date_ranges: (s.transfer_season_date_ranges ?? []).map((r) => ({
      valid_from: r.valid_from,
      valid_till: r.valid_till,
    })),
    blackout_dates: (s.transfer_season_blackout_dates ?? []).map(
      (b) => b.blackout_date,
    ),
    sic_row: sicRatesToRow(s.transfer_season_sic_rates ?? []),
    vehicle_rows: vehicleRatesToRows(s.transfer_season_vehicle_rates ?? []),
    private_cells: privateRatesToCells(s.transfer_season_private_rates ?? []),
  };
}

// Stable serialisation for dirty detection.
function snapshotPackage(
  bands: AgeBandRow[],
  taxes: TaxRow[],
  seasons: SeasonEditState[],
): string {
  return JSON.stringify({
    bands: rowsToBands(bands),
    taxes: rowsToTaxes(taxes),
    seasons: seasons.map((s) => ({
      id: s.id,
      name: s.name.trim(),
      exception_rules: s.exception_rules.trim(),
      vehicle_rate_type: s.vehicle_rate_type,
      child_discount_type: s.child_discount_type,
      child_discount_value: s.child_discount_value.trim(),
      infant_discount_type: s.infant_discount_type,
      infant_discount_value: s.infant_discount_value.trim(),
      date_ranges: s.date_ranges,
      blackout_dates: [...s.blackout_dates].sort(),
      sic_row: s.sic_row,
      vehicle_rows: s.vehicle_rows.map((v) => ({
        vehicle_type_id: v.vehicle_type_id,
        rate: v.rate,
        max_pax: v.max_pax,
        max_pax_with_luggage: v.max_pax_with_luggage,
        max_luggage: v.max_luggage,
        max_kms_day: v.max_kms_day,
        max_hrs_day: v.max_hrs_day,
        supplement_hr: v.supplement_hr,
        supplement_km: v.supplement_km,
      })),
      private_cells: s.private_cells.map((c) => ({
        pax_count: c.pax_count,
        rate: c.rate,
      })),
    })),
  });
}

// Format duration like "4h" / "1d 3h" / "30m".
function formatDuration(d: number, h: number, m: number): string {
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length > 0 ? parts.join(" ") : "—";
}

// Trip type label for the header badge.
function tripTypeLabel(
  pkg: TransferPackageDetail,
  modeOfTransport: TransferModeOfTransport | string | null,
): string {
  if (modeOfTransport === "vehicle_disposal") {
    if (pkg.duration_days >= 1) return "Full-day Disposal";
    if (pkg.duration_hours >= 5) return "Full-day Disposal";
    if (pkg.duration_hours > 0) return "Half-day Disposal";
    return "Disposal";
  }
  if (pkg.trip_type === "round_trip") return "Round Trip";
  return "One Way";
}

// First → last stop summary if available.
function stopsSummary(pkg: TransferPackageDetail): string | null {
  const stops = pkg.transfer_package_stops ?? [];
  if (stops.length === 0) return null;
  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  const origin = sorted.find((s) => s.stop_type === "origin");
  const dest = sorted.find((s) => s.stop_type === "destination");
  if (!origin || !dest) return null;
  return "Origin → Destination";
}

// ─── PackageRatesCard ──────────────────────────────────────────────────

interface PackageStateEntry {
  pkg: TransferPackageDetail;
  bands: AgeBandRow[];
  taxes: TaxRow[];
  seasons: SeasonEditState[];
  snapshot: string;
}

interface PackageRatesCardProps {
  entry: PackageStateEntry;
  modeOfTransport: TransferModeOfTransport | string | null;
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
  modeOfTransport,
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

  const showAgePolicy = packageHasAgePolicy(pkg, modeOfTransport);

  const currentSnapshot = snapshotPackage(bands, taxes, seasons);
  const isDirty = currentSnapshot !== snapshot;

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
    const newSeason = defaultSeasonState(localId);
    onChange({ seasons: [...seasons, newSeason] });
    setOpenSeasonIds((prev) => new Set(prev).add(localId));
  }

  function updateSeason(localId: string, next: SeasonEditState) {
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
    const newLocalId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copy: SeasonEditState = {
      ...src,
      _localId: newLocalId,
      id: newLocalId,
      name: src.name ? `${src.name} (Copy)` : "Copy",
    };
    onChange({ seasons: [...seasons, copy] });
    setOpenSeasonIds((prev) => new Set(prev).add(newLocalId));
  }

  // Header summary badges
  const durationStr = formatDuration(
    pkg.duration_days,
    pkg.duration_hours,
    pkg.duration_minutes,
  );
  const hasDuration =
    pkg.duration_days > 0 || pkg.duration_hours > 0 || pkg.duration_minutes > 0;
  const tripLabel = tripTypeLabel(pkg, modeOfTransport);
  const seasonCountLabel = `${seasons.length} season${seasons.length !== 1 ? "s" : ""}`;
  const taxCountLabel = `${taxes.length} tax${taxes.length !== 1 ? "es" : ""}`;
  const stopLine = stopsSummary(pkg);

  return (
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
          {isDirty && (
            <span
              className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
              aria-label="Unsaved changes"
            />
          )}
          <span
            className={cn(
              "text-sm font-semibold truncate",
              !pkg.name && "text-muted-foreground italic",
            )}
          >
            {pkg.name || "Unnamed Package"}
          </span>

          {pkg.service_mode && modeOfTransport !== "vehicle_disposal" && (
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {pkg.service_mode === "sic" ? "SIC" : "Private"}
            </span>
          )}
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {tripLabel}
          </span>
          {hasDuration && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {durationStr}
            </span>
          )}
          <span className="text-muted-foreground/50 shrink-0">·</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {seasonCountLabel}
          </span>
          <span className="text-muted-foreground/50 shrink-0">·</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {taxCountLabel}
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

      {/* ── Expanded body ── */}
      {isOpen && (
        <div className="px-4 pb-4 pt-3 border-t flex flex-col gap-5">
          {stopLine && (
            <p className="text-xs text-muted-foreground">{stopLine}</p>
          )}

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
                <p className="text-sm">No seasons yet. Click "Add Season".</p>
              </div>
            ) : (
              <div className="space-y-2">
                {seasons.map((s) => (
                  <SeasonCard
                    key={s._localId}
                    season={s}
                    serviceMode={pkg.service_mode}
                    modeOfTransport={modeOfTransport}
                    isOpen={openSeasonIds.has(s._localId)}
                    isDirty={
                      s.id.startsWith("pending") ||
                      currentSnapshot !== snapshot
                    }
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

          {/* Age Policy */}
          {showAgePolicy && (
            <AgePolicySection
              rows={bands}
              onChange={(rows) => onChange({ bands: rows })}
            />
          )}

          {/* Taxes */}
          <TaxesEditor
            rows={taxes}
            onChange={(rows) => onChange({ taxes: rows })}
          />

          {/* Save */}
          <div className="flex justify-end pt-2 border-t">
            <Button
              type="button"
              onClick={onSavePackage}
              disabled={saving || !isDirty}
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

// ─── Tab3SeasonsRates root ─────────────────────────────────────────────

interface Tab3SeasonsRatesProps {
  initialData: { id?: string } | null;
  modeOfTransport: TransferModeOfTransport | string | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function Tab3SeasonsRates({
  initialData,
  modeOfTransport,
  onDirtyChange,
}: Tab3SeasonsRatesProps) {
  const transferId = initialData?.id;
  const [entries, setEntries] = useState<PackageStateEntry[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingPkgId, setSavingPkgId] = useState<string | null>(null);

  // Copy dialog state
  const [copyDialog, setCopyDialog] = useState<{
    open: boolean;
    mode: "single" | "all";
    sourcePkgId: string;
    sourceSeasonLocalId?: string;
  } | null>(null);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);

  // Compute global dirty
  const anyDirty = useMemo(
    () =>
      entries.some(
        (e) => snapshotPackage(e.bands, e.taxes, e.seasons) !== e.snapshot,
      ),
    [entries],
  );

  useEffect(() => {
    if (lastReportedDirty.current !== anyDirty) {
      lastReportedDirty.current = anyDirty;
      onDirtyChangeRef.current?.(anyDirty);
    }
  }, [anyDirty]);

  useEffect(
    () => () => {
      onDirtyChangeRef.current?.(false);
    },
    [],
  );

  // Load packages, seasons, and taxes for each.
  useEffect(() => {
    if (!transferId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const pkgsRes = await listTransferPackages(transferId);
      if (cancelled) return;
      const pkgs = (pkgsRes.data ?? []) as TransferPackageDetail[];

      const loaded: PackageStateEntry[] = await Promise.all(
        pkgs.map(async (pkg) => {
          const [seasonsRes, taxesRes] = await Promise.all([
            listPackageSeasons(pkg.id),
            listPackageTaxes(pkg.id),
          ]);
          const seasons = (seasonsRes.data ?? []).map(seasonFromServer);
          const bands = bandsToRows(readBands(pkg));
          const taxes = taxesToRows(taxesRes.data ?? []);
          return {
            pkg,
            bands,
            taxes,
            seasons,
            snapshot: snapshotPackage(bands, taxes, seasons),
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
  }, [transferId]);

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

  async function handleDeleteSeason(pkgId: string, seasonLocalId: string) {
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
            ? snapshotPackage(e.bands, e.taxes, nextSeasons)
            : e.snapshot,
        };
      }),
    );
    if (isPersisted) toast.success("Season deleted.");
  }

  // ── Copy operations (frontend-only, mark target dirty) ──

  function openCopyAll(sourcePkgId: string) {
    setCopyDialog({ open: true, mode: "all", sourcePkgId });
  }

  function openCopyOne(sourcePkgId: string, sourceSeasonLocalId: string) {
    setCopyDialog({
      open: true,
      mode: "single",
      sourcePkgId,
      sourceSeasonLocalId,
    });
  }

  function closeCopy() {
    setCopyDialog(null);
  }

  function cloneSeason(src: SeasonEditState): SeasonEditState {
    const newLocalId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      ...src,
      _localId: newLocalId,
      id: newLocalId,
      vehicle_rows: src.vehicle_rows.map((v) => ({
        ...v,
        _key: `vr-${Date.now()}-${Math.random()}`,
      })),
      private_cells: src.private_cells.map((c) => ({
        ...c,
        _key: `pp-${c.pax_count}-${Date.now()}`,
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

    let droppedRates = 0;

    setEntries((prev) =>
      prev.map((e) => {
        if (!targetIds.includes(e.pkg.id)) return e;
        const targetMode = e.pkg.service_mode;
        const cloned = sourceSeasons.map((s) => {
          const c = cloneSeason(s);
          // Drop incompatible rate tables on service-mode mismatch.
          if (
            source.pkg.service_mode === "sic" &&
            targetMode === "private"
          ) {
            droppedRates += c.sic_row.adult_rate ? 1 : 0;
            c.sic_row = {
              adult_rate: "",
              child_rate: "",
              max_pax: "",
              max_luggage: "",
              supplement_hr: "",
              supplement_km: "",
            };
          }
          if (
            source.pkg.service_mode === "private" &&
            targetMode === "sic"
          ) {
            droppedRates += c.vehicle_rows.length + c.private_cells.length;
            c.vehicle_rows = [];
            c.private_cells = [
              { _key: `pp-1-${Date.now()}`, pax_count: 1, rate: "" },
            ];
          }
          return c;
        });
        return { ...e, seasons: [...e.seasons, ...cloned] };
      }),
    );

    const numCopied = sourceSeasons.length;
    const numTargets = targetIds.length;
    if (copyDialog.mode === "all") {
      toast.success(
        `${numCopied} season${numCopied !== 1 ? "s" : ""} copied to ${numTargets} package${numTargets !== 1 ? "s" : ""}. Save each package to persist.`,
      );
    } else {
      toast.success(
        `Season copied to ${numTargets} package${numTargets !== 1 ? "s" : ""}. Save each package to persist.`,
      );
    }
    if (droppedRates > 0) {
      toast.warning("Some incompatible rate fields were dropped on copy.");
    }
    closeCopy();
  }

  // ── Save orchestration per package ──

  async function saveOnePackage(pkgId: string) {
    const entry = entries.find((e) => e.pkg.id === pkgId);
    if (!entry) return;

    setSavingPkgId(pkgId);
    try {
      // 1. Age policy (only for PVT P2P packages).
      if (packageHasAgePolicy(entry.pkg, modeOfTransport)) {
        const bands = rowsToBands(entry.bands);
        const res = await replacePackageAgePolicies(entry.pkg.id, bands);
        if (res.error) throw new Error(`Age policy: ${res.error}`);
      }

      // 2. Taxes.
      const taxes = rowsToTaxes(entry.taxes);
      const taxesRes = await replacePackageTaxes(entry.pkg.id, taxes);
      if (taxesRes.error) throw new Error(`Taxes: ${taxesRes.error}`);

      // 3. Seasons (POST first if pending, then PATCH basics + PUT children).
      const updatedSeasons: SeasonEditState[] = [];
      for (const s of entry.seasons) {
        let realId = s.id;
        if (s.id.startsWith("pending")) {
          const created = await createSeason(entry.pkg.id, {
            name: s.name.trim() || "All Season",
            status: "active",
            sort_order: updatedSeasons.length,
          });
          if (created.error || !created.data) {
            throw new Error(`Season create: ${created.error ?? "unknown"}`);
          }
          realId = created.data.id;
        }

        // PATCH basics for both new and existing seasons (for new, update name +
        // discount fields; for existing, sync any edited fields).
        const childVal =
          s.child_discount_value === ""
            ? null
            : Number(s.child_discount_value);
        const infantVal =
          s.infant_discount_value === ""
            ? null
            : Number(s.infant_discount_value);
        const patchRes = await patchSeason(realId, {
          name: s.name.trim() || null,
          exception_rules: s.exception_rules.trim() || null,
          vehicle_rate_type: s.vehicle_rate_type,
          child_discount_type: s.child_discount_type,
          child_discount_value: childVal,
          infant_discount_type: s.infant_discount_type,
          infant_discount_value: infantVal,
        });
        if (patchRes.error) {
          throw new Error(`Season "${s.name}": ${patchRes.error}`);
        }

        // Date ranges.
        const drRes = await replaceSeasonDateRanges(realId, s.date_ranges);
        if (drRes.error) {
          throw new Error(`Season "${s.name}" dates: ${drRes.error}`);
        }

        // Blackout dates.
        const bdRes = await replaceSeasonBlackoutDates(realId, s.blackout_dates);
        if (bdRes.error) {
          throw new Error(`Season "${s.name}" blackouts: ${bdRes.error}`);
        }

        // Rates per service mode.
        const isSic = entry.pkg.service_mode === "sic";
        const isP2pPvt =
          entry.pkg.service_mode === "private" &&
          modeOfTransport === "vehicle_p2p";
        const isDisposalPvt =
          entry.pkg.service_mode === "private" &&
          modeOfTransport === "vehicle_disposal";

        if (isSic) {
          const sr = await replaceSeasonSicRates(realId, rowToSicRates(s.sic_row));
          if (sr.error) throw new Error(`Season "${s.name}" SIC: ${sr.error}`);
        }
        if (isP2pPvt || isDisposalPvt) {
          const vr = await replaceSeasonVehicleRates(
            realId,
            rowsToVehicleRates(s.vehicle_rows),
          );
          if (vr.error)
            throw new Error(`Season "${s.name}" vehicle: ${vr.error}`);
        }
        if (isP2pPvt) {
          const pr = await replaceSeasonPrivateRates(
            realId,
            cellsToPrivateRates(s.private_cells),
          );
          if (pr.error)
            throw new Error(`Season "${s.name}" private: ${pr.error}`);
        }

        updatedSeasons.push({ ...s, id: realId, _localId: realId });
      }

      // Update local snapshot.
      const fresh: PackageStateEntry = {
        ...entry,
        seasons: updatedSeasons,
        snapshot: snapshotPackage(entry.bands, entry.taxes, updatedSeasons),
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

  // ── Render ──

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Loading packages and seasons…</p>
      </div>
    );
  }

  if (!transferId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Save the General Info tab first to enable Seasons & Rates.</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Seasons & Rates</h2>
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

  // Build copy dialog targets
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
        <h2 className="text-2xl font-bold mb-2">Seasons & Rates</h2>
        <p className="text-muted-foreground">
          Per-package seasons, rates, age policy, and taxes.
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <PackageRatesCard
            key={entry.pkg.id}
            entry={entry}
            modeOfTransport={modeOfTransport}
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

      {/* Continue button lives in the wizard footer; tab3Dirty propagates via
          onDirtyChange. */}

      {/* Copy dialog */}
      <SeasonCopyDialog
        isOpen={!!copyDialog}
        mode={copyDialog?.mode ?? "single"}
        sourcePackageName={dialogSource?.pkg.name ?? ""}
        sourceSeasonName={dialogSourceSeason?.name}
        targets={dialogTargets}
        onClose={closeCopy}
        onConfirm={applyCopy}
      />

    </div>
  );
}

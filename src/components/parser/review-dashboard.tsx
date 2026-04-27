"use client";

/**
 * Phase 3 — review dashboard (v1).
 *
 * Mounted by parse-session-view.tsx once parse_jobs.status reaches a
 * terminal state (completed | fully_resolved). Lets the user approve or
 * reject parsed packages individually and save the approved ones to real
 * tours/transfers tables atomically via /api/parser/jobs/:id/save.
 *
 * Scope:
 * - Stats strip (counts by review_status + confidence bucket)
 * - Single sortable table of all packages, with checkbox + row-level
 *   approve/reject + edit-status display
 * - Bulk approve / reject (footer) operating on selected non-terminal rows;
 *   bulk-approve is blocked when any selected pending row has
 *   confidence_score < 0.6 (per brief — those must be approved individually
 *   after edit)
 * - Bulk save of approved + selected
 * - Catalog/geo match readout (display-only; the change action — opening
 *   the master catalog picker / geo picker — is deferred to Phase 4 polish)
 * - Inline edit drawer is deferred to Phase 4 polish
 *
 * Save flow: rows must be in review_status='approved' AND ticked to be
 * saved. The endpoint per-package returns saved/error; the toast surfaces
 * counts and any per-row failure reasons.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Loader2, Pencil, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  patchParserPackage,
  patchParserPackageStatus,
  saveApprovedPackages,
  type ParseJobPackageRow,
  type SourceEntry,
} from "@/data-access/parser-api";
import GeoPickerModal, {
  type GeoSelection,
} from "@/components/shared/geo-picker-modal";
import MasterCatalogPicker from "@/components/rates/tours/tabs/sections/master-catalog-picker";
import { listTourCountries } from "@/data-access/tours-api";
import type { TourCountryOption, TourMasterCatalogItem } from "@/types/tours";

interface Props {
  jobId: string;
  sourceEntry: SourceEntry;
  /** ISO 2-char country_code from parse_jobs. Used to scope the geo / catalog
   *  pickers to the same country the parse was about. */
  countryCode: string;
  packages: ParseJobPackageRow[];
}

/** What's currently being edited in a picker — null when no picker is open. */
type PickerTarget =
  | { kind: "tour-geo"; pkg: ParseJobPackageRow }
  | { kind: "tour-catalog"; pkg: ParseJobPackageRow }
  | { kind: "transfer-stop"; pkg: ParseJobPackageRow; stopOrder: number };

interface TourGeoMatch {
  primary_geo_id: string | null;
  primary_geo_name: string | null;
  primary_geo_score: number | null;
  _has_match?: boolean;
}

interface TransferStopMatch {
  stop_order: number;
  stop_type: string;
  raw_location?: string;
  geo_id: string | null;
  geo_name: string | null;
  score: number | null;
}

interface TransferGeoMatch {
  stops: TransferStopMatch[];
  _has_match?: boolean;
}

const LOW_CONF_THRESHOLD = 0.6;

function isTerminalStatus(s: ParseJobPackageRow["review_status"]): boolean {
  return s === "saved" || s === "rejected";
}

export function ReviewDashboard({ jobId, sourceEntry, countryCode, packages }: Props) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState<null | "approve" | "reject">(null);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  // Resolve country_code → uuid for the picker. Same /api/geo/countries the
  // upload modal uses; query is cached so this is free if the list page
  // already fetched it.
  const { data: countries = [] } = useQuery({
    queryKey: ["geo", "countries"],
    queryFn: async () => {
      const r = await listTourCountries();
      if (r.error || !r.data) return [];
      return r.data;
    },
  });
  const countryId = useMemo(() => {
    if (!countryCode) return null;
    const match = countries.find(
      (c: TourCountryOption) => c.country_code === countryCode,
    );
    return match?.id ?? null;
  }, [countries, countryCode]);

  async function patchPackageGeo(
    packageId: string,
    geoMatch: TourGeoMatch | TransferGeoMatch,
  ) {
    const r = await patchParserPackage(jobId, packageId, {
      geo_match: geoMatch as unknown as Record<string, unknown>,
    });
    if (r.error) {
      toast.error(`Update failed: ${r.error}`);
      return false;
    }
    toast.success("Location updated");
    await qc.invalidateQueries({ queryKey: ["parser", "job", jobId] });
    return true;
  }

  async function patchPackageCatalog(
    packageId: string,
    catalogId: string | null,
  ) {
    const r = await patchParserPackage(jobId, packageId, {
      catalog_match_id: catalogId,
    });
    if (r.error) {
      toast.error(`Update failed: ${r.error}`);
      return false;
    }
    toast.success("Catalog match updated");
    await qc.invalidateQueries({ queryKey: ["parser", "job", jobId] });
    return true;
  }

  async function applyTourGeoSelection(
    pkg: ParseJobPackageRow,
    selections: GeoSelection[],
  ) {
    if (selections.length === 0) {
      // Clear
      const next: TourGeoMatch = {
        primary_geo_id: null,
        primary_geo_name: null,
        primary_geo_score: null,
        _has_match: false,
      };
      await patchPackageGeo(pkg.id, next);
      return;
    }
    const sel = selections[0];
    let geoId: string | null = null;
    let label: string | null = sel.label ?? null;
    if (sel.kind === "geo") {
      geoId = sel.id;
    } else if (sel.kind === "attraction" || sel.kind === "activity") {
      if (!sel.geo_id) {
        toast.error(
          `${sel.label ?? "Selected item"} has no parent location yet — pick a city instead.`,
        );
        return;
      }
      geoId = sel.geo_id;
    } else if (sel.kind === "dmc_custom") {
      toast.info("Custom locations aren't supported yet — pick a city.");
      return;
    }
    if (!geoId) return;
    const next: TourGeoMatch = {
      primary_geo_id: geoId,
      primary_geo_name: label,
      primary_geo_score: null,
      _has_match: true,
    };
    await patchPackageGeo(pkg.id, next);
  }

  async function applyTransferStopGeo(
    pkg: ParseJobPackageRow,
    stopOrder: number,
    selections: GeoSelection[],
  ) {
    const prev = (pkg.geo_match ?? {}) as unknown as TransferGeoMatch;
    const stops = Array.isArray(prev.stops) ? prev.stops : [];

    let geoId: string | null = null;
    let label: string | null = null;
    if (selections.length > 0) {
      const sel = selections[0];
      if (sel.kind === "geo") {
        geoId = sel.id;
        label = sel.label ?? null;
      } else if (sel.kind === "attraction" || sel.kind === "activity") {
        if (!sel.geo_id) {
          toast.error(
            `${sel.label ?? "Selected item"} has no parent location — pick a city instead.`,
          );
          return;
        }
        geoId = sel.geo_id;
        label = sel.label ?? null;
      } else {
        toast.info("Custom locations aren't supported for stops yet.");
        return;
      }
    }

    const updated = stops.map((s) =>
      s.stop_order === stopOrder
        ? { ...s, geo_id: geoId, geo_name: label, score: null }
        : s,
    );
    // Recompute _has_match: same rule as heuristic — origin (and destination
    // if present) must resolve.
    const requiredTypes: string[] = updated.some((s) => s.stop_type === "destination")
      ? ["origin", "destination"]
      : ["origin"];
    const hasMatch = requiredTypes.every((t) =>
      updated.some((m) => m.stop_type === t && m.geo_id !== null),
    );

    const next: TransferGeoMatch = {
      ...prev,
      stops: updated,
      _has_match: hasMatch,
    };
    await patchPackageGeo(pkg.id, next);
  }

  async function applyCatalogSelection(
    pkg: ParseJobPackageRow,
    items: TourMasterCatalogItem[],
  ) {
    const id = items[0]?.id ?? null;
    await patchPackageCatalog(pkg.id, id);
  }

  const stats = useMemo(() => {
    const total = packages.length;
    let high = 0, medium = 0, low = 0;
    let approved = 0, rejected = 0, savedCount = 0, pending = 0;
    let rateTotal = 0;
    for (const p of packages) {
      if (p.confidence_score >= 0.85) high++;
      else if (p.confidence_score >= 0.6) medium++;
      else low++;
      if (p.review_status === "approved") approved++;
      else if (p.review_status === "rejected") rejected++;
      else if (p.review_status === "saved") savedCount++;
      else pending++;
      rateTotal += p.parse_job_rates?.length ?? 0;
    }
    return { total, high, medium, low, approved, rejected, savedCount, pending, rateTotal };
  }, [packages]);

  // Sort: low confidence + non-terminal first; saved rows sink to bottom.
  const ordered = useMemo(() => {
    const arr = [...packages];
    arr.sort((a, b) => {
      const aTerm = isTerminalStatus(a.review_status) ? 1 : 0;
      const bTerm = isTerminalStatus(b.review_status) ? 1 : 0;
      if (aTerm !== bTerm) return aTerm - bTerm;
      return a.confidence_score - b.confidence_score;
    });
    return arr;
  }, [packages]);

  // Any non-terminal row is selectable for bulk actions.
  const selectableIds = useMemo(
    () => ordered.filter((p) => !isTerminalStatus(p.review_status)).map((p) => p.id),
    [ordered],
  );

  // Selection bucketed by status — drives which bulk actions enable.
  const selection = useMemo(() => {
    const pending: ParseJobPackageRow[] = [];
    const approved: ParseJobPackageRow[] = [];
    const lowConfPending: ParseJobPackageRow[] = [];
    for (const p of packages) {
      if (!selectedIds.has(p.id)) continue;
      if (p.review_status === "pending") {
        pending.push(p);
        if (p.confidence_score < LOW_CONF_THRESHOLD) lowConfPending.push(p);
      } else if (p.review_status === "approved") {
        approved.push(p);
      }
    }
    return { pending, approved, lowConfPending };
  }, [packages, selectedIds]);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function selectAllSelectable() {
    setSelectedIds(new Set(selectableIds));
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusyIds((prev) => new Set(prev).add(id));
    const r = await patchParserPackageStatus(jobId, id, status);
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success(status === "approved" ? "Approved" : "Rejected");
    await qc.invalidateQueries({ queryKey: ["parser", "job", jobId] });
  }

  async function onBulkApprove() {
    if (selection.lowConfPending.length > 0) {
      // Brief §3.3: bulk-approve blocked when any selected row has confidence < 0.6.
      // Belt-and-braces: the button is also disabled in this case.
      toast.error(
        `${selection.lowConfPending.length} selected row${selection.lowConfPending.length === 1 ? "" : "s"} below ${LOW_CONF_THRESHOLD * 100}% confidence — approve those individually after editing.`,
      );
      return;
    }
    if (selection.pending.length === 0) return;
    setBulkBusy("approve");
    const results = await Promise.all(
      selection.pending.map((p) => patchParserPackageStatus(jobId, p.id, "approved")),
    );
    setBulkBusy(null);
    const errs = results.filter((r) => r.error);
    if (errs.length === 0) {
      toast.success(`Approved ${results.length} package${results.length === 1 ? "" : "s"}.`);
    } else {
      toast.error(`Approved ${results.length - errs.length}/${results.length}; ${errs.length} failed.`);
    }
    await qc.invalidateQueries({ queryKey: ["parser", "job", jobId] });
  }

  async function onBulkReject() {
    const targets = [...selection.pending, ...selection.approved];
    if (targets.length === 0) return;
    setBulkBusy("reject");
    const results = await Promise.all(
      targets.map((p) => patchParserPackageStatus(jobId, p.id, "rejected")),
    );
    setBulkBusy(null);
    const errs = results.filter((r) => r.error);
    if (errs.length === 0) {
      toast.success(`Rejected ${results.length} package${results.length === 1 ? "" : "s"}.`);
    } else {
      toast.error(`Rejected ${results.length - errs.length}/${results.length}; ${errs.length} failed.`);
    }
    setSelectedIds(new Set());
    await qc.invalidateQueries({ queryKey: ["parser", "job", jobId] });
  }

  async function onBulkSave() {
    const ids = selection.approved.map((p) => p.id);
    if (ids.length === 0) {
      toast.error("Pick at least one approved package to save.");
      return;
    }
    setSaving(true);
    const r = await saveApprovedPackages(jobId, ids);
    setSaving(false);
    if (r.error || !r.data) {
      toast.error(r.error ?? "Save failed");
      return;
    }
    const okCount = r.data.results.filter((x) => x.saved).length;
    const failCount = r.data.results.length - okCount;
    if (okCount > 0 && failCount === 0) {
      toast.success(`Saved ${okCount} package${okCount === 1 ? "" : "s"}.`);
    } else if (okCount > 0 && failCount > 0) {
      toast.success(`Saved ${okCount}; ${failCount} failed (see save_error on those rows).`);
    } else {
      toast.error(`No packages saved. ${r.data.results[0]?.error ?? ""}`);
    }
    setSelectedIds(new Set());
    await qc.invalidateQueries({ queryKey: ["parser", "job", jobId] });
  }

  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const anySelectableSelected = selectableIds.some((id) => selectedIds.has(id));
  const selectedCount = selection.pending.length + selection.approved.length;
  const canBulkApprove =
    bulkBusy === null && selection.pending.length > 0 && selection.lowConfPending.length === 0;
  const canBulkReject = bulkBusy === null && selectedCount > 0;
  const canBulkSave = !saving && selection.approved.length > 0;

  return (
    <div className="mt-4">
      <StatsStrip stats={stats} sourceEntry={sourceEntry} />

      <div className="mt-4 overflow-x-auto rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    allSelectableSelected
                      ? true
                      : anySelectableSelected
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={(v) => {
                    if (v === true) selectAllSelectable();
                    else setSelectedIds(new Set());
                  }}
                  disabled={selectableIds.length === 0}
                  aria-label="Select all reviewable"
                />
              </TableHead>
              <TableHead className="w-[28%]">Name</TableHead>
              <TableHead>{sourceEntry === "tours" ? "Tour" : "Service"}</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No packages extracted from this file.
                </TableCell>
              </TableRow>
            ) : (
              ordered.map((p) => (
                <PackageRow
                  key={p.id}
                  pkg={p}
                  selected={selectedIds.has(p.id)}
                  busy={busyIds.has(p.id)}
                  sourceEntry={sourceEntry}
                  pickerEnabled={Boolean(countryId)}
                  onToggleSelect={() => toggleSelect(p.id)}
                  onSetStatus={(s) => setStatus(p.id, s)}
                  onOpenPicker={(target) => setPicker(target)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-4 py-3 shadow">
        <div className="text-sm text-muted-foreground">
          {selectedCount === 0 ? (
            "No packages selected"
          ) : (
            <>
              {selectedCount} selected
              {selection.lowConfPending.length > 0 ? (
                <span className="ml-2 text-amber-700">
                  ({selection.lowConfPending.length} below {LOW_CONF_THRESHOLD * 100}%)
                </span>
              ) : null}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkReject}
            disabled={!canBulkReject}
          >
            {bulkBusy === "reject" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>Reject {selectedCount > 0 ? selectedCount : ""}</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkApprove}
            disabled={!canBulkApprove}
            title={
              selection.lowConfPending.length > 0
                ? `${selection.lowConfPending.length} selected row${selection.lowConfPending.length === 1 ? "" : "s"} below ${LOW_CONF_THRESHOLD * 100}% confidence — approve individually after editing`
                : undefined
            }
          >
            {bulkBusy === "approve" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>Approve {selection.pending.length > 0 ? selection.pending.length : ""}</>
            )}
          </Button>
          <Button
            onClick={onBulkSave}
            disabled={!canBulkSave}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save {selection.approved.length} to{" "}
                {sourceEntry === "tours" ? "Tours" : "Transfers"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Geo picker — mounted once, opens for any tour-geo or
       *  transfer-stop edit. Picker is a Dialog internally. */}
      <GeoPickerModal
        open={picker?.kind === "tour-geo" || picker?.kind === "transfer-stop"}
        onOpenChange={(o) => {
          if (!o) setPicker(null);
        }}
        countryId={countryId}
        fieldLabel={
          picker?.kind === "transfer-stop"
            ? `Stop ${picker.stopOrder}`
            : "Primary location"
        }
        initialSelections={[]}
        enabledKinds={
          picker?.kind === "transfer-stop"
            ? ["city"]
            : ["city", "custom_point", "tours"]
        }
        singleSelect
        onApply={async (next) => {
          const target = picker;
          setPicker(null);
          if (!target) return;
          if (target.kind === "tour-geo") {
            await applyTourGeoSelection(target.pkg, next);
          } else if (target.kind === "transfer-stop") {
            await applyTransferStopGeo(target.pkg, target.stopOrder, next);
          }
        }}
      />

      {/* Catalog picker — wrapped in Dialog because the inline picker
       *  expects to live in a form. */}
      <Dialog
        open={picker?.kind === "tour-catalog"}
        onOpenChange={(o) => {
          if (!o) setPicker(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pick master catalog entry</DialogTitle>
          </DialogHeader>
          {picker?.kind === "tour-catalog" ? (
            <CatalogPickerBody
              pkg={picker.pkg}
              countryId={countryId}
              onPick={async (items) => {
                const target = picker;
                setPicker(null);
                if (target?.kind === "tour-catalog") {
                  await applyCatalogSelection(target.pkg, items);
                }
              }}
              onClear={async () => {
                const target = picker;
                setPicker(null);
                if (target?.kind === "tour-catalog") {
                  await applyCatalogSelection(target.pkg, []);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatsStrip({
  stats,
  sourceEntry,
}: {
  stats: {
    total: number;
    high: number;
    medium: number;
    low: number;
    approved: number;
    rejected: number;
    savedCount: number;
    pending: number;
    rateTotal: number;
  };
  sourceEntry: SourceEntry;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard label={sourceEntry === "tours" ? "Packages" : "Transfers"} value={stats.total} />
      <StatCard label="Rates" value={stats.rateTotal} />
      <StatCard label="High confidence" value={stats.high} className="text-emerald-700" />
      <StatCard label="Flagged" value={stats.medium + stats.low} className="text-amber-700" />
      <StatCard label="Pending review" value={stats.pending} muted />
      <StatCard label="Approved" value={stats.approved} muted />
      <StatCard label="Saved" value={stats.savedCount} className="text-emerald-700" />
      <StatCard label="Rejected" value={stats.rejected} muted />
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
  muted,
}: {
  label: string;
  value: number;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className={["text-xs", muted ? "text-muted-foreground" : ""].join(" ")}>{label}</div>
      <div className={["text-xl font-semibold", className ?? ""].join(" ")}>{value}</div>
    </div>
  );
}

function PackageRow({
  pkg,
  selected,
  busy,
  sourceEntry,
  pickerEnabled,
  onToggleSelect,
  onSetStatus,
  onOpenPicker,
}: {
  pkg: ParseJobPackageRow;
  selected: boolean;
  busy: boolean;
  sourceEntry: SourceEntry;
  pickerEnabled: boolean;
  onToggleSelect: () => void;
  onSetStatus: (s: "approved" | "rejected") => void;
  onOpenPicker: (target: PickerTarget) => void;
}) {
  const parsed = (pkg.parsed_data ?? {}) as Record<string, unknown>;
  const name = String(parsed.name ?? "(unnamed)");
  const tourName = String(parsed.tour_name ?? "");
  const subType = String(parsed.service_type ?? parsed.category ?? "");
  const isTerminal = pkg.review_status === "saved" || pkg.review_status === "rejected";
  const isApproved = pkg.review_status === "approved";

  return (
    <TableRow className={isTerminal ? "opacity-60" : ""}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          disabled={isTerminal}
          aria-label={`Select ${name}`}
        />
      </TableCell>
      <TableCell className="max-w-[28%] truncate" title={name}>
        <div className="font-medium">{name}</div>
        {pkg.save_error ? <SaveErrorBlock raw={pkg.save_error} /> : null}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {sourceEntry === "tours" ? tourName : subType}
      </TableCell>
      <TableCell>
        <ConfidenceBadge score={pkg.confidence_score} flags={pkg.heuristic_flags} reasons={pkg.confidence_reasons} />
      </TableCell>
      <TableCell className="text-xs">
        <MatchSummary
          pkg={pkg}
          sourceEntry={sourceEntry}
          pickerEnabled={pickerEnabled && !isTerminal}
          onOpenPicker={onOpenPicker}
        />
      </TableCell>
      <TableCell>
        <ReviewStatusBadge status={pkg.review_status} />
      </TableCell>
      <TableCell className="text-right">
        {pkg.review_status === "saved" && pkg.saved_entity_id ? (
          <Link
            href={
              sourceEntry === "tours"
                ? `/rates/tours?package=${pkg.saved_entity_id}`
                : `/rates/transfers?package=${pkg.saved_entity_id}`
            }
            className="text-xs text-blue-600 underline"
            target="_blank"
            rel="noreferrer"
          >
            View
          </Link>
        ) : busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant={isApproved ? "default" : "outline"}
              onClick={() => onSetStatus("approved")}
              disabled={isTerminal}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetStatus("rejected")}
              disabled={isTerminal}
            >
              Reject
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function ConfidenceBadge({
  score,
  flags,
  reasons,
}: {
  score: number;
  flags: string[];
  reasons: string[];
}) {
  const pct = (score * 100).toFixed(0);
  const tipParts: string[] = [];
  if (reasons.length > 0) tipParts.push(`LLM: ${reasons.join(", ")}`);
  if (flags.length > 0) tipParts.push(`Heuristic: ${flags.join(", ")}`);
  const title = tipParts.join(" | ");

  if (score >= 0.85) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700" title={title}>
        <ShieldCheck className="h-3 w-3" />
        {pct}%
      </span>
    );
  }
  if (score >= 0.6) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700" title={title}>
        <ShieldQuestion className="h-3 w-3" />
        {pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-700" title={title}>
      <ShieldAlert className="h-3 w-3" />
      {pct}%
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: ParseJobPackageRow["review_status"] }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "approved":
      return <Badge variant="default">Approved</Badge>;
    case "rejected":
      return <Badge variant="secondary">Rejected</Badge>;
    case "saved":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Saved</Badge>;
  }
}

function MatchSummary({
  pkg,
  sourceEntry,
  pickerEnabled,
  onOpenPicker,
}: {
  pkg: ParseJobPackageRow;
  sourceEntry: SourceEntry;
  pickerEnabled: boolean;
  onOpenPicker: (target: PickerTarget) => void;
}) {
  if (sourceEntry === "tours") {
    const geo = (pkg.geo_match ?? {}) as unknown as TourGeoMatch;
    const geoLabel = geo.primary_geo_name ?? null;
    const catLabel = pkg.catalog_match_id
      ? `Linked${(pkg.catalog_match_score ?? 0) >= 0.5 ? " ✓" : " ?"}`
      : "—";
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Catalog:</span>
          <span>{catLabel}</span>
          {pickerEnabled ? (
            <ChangeButton onClick={() => onOpenPicker({ kind: "tour-catalog", pkg })} />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Geo:</span>
          <span className="truncate" title={geoLabel ?? undefined}>
            {geoLabel ?? "—"}
          </span>
          {pickerEnabled ? (
            <ChangeButton onClick={() => onOpenPicker({ kind: "tour-geo", pkg })} />
          ) : null}
        </div>
      </div>
    );
  }
  const geo = (pkg.geo_match ?? {}) as unknown as TransferGeoMatch;
  const stops = Array.isArray(geo.stops) ? geo.stops : [];
  return (
    <div className="space-y-0.5">
      {stops.length === 0 ? (
        <div className="text-muted-foreground">No stops parsed</div>
      ) : (
        stops.map((s) => (
          <div
            key={s.stop_order}
            className="flex items-center gap-2"
            title={s.raw_location ?? undefined}
          >
            <span className="text-muted-foreground">
              Stop {s.stop_order} ({s.stop_type}):
            </span>
            <span className={s.geo_id ? "" : "text-amber-700"}>
              {s.geo_name ?? "unmatched"}
            </span>
            {pickerEnabled ? (
              <ChangeButton
                onClick={() =>
                  onOpenPicker({
                    kind: "transfer-stop",
                    pkg,
                    stopOrder: s.stop_order,
                  })
                }
              />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function ChangeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-blue-600 hover:bg-blue-50"
      aria-label="Change"
    >
      <Pencil className="h-3 w-3" />
      <span className="text-[11px]">Change</span>
    </button>
  );
}

function CatalogPickerBody({
  pkg,
  countryId,
  onPick,
  onClear,
}: {
  pkg: ParseJobPackageRow;
  countryId: string | null;
  onPick: (items: TourMasterCatalogItem[]) => void | Promise<void>;
  onClear: () => void | Promise<void>;
}) {
  const parsed = (pkg.parsed_data ?? {}) as { category?: string };
  // Master catalog stores 'attraction' | 'activity'. Map the parsed
  // tour-package category to the picker's `kind` arg, falling back to
  // unfiltered ("any kind") for combo / day_trip / multi_day where it's
  // unclear what to surface — the picker's search still works.
  const kind =
    parsed.category === "attraction"
      ? "attraction"
      : parsed.category === "activity"
        ? "activity"
        : undefined;
  const [selected, setSelected] = useState<TourMasterCatalogItem[]>([]);
  return (
    <div className="space-y-3">
      <MasterCatalogPicker
        kind={kind}
        countryId={countryId}
        selected={selected}
        maxSelections={1}
        onChange={(next) => setSelected(next)}
      />
      <div className="flex items-center justify-end gap-2">
        {pkg.catalog_match_id ? (
          <Button variant="ghost" size="sm" onClick={() => onClear()}>
            Clear link
          </Button>
        ) : null}
        <Button
          size="sm"
          disabled={selected.length === 0}
          onClick={() => onPick(selected)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

interface InterpretedSaveError {
  headline: string;
  remediation: string | null;
}

/**
 * Map raw save_error strings (from save.service.ts) to a short headline +
 * actionable remediation. Unknown patterns fall through with the original
 * message as headline. Patterns intentionally match the *current* messages
 * those error sites emit — if those strings change, this falls back to
 * raw display, no functional regression.
 */
function interpretSaveError(raw: string): InterpretedSaveError {
  const m = raw.match(/vehicle_type_text\s+"([^"]+)"\s+does not match/i);
  if (m) {
    return {
      headline: `Missing vehicle type: "${m[1]}"`,
      remediation:
        "Add this vehicle type to your fleet, then re-tick this row and click Save again. " +
        "Vehicle types are managed from any transfer's Tab 3 → Edit Vehicles.",
    };
  }
  if (/vehicle_type_text is required for vehicle_rates/i.test(raw)) {
    return {
      headline: "A rate row has no vehicle type",
      remediation:
        "Edit this package's seasons and pick a vehicle type for every rate row, then save again.",
    };
  }
  if (/empty tour_name/i.test(raw)) {
    return {
      headline: "Tour name is empty",
      remediation:
        "This package needs a tour name to be grouped under a tour. Edit the package's tour_name field before saving.",
    };
  }
  if (/RPC (returned no|missed)/i.test(raw)) {
    return {
      headline: "Save backend missed this row",
      remediation:
        "Re-run save. If the error persists, the package's raw_index drifted from the RPC's expectations — contact support.",
    };
  }
  return { headline: raw, remediation: null };
}

function SaveErrorBlock({ raw }: { raw: string }) {
  const { headline, remediation } = interpretSaveError(raw);
  return (
    <div className="mt-1 flex items-start gap-1 text-xs text-red-700">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 hover:bg-red-100"
            aria-label="Show full save error"
          >
            <Info className="h-3 w-3 shrink-0" />
            <span className="truncate" title={headline}>
              save error: {truncate(headline, 80)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96 text-sm">
          <div className="font-medium text-red-700">{headline}</div>
          {remediation ? (
            <div className="mt-2 text-foreground">{remediation}</div>
          ) : null}
          <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
            Raw error
          </div>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-xs">
            {raw}
          </pre>
        </PopoverContent>
      </Popover>
    </div>
  );
}

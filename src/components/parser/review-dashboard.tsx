"use client";

/**
 * Phase 3 — review dashboard (v1).
 *
 * Mounted by parse-session-view.tsx once parse_jobs.status reaches a
 * terminal state (completed | fully_resolved). Lets the user approve or
 * reject parsed packages individually and save the approved ones to real
 * tours/transfers tables atomically via /api/parser/jobs/:id/save.
 *
 * v1 scope (per parser-followups.md):
 * - Stats strip (counts by review_status + confidence bucket)
 * - Single sortable table of all packages, with checkbox + row-level
 *   approve/reject + edit-status display
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  patchParserPackageStatus,
  saveApprovedPackages,
  type ParseJobPackageRow,
  type SourceEntry,
} from "@/data-access/parser-api";

interface Props {
  jobId: string;
  sourceEntry: SourceEntry;
  packages: ParseJobPackageRow[];
}

export function ReviewDashboard({ jobId, sourceEntry, packages }: Props) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

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
      const aTerm = a.review_status === "saved" || a.review_status === "rejected" ? 1 : 0;
      const bTerm = b.review_status === "saved" || b.review_status === "rejected" ? 1 : 0;
      if (aTerm !== bTerm) return aTerm - bTerm;
      return a.confidence_score - b.confidence_score;
    });
    return arr;
  }, [packages]);

  const eligibleForSave = useMemo(
    () => ordered.filter((p) => p.review_status === "approved").map((p) => p.id),
    [ordered],
  );

  const selectedApprovedCount = useMemo(() => {
    let n = 0;
    for (const id of eligibleForSave) {
      if (selectedIds.has(id)) n++;
    }
    return n;
  }, [eligibleForSave, selectedIds]);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function selectAllApproved() {
    setSelectedIds(new Set(eligibleForSave));
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

  async function onBulkSave() {
    const ids = eligibleForSave.filter((id) => selectedIds.has(id));
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

  const allApprovedSelected =
    eligibleForSave.length > 0 &&
    eligibleForSave.every((id) => selectedIds.has(id));

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
                    allApprovedSelected
                      ? true
                      : selectedApprovedCount > 0
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={(v) => {
                    if (v === true) selectAllApproved();
                    else setSelectedIds(new Set());
                  }}
                  disabled={eligibleForSave.length === 0}
                  aria-label="Select all approved"
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
                  onToggleSelect={() => toggleSelect(p.id)}
                  onSetStatus={(s) => setStatus(p.id, s)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-md border bg-background px-4 py-3 shadow">
        <div className="text-sm text-muted-foreground">
          {selectedApprovedCount} of {eligibleForSave.length} approved package
          {eligibleForSave.length === 1 ? "" : "s"} selected
        </div>
        <Button
          onClick={onBulkSave}
          disabled={saving || selectedApprovedCount === 0}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>Save {selectedApprovedCount} to {sourceEntry === "tours" ? "Tours" : "Transfers"}</>
          )}
        </Button>
      </div>
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
  onToggleSelect,
  onSetStatus,
}: {
  pkg: ParseJobPackageRow;
  selected: boolean;
  busy: boolean;
  sourceEntry: SourceEntry;
  onToggleSelect: () => void;
  onSetStatus: (s: "approved" | "rejected") => void;
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
          disabled={!isApproved}
          aria-label={`Select ${name}`}
        />
      </TableCell>
      <TableCell className="max-w-[28%] truncate" title={name}>
        <div className="font-medium">{name}</div>
        {pkg.save_error ? (
          <div className="text-xs text-red-700" title={pkg.save_error}>
            save error: {truncate(pkg.save_error, 80)}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {sourceEntry === "tours" ? tourName : subType}
      </TableCell>
      <TableCell>
        <ConfidenceBadge score={pkg.confidence_score} flags={pkg.heuristic_flags} reasons={pkg.confidence_reasons} />
      </TableCell>
      <TableCell className="text-xs">
        <MatchSummary pkg={pkg} sourceEntry={sourceEntry} />
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
}: {
  pkg: ParseJobPackageRow;
  sourceEntry: SourceEntry;
}) {
  if (sourceEntry === "tours") {
    const geo = (pkg.geo_match ?? {}) as { primary_geo_name?: string | null; primary_geo_score?: number | null };
    const cat = pkg.catalog_match_id
      ? `cat: ${(pkg.catalog_match_score ?? 0) >= 0.5 ? "✓" : "?"}`
      : "no cat";
    const geoLabel = geo.primary_geo_name
      ? `geo: ${geo.primary_geo_name}`
      : "no geo";
    return (
      <div className="text-xs text-muted-foreground">
        {cat} · {geoLabel}
      </div>
    );
  }
  const geo = (pkg.geo_match ?? {}) as {
    stops?: Array<{ stop_type: string; geo_name: string | null }>;
  };
  const stops = geo.stops ?? [];
  const matched = stops.filter((s) => s.geo_name).length;
  return (
    <div className="text-xs text-muted-foreground">
      stops: {matched}/{stops.length} matched
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

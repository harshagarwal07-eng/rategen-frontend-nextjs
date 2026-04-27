"use client";

/**
 * "Add using AI" modal — Phase 2.1.
 *
 * Mounted from /rates/tours and /rates/transfers list pages. Top section is
 * the pre-parse form (country + file) that POSTs a multipart upload to the
 * new parser pipeline. Bottom section is the parse-history table for the
 * page's source_entry, filterable by job status and live-refreshing while
 * a parse is in flight.
 *
 * Country/state/cities form (per brief §2.1): country is required, state is
 * shown only when the country has registered states (Autocomplete hidden
 * otherwise), and cities are an optional multi-select used as parser hints
 * — the cities are scoped to the active country (and state, when set).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RotateCcw, Sparkles, UploadCloud, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  MultiSelectSearch,
  type MultiSelectOption,
} from "@/components/ui/multi-select-search";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createParserJob,
  listParserJobs,
  retryParserJob,
  type ParseJobRow,
  type SourceEntry,
} from "@/data-access/parser-api";
import { listTourCountries } from "@/data-access/tours-api";
import type { TourCountryOption } from "@/types/tours";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_LABEL = ".pdf, .xlsx, .docx · max 20 MB";

interface AddUsingAiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceEntry: SourceEntry;
}

interface SimpleOption {
  value: string;
  label: string;
}

export function AddUsingAiModal({
  open,
  onOpenChange,
  sourceEntry,
}: AddUsingAiModalProps) {
  const [countryId, setCountryId] = useState<string>("");
  const [stateId, setStateId] = useState<string>("");
  const [stateOptions, setStateOptions] = useState<SimpleOption[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [cityLabelMap, setCityLabelMap] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Country options (re-uses /api/geo/countries via tours API).
  const { data: countries = [] } = useQuery({
    queryKey: ["geo", "countries"],
    queryFn: async () => {
      const r = await listTourCountries();
      if (r.error || !r.data) return [];
      return r.data;
    },
  });
  const countryOptions = useMemo(
    () =>
      countries.map((c: TourCountryOption) => ({
        value: c.id,
        label: c.country_name,
      })),
    [countries],
  );
  const country = useMemo(
    () => countries.find((c: TourCountryOption) => c.id === countryId) ?? null,
    [countries, countryId],
  );

  // States are fetched lazily per-country. Most countries return zero;
  // hide the field unless we got at least one row back.
  useEffect(() => {
    if (!countryId) {
      setStateOptions([]);
      setStateId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { fetchStatesByCountryId } = await import("@/data-access/datastore");
      const rows = await fetchStatesByCountryId(countryId);
      if (cancelled) return;
      setStateOptions(rows.map((r) => ({ value: r.value, label: r.label })));
      setStateId("");
    })();
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  // Reset cities when country or state changes — labels are scoped to the
  // current geography so stale chips would mislead.
  useEffect(() => {
    setCityIds([]);
    setCityLabelMap({});
  }, [countryId, stateId]);

  const fetchCities = useCallback(
    async (search: string): Promise<MultiSelectOption[]> => {
      if (!countryId) return [];
      const { fetchCitiesByCountryId, fetchCitiesByStateId } = await import(
        "@/data-access/datastore"
      );
      const rows = stateId
        ? await fetchCitiesByStateId(stateId, search)
        : await fetchCitiesByCountryId(countryId, search);
      const opts: MultiSelectOption[] = rows.map((r) => ({ id: r.value, label: r.label }));
      setCityLabelMap((prev) => {
        const next = { ...prev };
        for (const o of opts) next[o.id] = o.label;
        return next;
      });
      return opts;
    },
    [countryId, stateId],
  );

  // Parse history (filtered by source page).
  const {
    data: history = [],
    refetch: refetchHistory,
    isFetching: historyFetching,
  } = useQuery({
    queryKey: ["parser", "jobs", sourceEntry],
    queryFn: async () => {
      const r = await listParserJobs(sourceEntry);
      if (r.error || !r.data) return [];
      return r.data;
    },
    refetchInterval: (q) => {
      const rows = (q.state.data ?? []) as ParseJobRow[];
      const hasInflight = rows.some(
        (j) => j.status === "pending" || j.status === "parsing",
      );
      return hasInflight ? 3000 : false;
    },
    enabled: open,
  });

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsDragging(false);
      setSubmitting(false);
      setCountryId("");
      setStateId("");
      setStateOptions([]);
      setCityIds([]);
      setCityLabelMap({});
    }
  }, [open]);

  function pickFile(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED.includes(f.type)) {
      toast.error(`Unsupported file type: ${f.type || "unknown"}. Upload PDF, XLSX, or DOCX.`);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`File exceeds 20 MB limit.`);
      return;
    }
    setFile(f);
  }

  async function onSubmit() {
    if (!country) {
      toast.error("Pick a country.");
      return;
    }
    if (!file) {
      toast.error("Pick a file.");
      return;
    }
    setSubmitting(true);
    const result = await createParserJob(
      file,
      {
        country: country.country_name,
        state: stateId || null,
        cities: cityIds,
      },
      sourceEntry,
    );
    setSubmitting(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Upload failed");
      return;
    }
    toast.success("Parsing started");
    setFile(null);
    refetchHistory();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Add using AI
          </DialogTitle>
          <DialogDescription>
            Upload a supplier rate sheet ({sourceEntry === "tours" ? "tours" : "transfers"} list).
            The parser extracts packages, rates, and inclusions; you review and save the ones you want.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-4 border-b pb-4">
          <div className="text-sm font-medium">Upload rate sheet</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Country
              </label>
              <Autocomplete
                options={countryOptions}
                value={countryId}
                onChange={(v) => setCountryId(v ?? "")}
                placeholder="Pick country..."
              />
            </div>
            {stateOptions.length > 0 ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  State <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Autocomplete
                  options={stateOptions}
                  value={stateId}
                  onChange={(v) => setStateId(v ?? "")}
                  placeholder="Any state"
                />
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Cities <span className="text-muted-foreground/60">(parser hints)</span>
              </label>
              <MultiSelectSearch
                fetchFn={fetchCities}
                value={cityIds}
                onChange={setCityIds}
                placeholder={countryId ? "Pick cities..." : "Pick country first"}
                disabled={!countryId}
                initialLabelMap={cityLabelMap}
              />
            </div>
          </div>

          <FileDropArea
            file={file}
            onChange={pickFile}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            inputRef={fileInputRef}
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={submitting || !file || !country}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload &amp; parse
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Parse history</div>
            {historyFetching ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[40%]">Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Counts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No jobs yet. Upload a file to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((j) => (
                    <HistoryRow
                      key={j.id}
                      job={j}
                      sourceEntry={sourceEntry}
                      onRetried={() => refetchHistory()}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function FileDropArea({
  file,
  onChange,
  isDragging,
  setIsDragging,
  inputRef,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        File
      </label>
      <div
        className={[
          "flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center transition-colors",
          isDragging ? "border-blue-500 bg-blue-50" : "border-input bg-muted/20",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0] ?? null;
          onChange(f);
        }}
      >
        {file ? (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="truncate text-sm">
              <span className="font-medium">{file.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
            <div className="text-sm">
              Drop a file here or{" "}
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => inputRef.current?.click()}
              >
                browse
              </button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{ACCEPTED_LABEL}</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.xlsx,.docx"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function HistoryRow({
  job,
  sourceEntry,
  onRetried,
}: {
  job: ParseJobRow;
  sourceEntry: SourceEntry;
  onRetried: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  const reviewHref =
    sourceEntry === "tours"
      ? `/rates/tours/parser/jobs/${job.id}`
      : `/rates/transfers/parser/jobs/${job.id}`;

  async function onRetry() {
    setRetrying(true);
    const r = await retryParserJob(job.id);
    setRetrying(false);
    if (r.error || !r.data) {
      toast.error(r.error ?? "Retry failed");
      return;
    }
    toast.success("Re-parsing started");
    onRetried();
    const newHref =
      sourceEntry === "tours"
        ? `/rates/tours/parser/jobs/${r.data.job_id}`
        : `/rates/transfers/parser/jobs/${r.data.job_id}`;
    if (typeof window !== "undefined") {
      window.open(newHref, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <TableRow>
      <TableCell className="max-w-[280px] truncate" title={job.filename}>
        {job.filename}
      </TableCell>
      <TableCell>
        <StatusBadge status={job.status} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {/* Counts come from phase_progress.classify; keep tolerant of nulls. */}
        {countSummary(job)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(job.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {job.status === "failed" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={retrying}
              className="h-7 px-2"
            >
              {retrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Retry
                </>
              )}
            </Button>
          ) : null}
          <Link href={reviewHref} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
            Open
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: ParseJobRow["status"] }) {
  switch (status) {
    case "pending":
    case "parsing":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Parsing
        </Badge>
      );
    case "completed":
      return <Badge variant="default">Ready for review</Badge>;
    case "fully_resolved":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Saved</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function countSummary(job: ParseJobRow): string {
  const phase = (job.phase_progress as Record<string, unknown> | null) ?? {};
  const classify = (phase.classify as Record<string, unknown> | undefined) ?? {};
  const tourCount = Number(classify.tour_count ?? 0);
  const transferCount = Number(classify.transfer_count ?? 0);
  if (!classify || (tourCount === 0 && transferCount === 0)) return "—";
  if (job.job_type === "tour") return `${tourCount} tours`;
  return `${transferCount} transfers`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

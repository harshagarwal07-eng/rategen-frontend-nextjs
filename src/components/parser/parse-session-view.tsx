"use client";

/**
 * Parse session viewer — Phase 2.2 (live parse progress UI).
 *
 * Mounted at /rates/{tours,transfers}/parser/jobs/[jobId]. While the job is
 * pending or parsing, this renders the live SSE feed and phase progress.
 * When the job reaches a terminal state (completed | fully_resolved | failed),
 * the component swaps to a "review pending" placeholder — Phase 3 will
 * replace that body with the full review dashboard, mounted at the same
 * route with the same component shell.
 *
 * Ported from old_frontend/components/tt-parser/ParseSessionView.tsx with
 * the event shapes adjusted for the new tours[]/transfers[] classify split.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getParserJob,
  parserStreamUrl,
  type ParseJobRow,
  type ParseJobPackageRow,
  type SourceEntry,
} from "@/data-access/parser-api";
import { ReviewDashboard } from "./review-dashboard";

const PHASES = ["file", "destination", "classify", "rates", "inclusions"] as const;
type PhaseName = (typeof PHASES)[number];
type PhaseStatus = "idle" | "running" | "complete" | "skipped" | "error";

interface PhaseSlot {
  status: PhaseStatus;
  duration_ms?: number;
  error?: string | null;
  reason?: string | null;
}

interface ParseState {
  jobStatus: ParseJobRow["status"] | null;
  phases: Record<PhaseName, PhaseSlot>;
  rawStream: string;
  packageCount: number;
  rateCount: number;
  globalError: string | null;
  totalDurationMs: number | null;
  childJobId: string | null;
  packages: Map<string, ParseJobPackageRow>;
}

function emptyState(): ParseState {
  return {
    jobStatus: null,
    phases: PHASES.reduce(
      (acc, p) => ({ ...acc, [p]: { status: "idle" } }),
      {} as Record<PhaseName, PhaseSlot>,
    ),
    rawStream: "",
    packageCount: 0,
    rateCount: 0,
    globalError: null,
    totalDurationMs: null,
    childJobId: null,
    packages: new Map(),
  };
}

interface Props {
  jobId: string;
  sourceEntry: SourceEntry;
}

export function ParseSessionView({ jobId, sourceEntry }: Props) {
  const [state, setState] = useState<ParseState>(() => emptyState());
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number>(Date.now());

  // Initial fetch — gives us the job row so we can populate the header
  // immediately (filename, status) without waiting for SSE. Also catches
  // the "user opened a completed job from history" case where SSE will
  // have nothing live and just replays from DB.
  const { data: jobData } = useQuery({
    queryKey: ["parser", "job", jobId],
    queryFn: async () => {
      const r = await getParserJob(jobId);
      if (r.error || !r.data) return null;
      return r.data;
    },
  });

  // Live timer until a terminal state arrives.
  useEffect(() => {
    if (state.totalDurationMs !== null) return;
    if (state.jobStatus === "completed" || state.jobStatus === "fully_resolved" || state.jobStatus === "failed") return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 500);
    return () => clearInterval(id);
  }, [state.totalDurationMs, state.jobStatus]);

  // SSE subscription.
  useEffect(() => {
    let cancelled = false;
    const es = new EventSource(parserStreamUrl(jobId));

    const handle = (defaultPhase: PhaseName) => (e: MessageEvent) => {
      const data = safeParse(e.data);
      if (cancelled) return;
      const phase = (typeof data.phase === "string" ? (data.phase as PhaseName) : defaultPhase);
      setState((prev) => applyEvent(prev, e.type, { ...data, phase }));
    };

    es.addEventListener("phase_start", handle("file"));
    es.addEventListener("token", handle("file"));
    es.addEventListener("package_parsed", handle("classify"));
    es.addEventListener("rate_parsed", handle("rates"));
    es.addEventListener("inclusion_parsed", handle("inclusions"));
    es.addEventListener("phase_complete", handle("file"));
    es.addEventListener("phase_error", handle("file"));
    es.addEventListener("phase_failed", handle("file"));
    es.addEventListener("job_complete", (e) => {
      const data = safeParse((e as MessageEvent).data);
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        jobStatus: data.error ? "failed" : "completed",
        totalDurationMs: typeof data.total_duration_ms === "number" ? data.total_duration_ms : null,
        globalError: typeof data.error === "string" ? data.error : prev.globalError,
        childJobId: typeof data.child_job_id === "string" ? data.child_job_id : prev.childJobId,
      }));
      es.close();
    });
    es.addEventListener("done", () => { es.close(); });
    es.onerror = () => { /* EventSource auto-reconnects; nothing to do. */ };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [jobId]);

  // Bridge: the initial fetch may show terminal status before SSE settles.
  // If we already have the job data and it's terminal, skip the live timer.
  useEffect(() => {
    if (!jobData) return;
    setState((prev) => ({
      ...prev,
      jobStatus: prev.jobStatus ?? jobData.job.status,
      packageCount: prev.packageCount === 0 ? jobData.packages.length : prev.packageCount,
    }));
  }, [jobData]);

  const isTerminal =
    state.jobStatus === "completed" ||
    state.jobStatus === "fully_resolved" ||
    state.jobStatus === "failed";

  const filename = jobData?.job.filename ?? "loading...";
  const elapsed = state.totalDurationMs ?? elapsedMs;

  const backHref = sourceEntry === "tours" ? "/rates/tours" : "/rates/transfers";

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h1 className="truncate text-lg font-semibold" title={filename}>
          {filename}
        </h1>
        <StatusPill status={state.jobStatus} />
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span>⏱ {formatMs(elapsed)}</span>
          <span>
            ▷ {state.packageCount} package{state.packageCount === 1 ? "" : "s"}
          </span>
          {jobData?.job.total_tokens_used ? (
            <span>{jobData.job.total_tokens_used.toLocaleString()} tok</span>
          ) : null}
        </div>
      </div>

      <PhaseChips phases={state.phases} />

      {state.jobStatus === "failed" ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {state.globalError ?? "Parse failed. Check the backend logs for details."}
        </div>
      ) : null}
      <SiblingBanner
        thisJobId={jobId}
        sourceEntry={sourceEntry}
        childJobId={state.childJobId}
        parentJobId={jobData?.job.parent_parse_job_id ?? null}
      />


      {!isTerminal ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RawStreamPanel raw={state.rawStream} />
          <PhaseSummaryPanel phases={state.phases} />
        </div>
      ) : (
        <ReviewDashboard
          jobId={jobId}
          sourceEntry={sourceEntry}
          packages={jobData?.packages ?? []}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatusPill({ status }: { status: ParseJobRow["status"] | null }) {
  if (!status) return <Badge variant="outline">Starting…</Badge>;
  const map: Record<ParseJobRow["status"], { label: string; variant?: "secondary" | "default" | "destructive" | "outline"; className?: string }> = {
    pending: { label: "pending", variant: "outline" },
    parsing: { label: "parsing", variant: "secondary" },
    completed: { label: "ready for review", variant: "default" },
    fully_resolved: { label: "saved", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
    failed: { label: "failed", variant: "destructive" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

function PhaseChips({ phases }: { phases: Record<PhaseName, PhaseSlot> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PHASES.map((p) => {
        const slot = phases[p];
        return (
          <div
            key={p}
            className={[
              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
              slot.status === "running" && "border-blue-300 bg-blue-50 text-blue-700",
              slot.status === "complete" && "border-emerald-300 bg-emerald-50 text-emerald-700",
              slot.status === "skipped" && "border-muted bg-muted/40 text-muted-foreground",
              slot.status === "error" && "border-red-300 bg-red-50 text-red-700",
              slot.status === "idle" && "border-muted text-muted-foreground",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {slot.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span className="capitalize">{p}</span>
            {slot.status === "complete" && typeof slot.duration_ms === "number" ? (
              <span className="text-muted-foreground">{formatMs(slot.duration_ms)}</span>
            ) : null}
            {slot.status === "skipped" ? <span className="text-muted-foreground">skipped</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function RawStreamPanel({ raw }: { raw: string }) {
  return (
    <div className="h-[calc(100vh-220px)] overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs">
      {raw ? (
        <pre className="whitespace-pre-wrap">{raw}</pre>
      ) : (
        <div className="text-muted-foreground">Waiting for stream…</div>
      )}
    </div>
  );
}

function PhaseSummaryPanel({ phases }: { phases: Record<PhaseName, PhaseSlot> }) {
  return (
    <div className="h-[calc(100vh-220px)] space-y-2 overflow-y-auto rounded-md border bg-background p-3 text-sm">
      {PHASES.map((p) => {
        const slot = phases[p];
        return (
          <div key={p} className="flex items-start justify-between gap-2 border-b pb-2 last:border-b-0">
            <div>
              <div className="font-medium capitalize">{p}</div>
              {slot.error ? (
                <div className="text-xs text-red-700">{slot.error}</div>
              ) : slot.reason ? (
                <div className="text-xs text-muted-foreground">{slot.reason}</div>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {slot.status === "complete" && typeof slot.duration_ms === "number"
                ? formatMs(slot.duration_ms)
                : slot.status}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SiblingBanner({
  thisJobId,
  sourceEntry,
  childJobId,
  parentJobId,
}: {
  thisJobId: string;
  sourceEntry: SourceEntry;
  childJobId: string | null;
  parentJobId: string | null;
}) {
  // Pick whichever sibling exists. childJobId comes from the live job_complete
  // SSE event; parentJobId comes from the loaded parse_jobs row (set when the
  // current job is itself a cross-type child).
  const siblingId = childJobId ?? parentJobId;
  const dismissKey = useMemo(() => `parser:sibling-banner:${thisJobId}`, [thisJobId]);
  const [dismissed, setDismissed] = useState<boolean>(true); // start true — flip to false in effect once we read localStorage

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  // Fetch sibling job to read its job_type + package count.
  const { data: sibling } = useQuery({
    queryKey: ["parser", "job", siblingId],
    queryFn: async () => {
      if (!siblingId) return null;
      const r = await getParserJob(siblingId);
      if (r.error || !r.data) return null;
      return r.data;
    },
    enabled: Boolean(siblingId) && !dismissed,
  });

  if (!siblingId || dismissed) return null;
  const otherType = sibling?.job.job_type ?? (sourceEntry === "tours" ? "transfer" : "tour");
  const otherSource = otherType === "tour" ? "tours" : "transfers";
  const count = sibling?.packages.length ?? 0;
  const href = `/rates/${otherSource}/parser/jobs/${siblingId}`;
  const noun = otherType === "tour" ? "tour" : "transfer";

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
      <div>
        <span className="font-medium">This sheet also contains</span>{" "}
        {count > 0 ? `${count} ${noun}${count === 1 ? "" : "s"}` : `${noun}s`}.{" "}
        <Link href={href} target="_blank" rel="noreferrer" className="font-medium underline">
          Review them →
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="rounded-md p-1 hover:bg-blue-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Pure helpers ─────────────────────────────────────────

function applyEvent(prev: ParseState, eventType: string, data: Record<string, unknown>): ParseState {
  const phase = data.phase as PhaseName | undefined;
  switch (eventType) {
    case "phase_start": {
      if (!phase || !PHASES.includes(phase)) return prev;
      return {
        ...prev,
        jobStatus: "parsing",
        phases: { ...prev.phases, [phase]: { status: "running" } },
      };
    }
    case "token": {
      if (typeof data.text !== "string") return prev;
      return { ...prev, rawStream: prev.rawStream + data.text };
    }
    case "package_parsed": {
      const pkg = data.package as ParseJobPackageRow | undefined;
      if (!pkg?.id) return prev;
      const next = new Map(prev.packages);
      next.set(pkg.id, pkg);
      return { ...prev, packages: next, packageCount: next.size };
    }
    case "rate_parsed": {
      return { ...prev, rateCount: prev.rateCount + 1 };
    }
    case "inclusion_parsed": {
      return prev; // surfaces in the review dashboard, no header counter
    }
    case "phase_complete": {
      if (!phase || !PHASES.includes(phase)) return prev;
      const skipped = data.skipped === true;
      return {
        ...prev,
        phases: {
          ...prev.phases,
          [phase]: {
            status: skipped ? "skipped" : "complete",
            duration_ms: typeof data.duration_ms === "number" ? data.duration_ms : prev.phases[phase].duration_ms,
            reason: typeof data.reason === "string" ? data.reason : null,
          },
        },
      };
    }
    case "phase_error": {
      if (!phase || !PHASES.includes(phase)) return prev;
      return {
        ...prev,
        phases: {
          ...prev.phases,
          [phase]: { ...prev.phases[phase], status: "error", error: typeof data.error === "string" ? data.error : "error" },
        },
      };
    }
    case "phase_failed": {
      if (!phase || !PHASES.includes(phase)) return prev;
      return {
        ...prev,
        jobStatus: "failed",
        globalError: typeof data.error === "string" ? data.error : prev.globalError,
        phases: {
          ...prev.phases,
          [phase]: { ...prev.phases[phase], status: "error", error: typeof data.error === "string" ? data.error : "error" },
        },
      };
    }
    default:
      return prev;
  }
}

function safeParse(s: string): Record<string, unknown> {
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m${s}s`;
}

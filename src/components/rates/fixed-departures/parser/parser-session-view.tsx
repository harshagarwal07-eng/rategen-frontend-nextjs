"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fdParserGetSession,
  fdParserSaveSession,
  fdParserStreamUrl,
} from "@/data-access/fd-parser";
import {
  readSessionErrors,
  type GeoWarningRecord,
  type StageErrorRecord,
} from "@/lib/fd-parser-errors";
import {
  TERMINAL_STATUSES,
  type FDParserSession,
  type FDParserSessionStatus,
} from "@/types/fd-parser";
import { ParserStatusBadge } from "./parser-status-badge";
import {
  ParserStagePill,
  STAGE_META,
  stageLabel,
  type StagePillState,
} from "./parser-stage-pill";
import { ParserWarningsPanel } from "./parser-warnings-panel";
import { formatClock, formatDuration, formatTokens } from "./parser-format";
import { ItineraryRenderer } from "./renderers/ItineraryRenderer";
import { InclusionsExclusionsRenderer } from "./renderers/InclusionsExclusionsRenderer";
import { DeparturesPricingRenderer } from "./renderers/DeparturesPricingRenderer";
import { AddonsRenderer } from "./renderers/AddonsRenderer";
import { FlightsVisaTaxesRenderer } from "./renderers/FlightsVisaTaxesRenderer";
import { PoliciesRenderer } from "./renderers/PoliciesRenderer";
import { AutoImagesRenderer } from "./renderers/AutoImagesRenderer";
import { PdfMarkdownRenderer } from "./renderers/PdfMarkdownRenderer";
import type {
  AddonsOutput,
  AutoImagesOutput,
  DeparturesPricingOutput,
  FlightsVisaTaxesOutput,
  InclusionsExclusionsOutput,
  ItineraryOutput,
  PoliciesOutput,
} from "./renderers/types";

type Phase =
  | "loading"
  | "streaming"
  | "disconnected"
  | "done_live"
  | "hydrated"
  | "load_error";

type SaveState = "idle" | "saving" | "saved" | "failed";

interface StageState extends StagePillState {
  content?: string;
  parsedData?: unknown;
  replayed?: boolean;
}

const WARNINGS_TAB_KEY = "__warnings";

export function ParserSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  const [session, setSession] = useState<FDParserSession | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stageOrder, setStageOrder] = useState<string[]>([]);
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [liveBuffer, setLiveBuffer] = useState("");
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] =
    useState<string>("pdf_extract");

  const [, setTimerTick] = useState(0);
  const [globalStartedAt, setGlobalStartedAt] = useState<number | null>(null);
  const [globalEndedAt, setGlobalEndedAt] = useState<number | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarnings, setSaveWarnings] = useState<GeoWarningRecord[]>([]);
  const [saveGeoErrors, setSaveGeoErrors] = useState<StageErrorRecord[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const confettiFiredRef = useRef(false);
  const hydratedRef = useRef(false);
  const liveScrollRef = useRef<HTMLDivElement | null>(null);
  const liveBufferRef = useRef("");
  const userTouchedTabRef = useRef(false);

  const appendBuffer = (text: string) => {
    liveBufferRef.current += text;
    setLiveBuffer(liveBufferRef.current);
  };
  const resetBuffer = () => {
    liveBufferRef.current = "";
    setLiveBuffer("");
  };

  const hydrateFromSession = useCallback((row: FDParserSession) => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const order: string[] = [];
    const next: Record<string, StageState> = {};

    if (row.pdf_extraction?.markdown) {
      order.push("pdf_extract");
      next.pdf_extract = {
        status: "complete",
        content: row.pdf_extraction.markdown,
        replayed: true,
      };
    }
    const outputs = (row.stage_outputs ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(outputs)) {
      if (key === "pdf_extract") continue;
      order.push(key);
      next[key] = {
        status: "complete",
        parsedData: outputs[key],
        replayed: true,
      };
    }

    const parsedErrors = readSessionErrors(row.errors);
    const persistedErrors = parsedErrors.stageErrors;
    for (const err of persistedErrors) {
      if (next[err.stage]) {
        next[err.stage] = {
          ...next[err.stage],
          status: "error",
          error: err.message,
        };
      } else {
        order.push(err.stage);
        next[err.stage] = {
          status: "error",
          error: err.message,
          replayed: true,
        };
      }
    }
    setSaveWarnings(parsedErrors.warnings);

    if (row.status === "failed" && persistedErrors.length === 0) {
      if (!next.pdf_extract) {
        order.push("pdf_extract");
        next.pdf_extract = {
          status: "error",
          error: "Unknown error",
          replayed: true,
        };
      }
    }

    setStageOrder(order);
    setStages(next);
    setGlobalStartedAt(new Date(row.created_at).getTime());
    setGlobalEndedAt(new Date(row.updated_at).getTime());

    const lastPresent = [...STAGE_META]
      .reverse()
      .find((s) => order.includes(s.key));
    setActiveRightTab(lastPresent?.key ?? "pdf_extract");
    setPhase("hydrated");
  }, []);

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPollingForStatus = useCallback(() => {
    if (pollRef.current !== null) return;
    pollRef.current = window.setInterval(async () => {
      try {
        const row = await fdParserGetSession(sessionId);
        setSession(row);
        if (TERMINAL_STATUSES.has(row.status)) {
          stopPolling();
          hydrateFromSession(row);
        }
      } catch {
        // keep polling
      }
    }, 2000);
  }, [hydrateFromSession, sessionId, stopPolling]);

  const openStream = useCallback(
    (row: FDParserSession) => {
      closeStream();
      stopPolling();
      setPhase("streaming");
      setGlobalStartedAt((prev) => prev ?? Date.now());

      const es = new EventSource(fdParserStreamUrl(row.id));
      esRef.current = es;

      es.addEventListener("stage_start", (e: MessageEvent) => {
        const data = safeParse(e.data);
        const stage = stageName(data);
        if (!stage) return;
        const replayed = data.replayed === true;

        resetBuffer();
        setCurrentStage(stage);
        setStageOrder((prev) =>
          prev.includes(stage) ? prev : [...prev, stage],
        );
        setStages((prev) => {
          if (prev[stage]?.status === "complete") return prev;
          return {
            ...prev,
            [stage]: {
              status: "active",
              startedAt: Date.now(),
              replayed,
            },
          };
        });
      });

      es.addEventListener("stage_chunk", (e: MessageEvent) => {
        const data = safeParse(e.data);
        const text = typeof data.text === "string" ? data.text : "";
        if (text) appendBuffer(text);
      });

      es.addEventListener("stage_complete", (e: MessageEvent) => {
        const data = safeParse(e.data);
        const stage = stageName(data);
        if (!stage) return;
        const durationFromPayload =
          typeof data.duration_ms === "number" ? data.duration_ms : undefined;
        const inTok =
          typeof data.input_tokens === "number"
            ? data.input_tokens
            : undefined;
        const outTok =
          typeof data.output_tokens === "number"
            ? data.output_tokens
            : undefined;
        const endedAt = Date.now();
        const stageContent =
          stage === "pdf_extract" ? liveBufferRef.current : undefined;
        const parsedData = (data as { output?: unknown }).output;

        setStages((prev) => {
          const existing = prev[stage];
          const startedAt = existing?.startedAt ?? endedAt;
          const localDuration = endedAt - startedAt;
          const durationMs =
            durationFromPayload ??
            (existing?.replayed ? undefined : localDuration);
          return {
            ...prev,
            [stage]: {
              status: "complete",
              startedAt,
              durationMs,
              inputTokens: inTok,
              outputTokens: outTok,
              content: stageContent ?? existing?.content,
              parsedData: parsedData ?? existing?.parsedData,
              replayed: existing?.replayed,
            },
          };
        });
        setCurrentStage((curr) => (curr === stage ? null : curr));
        setActiveRightTab(stage);
      });

      es.addEventListener("stage_retry", (e: MessageEvent) => {
        const data = safeParse(e.data);
        const stage = stageName(data);
        if (!stage) return;
        const reason =
          typeof data.reason === "string" ? data.reason : undefined;
        setStages((prev) => ({
          ...prev,
          [stage]: {
            ...prev[stage],
            status: "retrying",
            startedAt: prev[stage]?.startedAt ?? Date.now(),
            error: reason,
          },
        }));
      });

      es.addEventListener("stage_error", (e: MessageEvent) => {
        const data = safeParse(e.data);
        const stage = stageName(data) ?? "pipeline";
        const error =
          typeof data.error === "string" ? data.error : "Stage errored";
        setStageOrder((prev) =>
          prev.includes(stage) ? prev : [...prev, stage],
        );
        setStages((prev) => ({
          ...prev,
          [stage]: {
            status: "error",
            startedAt: prev[stage]?.startedAt ?? Date.now(),
            error,
          },
        }));
        setCurrentStage((curr) => (curr === stage ? null : curr));
      });

      es.addEventListener("session_complete", async () => {
        setGlobalEndedAt(Date.now());
        setCurrentStage(null);
        closeStream();

        setStages((prev) => {
          if (!confettiFiredRef.current) {
            const hasErrors = Object.values(prev).some(
              (s) => s.status === "error",
            );
            confettiFiredRef.current = true;
            if (!hasErrors) {
              try {
                void confetti({
                  particleCount: 120,
                  spread: 80,
                  origin: { y: 0.6 },
                });
              } catch {
                // confetti is best-effort
              }
            }
          }
          return prev;
        });

        setPhase("done_live");

        try {
          const r = await fdParserGetSession(row.id);
          setSession(r);
        } catch {
          // non-fatal
        }
      });

      es.onerror = () => {
        if (esRef.current !== es) return;
        closeStream();
        setPhase("disconnected");
        startPollingForStatus();
      };
    },
    [closeStream, startPollingForStatus, stopPolling],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await fdParserGetSession(sessionId);
        if (cancelled) return;
        setSession(row);
        if (TERMINAL_STATUSES.has(row.status)) hydrateFromSession(row);
        else openStream(row);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load session",
        );
        setPhase("load_error");
      }
    })();
    return () => {
      cancelled = true;
      closeStream();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "streaming") return;
    const id = window.setInterval(() => setTimerTick((t) => t + 1), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const el = liveScrollRef.current;
    if (!el) return;
    // Auto-scroll only if the user is already near the bottom — preserves
    // their position when they've scrolled up to read earlier content.
    const nearBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight) < 80;
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [liveBuffer]);

  const handleSave = async () => {
    setSaveState("saving");
    setSaveError(null);
    setSaveGeoErrors([]);
    try {
      const body = await fdParserSaveSession(sessionId);
      if (Array.isArray(body.warnings) && body.warnings.length > 0) {
        setSaveWarnings(body.warnings);
        toast.warning(
          `Saved with ${body.warnings.length} geo warning${
            body.warnings.length === 1 ? "" : "s"
          }`,
        );
        // Stash warnings so the editor can surface them on open. Toast alone
        // disappears before the user can read it across the route push.
        try {
          sessionStorage.setItem(
            `parser-warnings-${body.package_id}`,
            JSON.stringify(body.warnings),
          );
        } catch {
          // sessionStorage unavailable (private mode, quota) — fall through;
          // toast is the only signal in that case.
        }
      } else {
        toast.success("Saved to package");
      }
      setSaveState("saved");
      router.push(`/rates/fixed-departures?edit=${body.package_id}`);
    } catch (err) {
      type AxiosLike = {
        response?: { data?: { message?: string; errors?: unknown[] } };
      };
      const axiosResp =
        err && typeof err === "object" && "response" in err
          ? (err as AxiosLike).response
          : undefined;
      const msg =
        axiosResp?.data?.message ??
        (err instanceof Error ? err.message : null);
      const rawErrors = axiosResp?.data?.errors;
      if (Array.isArray(rawErrors) && rawErrors.length > 0) {
        setSaveGeoErrors(
          rawErrors.flatMap((e) => {
            if (!e || typeof e !== "object") return [];
            const o = e as Record<string, unknown>;
            const stage = typeof o.stage === "string" ? o.stage : "save";
            const message =
              typeof o.message === "string"
                ? o.message
                : typeof o.error === "string"
                  ? o.error
                  : JSON.stringify(e);
            return [{ stage, message }];
          }),
        );
      }
      setSaveError(msg ?? "Save failed");
      setSaveState("failed");
      toast.error(msg ?? "Save failed");
    }
  };

  const elapsedMs =
    globalStartedAt === null
      ? null
      : Math.max(0, (globalEndedAt ?? Date.now()) - globalStartedAt);

  const tokensTotal = useMemo(() => {
    if (
      session?.total_input_tokens !== null &&
      session?.total_input_tokens !== undefined
    ) {
      return (
        (session.total_input_tokens ?? 0) +
        (session.total_output_tokens ?? 0)
      );
    }
    let sum = 0;
    for (const s of Object.values(stages)) {
      sum += (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
    }
    return sum;
  }, [session, stages]);

  const title = session?.pre_parse_input?.title ?? "—";
  const tourCode = session?.pre_parse_input?.tour_code ?? null;
  const status: FDParserSessionStatus = session?.status ?? "pending";
  const stageErrorCount = useMemo(
    () => Object.values(stages).filter((s) => s.status === "error").length,
    [stages],
  );
  const hasErrors = stageErrorCount > 0;
  const saveWarningCount = saveWarnings.length;

  const canSaveToPackage =
    session?.status === "ready_for_review" && session.package_id === null;
  const showOpenInEditor = !!session?.package_id;

  if (phase === "load_error") {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <AlertCircle className="mx-auto mb-3 h-6 w-6 text-destructive" />
        <h1 className="text-base font-semibold">
          Could not load this session
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError ?? "Unknown error."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/rates/fixed-departures/parser">
              <span className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to parser
              </span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <h1 className="truncate text-sm font-semibold">Parse Session</h1>
            <span className="truncate text-sm text-muted-foreground">
              · {title}
            </span>
            {tourCode && (
              <span className="rounded-full border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {tourCode}
              </span>
            )}
            <ParserStatusBadge status={status} className="text-[10px]" />
            {elapsedMs !== null && (
              <span
                className={cn(
                  "rounded-full border px-3 py-0.5 text-sm font-semibold tabular-nums",
                  phase === "streaming"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : hasErrors
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700",
                )}
              >
                {formatClock(elapsedMs)}
              </span>
            )}
            {tokensTotal > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatTokens(tokensTotal)} tokens
              </span>
            )}
            {saveWarningCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                {saveWarningCount}
              </span>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canSaveToPackage && (
              <Button
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => void handleSave()}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {saveState === "saving" ? "Saving…" : "Save to Package"}
              </Button>
            )}
            {showOpenInEditor && session && (
              <Button
                asChild
                variant="default"
                size="sm"
                className="h-7 gap-1 text-xs"
              >
                <Link
                  href={`/rates/fixed-departures?edit=${session.package_id}`}
                >
                  Open in Editor
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              asChild
            >
              <Link href="/rates/fixed-departures/parser">
                <RotateCcw className="h-3 w-3" /> Run Another
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              asChild
            >
              <Link
                href="/rates/fixed-departures/parser"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {stageOrder.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Waiting for first
              stage…
            </span>
          ) : (
            stageOrder.map((key, i) => (
              <div key={key} className="flex items-center">
                {i > 0 && <div className="mx-0.5 h-px w-3 bg-border" />}
                <ParserStagePill
                  stageKey={key}
                  state={stages[key]}
                  isActive={currentStage === key}
                  onClick={() =>
                    stages[key]?.status === "complete" &&
                    setActiveRightTab(key)
                  }
                />
              </div>
            ))
          )}
        </div>
      </div>

      {phase === "done_live" && (
        <DoneLiveBanner
          saveState={saveState}
          saveError={saveError}
          tokensTotal={tokensTotal}
          elapsedMs={elapsedMs ?? 0}
          hasErrors={hasErrors}
          stageErrorCount={stageErrorCount}
          saveWarningCount={saveWarningCount}
          canSave={canSaveToPackage}
          onSave={() => void handleSave()}
        />
      )}
      {phase === "hydrated" && session?.status === "failed" && (
        <div className="flex items-center gap-3 border-b bg-red-50 px-4 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span className="text-sm font-medium text-red-700">
            {readSessionErrors(session.errors).stageErrors[0]?.message ??
              "Parse failed."}
          </span>
        </div>
      )}
      {phase === "hydrated" &&
        session &&
        session.status !== "failed" && (
          <div className="flex items-center justify-between gap-3 border-b bg-green-50 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Previously parsed —{" "}
                {formatDuration(session.total_duration_ms ?? 0)}
                {tokensTotal > 0 &&
                  ` · ${formatTokens(tokensTotal)} tokens`}
              </span>
            </div>
            {canSaveToPackage && (
              <Button
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => void handleSave()}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {saveState === "saving" ? "Saving…" : "Save to Package"}
              </Button>
            )}
          </div>
        )}
      {phase === "disconnected" && session && (
        <div className="flex items-center justify-between gap-3 border-b bg-amber-50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="text-sm text-amber-700">
              Stream dropped. Polling every 2s — or reconnect now.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => session && openStream(session)}
          >
            <RefreshCw className="h-3 w-3" /> Reconnect
          </Button>
        </div>
      )}
      {saveGeoErrors.length > 0 && saveState === "failed" && (
        <div className="border-b bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-red-700">
                Save blocked — geo resolution errors:
              </p>
              <ul className="space-y-0.5">
                {saveGeoErrors.map((e, i) => (
                  <li key={i} className="text-xs text-red-700">
                    {e.stage !== "save" && (
                      <span className="mr-1 font-mono text-[10px] uppercase opacity-70">
                        [{e.stage}]
                      </span>
                    )}
                    {e.message}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600/80">
                Add the missing country/city via admin before retrying.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
        <div className="flex min-h-0 flex-col border-r bg-muted/30">
          <div className="flex items-center gap-2 border-b bg-card px-4 py-3">
            {phase === "streaming" && currentStage ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span className="text-xs font-medium text-blue-700">
                  Streaming {stageLabel(currentStage)}
                </span>
                {liveBuffer.length > 0 && (
                  <span className="text-[10px] text-blue-400">
                    {liveBuffer.length.toLocaleString()} chars
                  </span>
                )}
              </>
            ) : phase === "done_live" || phase === "hydrated" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-green-700">
                  PDF markdown
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Waiting to start…
              </span>
            )}
          </div>
          <div ref={liveScrollRef} className="flex-1 overflow-y-auto p-4">
            <LeftPanel
              phase={phase}
              currentStage={currentStage}
              liveBuffer={liveBuffer}
              storedMarkdown={
                stages.pdf_extract?.content ??
                session?.pdf_extraction?.markdown ??
                ""
              }
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-background">
          <div className="flex items-center gap-0.5 overflow-x-auto border-b bg-card px-4 py-3">
            {STAGE_META.map((s) => {
              const st = stages[s.key];
              const isActive = activeRightTab === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    userTouchedTabRef.current = true;
                    setActiveRightTab(s.key);
                  }}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "text-muted-foreground hover:bg-muted",
                    st?.status === "complete" &&
                      !isActive &&
                      "text-green-600",
                    st?.status === "error" &&
                      !isActive &&
                      "text-red-600",
                    st?.status === "active" &&
                      !isActive &&
                      "text-blue-600",
                  )}
                >
                  {s.label}
                  {st?.status === "complete" && (
                    <CheckCircle2 className="ml-1 inline h-3 w-3" />
                  )}
                  {st?.status === "error" && (
                    <AlertCircle className="ml-1 inline h-3 w-3" />
                  )}
                  {st?.status === "active" && (
                    <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />
                  )}
                </button>
              );
            })}
            {saveWarningCount > 0 && (
              <button
                key="warnings"
                type="button"
                onClick={() => {
                  userTouchedTabRef.current = true;
                  setActiveRightTab(WARNINGS_TAB_KEY);
                }}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  activeRightTab === WARNINGS_TAB_KEY
                    ? "bg-amber-100 text-amber-800"
                    : "text-amber-700 hover:bg-amber-50",
                )}
              >
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                Warnings
                <span className="ml-1 inline-flex items-center rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-900">
                  {saveWarningCount}
                </span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeRightTab === WARNINGS_TAB_KEY ? (
              <ParserWarningsPanel warnings={saveWarnings} />
            ) : (
              <TabBody
                tabKey={activeRightTab}
                stage={stages[activeRightTab]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftPanel({
  phase,
  currentStage,
  liveBuffer,
  storedMarkdown,
}: {
  phase: Phase;
  currentStage: string | null;
  liveBuffer: string;
  storedMarkdown: string;
}) {
  if (phase === "streaming" && liveBuffer) {
    return currentStage === "pdf_extract" ? (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{liveBuffer}</ReactMarkdown>
      </div>
    ) : (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
        {liveBuffer}
      </pre>
    );
  }
  if (storedMarkdown) {
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{storedMarkdown}</ReactMarkdown>
      </div>
    );
  }
  if (phase === "streaming") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for stream…
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground">No PDF content yet.</p>;
}

function TabBody({
  tabKey,
  stage,
}: {
  tabKey: string;
  stage: StageState | undefined;
}) {
  if (!stage) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <p className="pt-2 text-xs text-muted-foreground">
          Not started yet.
        </p>
      </div>
    );
  }
  if (stage.status === "active") {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Running{" "}
        {stageLabel(tabKey)}…
      </div>
    );
  }
  if (stage.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm text-red-700">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
          {stage.error ?? "Unknown error"}
        </p>
      </div>
    );
  }

  switch (tabKey) {
    case "pdf_extract":
      return stage.content ? (
        <PdfMarkdownRenderer content={stage.content} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No PDF markdown captured.
        </p>
      );
    case "itinerary":
      return (
        <ItineraryRenderer
          data={(stage.parsedData ?? {}) as ItineraryOutput}
        />
      );
    case "inclusions_exclusions":
      return (
        <InclusionsExclusionsRenderer
          data={(stage.parsedData ?? {}) as InclusionsExclusionsOutput}
        />
      );
    case "departures_pricing":
      return (
        <DeparturesPricingRenderer
          data={(stage.parsedData ?? {}) as DeparturesPricingOutput}
        />
      );
    case "addons":
      return (
        <AddonsRenderer data={(stage.parsedData ?? {}) as AddonsOutput} />
      );
    case "flights_visa_taxes":
      return (
        <FlightsVisaTaxesRenderer
          data={(stage.parsedData ?? {}) as FlightsVisaTaxesOutput}
        />
      );
    case "policies":
      return (
        <PoliciesRenderer
          data={(stage.parsedData ?? {}) as PoliciesOutput}
        />
      );
    case "auto_images":
      return (
        <AutoImagesRenderer
          data={(stage.parsedData ?? {}) as AutoImagesOutput}
        />
      );
    default:
      if (stage.parsedData !== undefined) {
        return (
          <pre className="max-h-[70vh] overflow-auto rounded border bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground">
            {safeStringify(stage.parsedData)}
          </pre>
        );
      }
      return (
        <p className="text-sm text-muted-foreground">
          No output captured for this stage.
        </p>
      );
  }
}

function DoneLiveBanner({
  saveState,
  saveError,
  tokensTotal,
  elapsedMs,
  hasErrors,
  stageErrorCount,
  saveWarningCount,
  canSave,
  onSave,
}: {
  saveState: SaveState;
  saveError: string | null;
  tokensTotal: number;
  elapsedMs: number;
  hasErrors: boolean;
  stageErrorCount: number;
  saveWarningCount: number;
  canSave: boolean;
  onSave: () => void;
}) {
  const totalWarnings = stageErrorCount + saveWarningCount;
  const summary =
    hasErrors || saveWarningCount > 0
      ? `Parse complete with ${totalWarnings} warning${
          totalWarnings === 1 ? "" : "s"
        } in ${formatDuration(elapsedMs)}${
          tokensTotal > 0 ? ` — ${formatTokens(tokensTotal)} tokens total` : ""
        }`
      : `Parse complete in ${formatDuration(elapsedMs)}${
          tokensTotal > 0 ? ` — ${formatTokens(tokensTotal)} tokens total` : ""
        }`;

  if (saveState === "failed") {
    return (
      <div className="flex items-center justify-between gap-3 border-b bg-red-50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span className="truncate text-sm font-medium text-red-700">
            Save failed: {saveError ?? "Unknown error"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onSave}
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  const amber = hasErrors || saveWarningCount > 0;
  const bg = amber ? "bg-amber-50" : "bg-green-50";
  const iconCls = amber ? "text-amber-600" : "text-green-600";
  const textCls = amber ? "text-amber-800" : "text-green-700";
  const Icon = amber ? AlertTriangle : CheckCircle2;
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 ${bg}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${iconCls}`} />
        <span className={`text-sm font-medium ${textCls}`}>{summary}</span>
      </div>
      {canSave && (
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onSave}
          disabled={saveState === "saving"}
        >
          {saveState === "saving" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {saveState === "saving" ? "Saving…" : "Save to Package"}
        </Button>
      )}
    </div>
  );
}

function safeParse(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stageName(data: Record<string, unknown>): string | null {
  const s = data.stage;
  return typeof s === "string" && s.length > 0 ? s : null;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

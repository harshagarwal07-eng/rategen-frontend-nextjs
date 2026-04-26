"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTokens } from "./parser-format";

export type StagePillStatus = "active" | "retrying" | "complete" | "error";

export interface StagePillState {
  status: StagePillStatus;
  startedAt?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export const STAGE_META: Array<{ key: string; label: string }> = [
  { key: "pdf_extract", label: "PDF" },
  { key: "itinerary", label: "Itinerary" },
  { key: "inclusions_exclusions", label: "Inclusions/Exclusions" },
  { key: "departures_pricing", label: "Departures/Pricing" },
  { key: "addons", label: "Add-ons" },
  { key: "flights_visa_taxes", label: "Flights/Visa/Taxes" },
  { key: "policies", label: "Policies" },
  { key: "auto_images", label: "Auto-images" },
];

export function stageLabel(key: string): string {
  return STAGE_META.find((s) => s.key === key)?.label ?? key;
}

export function ParserStagePill({
  stageKey,
  state,
  isActive,
  onClick,
}: {
  stageKey: string;
  state: StagePillState | undefined;
  isActive: boolean;
  onClick: () => void;
}) {
  const status = state?.status ?? "active";
  const totalTokens =
    (state?.inputTokens ?? 0) + (state?.outputTokens ?? 0);
  const elapsedSec =
    (status === "active" || status === "retrying") && state?.startedAt
      ? (Date.now() - state.startedAt) / 1000
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={state?.error ?? stageLabel(stageKey)}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
        status === "active" &&
          "animate-pulse border-blue-300 bg-blue-50 text-blue-700",
        status === "retrying" &&
          "animate-pulse border-amber-300 bg-amber-50 text-amber-800",
        status === "complete" &&
          "cursor-pointer border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
        status === "error" && "border-red-300 bg-red-50 text-red-700",
        isActive && "ring-1 ring-blue-300",
      )}
    >
      {status === "active" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "retrying" && (
        <RefreshCw className="h-3 w-3 animate-spin" />
      )}
      {status === "complete" && <CheckCircle2 className="h-3 w-3" />}
      {status === "error" && <AlertCircle className="h-3 w-3" />}
      <span className="font-mono">{stageLabel(stageKey)}</span>
      {status === "retrying" && (
        <span className="text-[10px] uppercase opacity-75">retry</span>
      )}
      {(status === "active" || status === "retrying") &&
        elapsedSec !== null && (
          <span className="tabular-nums text-[10px] opacity-75">
            {elapsedSec.toFixed(1)}s
          </span>
        )}
      {status === "complete" && typeof state?.durationMs === "number" && (
        <span className="text-[10px] opacity-75">
          {(state.durationMs / 1000).toFixed(1)}s
        </span>
      )}
      {status === "complete" && totalTokens > 0 && (
        <span className="text-[10px] opacity-60">
          {formatTokens(totalTokens)}
        </span>
      )}
    </button>
  );
}

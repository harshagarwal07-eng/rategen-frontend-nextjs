"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FDParserSessionStatus } from "@/types/fd-parser";

const STATUS_MAP: Record<
  FDParserSessionStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  pending: {
    label: "pending",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  extracting: {
    label: "extracting",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    pulse: true,
  },
  parsing: {
    label: "parsing",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    pulse: true,
  },
  ready_for_review: {
    label: "ready for review",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  saved: {
    label: "saved",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  saved_with_warnings: {
    label: "saved (warnings)",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  failed: {
    label: "failed",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export function ParserStatusBadge({
  status,
  className,
}: {
  status: FDParserSessionStatus;
  className?: string;
}) {
  const cfg = STATUS_MAP[status];
  return (
    <Badge
      variant="outline"
      className={cn(cfg.className, cfg.pulse && "animate-pulse", className)}
    >
      {cfg.label}
    </Badge>
  );
}

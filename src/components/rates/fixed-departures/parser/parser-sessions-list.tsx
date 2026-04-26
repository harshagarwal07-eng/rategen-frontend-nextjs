"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fdParserListSessions } from "@/data-access/fd-parser";
import { readSessionErrors } from "@/lib/fd-parser-errors";
import { ParserStatusBadge } from "./parser-status-badge";
import {
  formatRelative,
  formatDuration,
  formatTokens,
} from "./parser-format";

const DEFAULT_LIMIT = 20;

export function ParserSessionsList({
  limit = DEFAULT_LIMIT,
  packageId,
  emptyMessage,
}: {
  limit?: number;
  packageId?: string;
  emptyMessage?: string;
}) {
  const queryKey = packageId
    ? ["fd-parser-sessions", { packageId, limit }]
    : ["fd-parser-sessions", { limit }];

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => fdParserListSessions({ limit, packageId }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error instanceof Error ? error.message : "Failed to load sessions."}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          className="h-7 gap-1 text-xs"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No sessions yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-end px-3 py-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Created</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Warnings</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const title = row.pre_parse_input?.title?.trim() || "(untitled)";
            const tokens =
              (row.total_input_tokens ?? 0) + (row.total_output_tokens ?? 0);
            const warningCount = readSessionErrors(row.errors).warnings.length;
            return (
              <TableRow key={row.id}>
                <TableCell
                  className="text-xs text-muted-foreground"
                  title={new Date(row.created_at).toLocaleString()}
                >
                  {formatRelative(row.created_at)}
                </TableCell>
                <TableCell
                  className="max-w-[280px] truncate font-medium"
                  title={title}
                >
                  {title}
                </TableCell>
                <TableCell>
                  <ParserStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDuration(row.total_duration_ms)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tokens > 0 ? formatTokens(tokens) : "—"}
                </TableCell>
                <TableCell>
                  {warningCount > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                      title={`${warningCount} warning${warningCount === 1 ? "" : "s"}`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {warningCount}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/rates/fixed-departures/parser/${row.id}`}>
                        View
                      </Link>
                    </Button>
                    {row.package_id && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                      >
                        <Link
                          href={`/rates/fixed-departures?edit=${row.package_id}`}
                          title="Open in editor"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

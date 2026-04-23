"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";
import Link from "next/link";
import type { ICrmQueryCard, QueryStatus } from "@/types/crm-query";
import { QUERY_STATUS_CONFIGS, getQueryStatusConfig } from "@/lib/status-styles-config";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface GenerateQueryColumnsOptions {
  onStatusChange?: (queryId: string, newStatus: QueryStatus) => void;
}

export function generateQueryColumns(options: GenerateQueryColumnsOptions = {}): ColumnDef<ICrmQueryCard>[] {
  const { onStatusChange } = options;

  return [
    {
      id: "query_id",
      accessorKey: "query_id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Query ID" />,
      cell: ({ row }) => <div className="text-sm font-mono">{row.original.query_id}</div>,
      enablePinning: true,
      enableSorting: false,
      size: 110,
    },
    {
      id: "traveler_name",
      accessorKey: "traveler_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Traveler" />,
      cell: ({ row }) => {
        const { traveler_name, ta_name, ta_category, pax_details, is_flagged_by_dmc, id } = row.original;
        const childCount = pax_details?.children ?? 0;
        const paxSummary = pax_details ? `${pax_details.adults}A${childCount > 0 ? `, ${childCount}C` : ""}` : null;

        return (
          <div className="flex flex-col gap-2 max-w-[200px] ml-2">
            <Link href={`/crm/queries/all/${id}`} className="flex items-center gap-1.5 hover:underline text-foreground">
              <span className="font-medium text-sm truncate">{traveler_name}</span>
              {is_flagged_by_dmc && (
                <div className="shrink-0 flex items-center justify-center size-5 rounded bg-destructive/10">
                  <Flag className="size-3 stroke-destructive fill-destructive" />
                </div>
              )}
            </Link>
            <div className="flex items-center gap-1.5">
              {ta_name && <span className="text-xs text-muted-foreground truncate">{ta_name}</span>}
              {ta_category && ta_category.toLowerCase() !== "unrated" && (
                <span className="shrink-0 inline-flex items-center gap-1 h-4 px-1.5 rounded text-[10px] font-bold bg-warning/10">
                  <span>{ta_category}</span>
                  <span className="text-warning">★</span>
                </span>
              )}
              {paxSummary && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  {paxSummary}
                </Badge>
              )}
            </div>
          </div>
        );
      },
      enableSorting: true,
      size: 210,
    },
    {
      id: "travel_countries",
      accessorFn: (row) => row.travel_country_names?.join(", ") || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Destination" />,
      cell: ({ row }) => {
        const countries = row.original.travel_country_names;
        if (!countries?.length) return <span className="text-muted-foreground text-sm">-</span>;
        return (
          <div className="text-sm truncate max-w-[140px]" title={countries.join(", ")}>
            {countries.join(", ")}
          </div>
        );
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "travel_date",
      accessorKey: "travel_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const date = row.original.travel_date;
        return (
          <div className="text-sm">
            {date ? format(new Date(date), "dd MMM yyyy") : <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
      enableSorting: true,
      size: 120,
    },
    {
      id: "duration",
      accessorKey: "duration",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
      cell: ({ row }) => {
        const d = row.original.duration;
        return (
          <div className="text-sm tabular-nums">{d ? `${d}N` : <span className="text-muted-foreground">-</span>}</div>
        );
      },
      enableSorting: true,
      size: 90,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Status"
          options={QUERY_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value }))}
        />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const config = getQueryStatusConfig(status);

        return (
          <Select value={status} onValueChange={(value) => onStatusChange?.(row.original.id, value as QueryStatus)}>
            <SelectTrigger
              size="xs"
              className={cn(
                "!w-full !h-auto !border-transparent !shadow-none !text-xs !font-medium !rounded-md gap-1 [&_svg:not([class*='text-'])]:!text-current [&_svg:not([class*='size-'])]:!size-2.5 cursor-pointer hover:opacity-80",
                config.color,
                config.bgColor
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {config.label}
            </SelectTrigger>
            <SelectContent>
              {QUERY_STATUS_CONFIGS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  <div className={cn("flex items-center gap-1.5", s.color)}>
                    <s.icon className={cn("size-3", s.color)} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      enableColumnFilter: true,
      enableSorting: true,
      meta: { options: [] },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      size: 120,
    },

    // ── Hidden filter-only columns (driven by toolbar DataTableDBFilter) ─────
    {
      id: "travel_country",
      accessorFn: (row) => row.travel_countries?.[0] || "",
      header: () => null,
      cell: () => null,
      meta: { options: [] },
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      size: 0,
      filterFn: (row, _id, value) => (value as string[]).some((v) => row.original.travel_countries?.includes(v)),
    },
  ];
}

// Backwards-compat static export for existing usages
export const queryColumns = generateQueryColumns();

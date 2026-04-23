"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { Badge } from "@/components/ui/badge";
import { Flag, Pin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ICrmTaDetails, OrgStatus } from "@/types/crm-agency";
import { AGENT_STATUS_CONFIGS, getAgentStatusConfig } from "@/lib/status-styles-config";
import { AGENCY_CATEGORIES } from "@/constants/data";

interface GenerateAgentColumnsOptions {
  onStatusChange?: (taId: string, newStatus: OrgStatus) => void;
}

export function generateAgentColumns(options: GenerateAgentColumnsOptions = {}): ColumnDef<ICrmTaDetails>[] {
  const { onStatusChange } = options;

  return [
    // ── Visible columns ──────────────────────────────────────────────────────
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const agent = row.original;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate max-w-[160px]">{agent.name}</span>
            {agent.is_flagged && (
              <div className="shrink-0 flex items-center justify-center size-5 rounded bg-destructive/10">
                <Flag className="size-3 stroke-destructive fill-destructive" />
              </div>
            )}
            {!!(agent.dmc_pin_count && Number(agent.dmc_pin_count) > 0) && (
              <Badge
                variant="secondary"
                className="shrink-0 h-4 px-1 gap-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              >
                <Pin className="size-2.5" />
                <span className="text-[9px] font-medium">{agent.dmc_pin_count}</span>
              </Badge>
            )}
          </div>
        );
      },
      enablePinning: true,
      enableSorting: true,
      size: 200,
    },
    {
      id: "ta_admin",
      accessorFn: (row) => row.ta_admin_name || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Admin" />,
      cell: ({ row }) => {
        const { ta_admin_name, ta_admin_phone, ta_admin_email } = row.original;
        if (!ta_admin_name && !ta_admin_phone && !ta_admin_email) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            {ta_admin_name && <span className="text-sm font-medium truncate max-w-[160px]">{ta_admin_name}</span>}
            {ta_admin_phone && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{ta_admin_phone}</span>
            )}
            {ta_admin_email && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{ta_admin_email}</span>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "category",
      accessorFn: (row) => row.category || "unrated",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Category" options={AGENCY_CATEGORIES} />,
      cell: ({ row }) => {
        const cat = row.original.category;
        if (!cat || cat === "unrated") return <span className="text-muted-foreground text-sm">-</span>;
        const label = AGENCY_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
        return <span className="text-sm">{label}</span>;
      },
      enableColumnFilter: true,
      enableSorting: true,
      meta: { options: [] },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      size: 110,
    },
    {
      id: "country_name",
      accessorFn: (row) => row.country_name || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
      cell: ({ row }) => (
        <div className="text-sm">{row.original.country_name || <span className="text-muted-foreground">-</span>}</div>
      ),
      enableSorting: true,
      size: 130,
    },
    {
      id: "city_name",
      accessorFn: (row) => row.city_name || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
      cell: ({ row }) => (
        <div className="text-sm">{row.original.city_name || <span className="text-muted-foreground">-</span>}</div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      id: "source_name",
      accessorFn: (row) => row.source_name || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
      cell: ({ row }) => (
        <div className="text-sm">{row.original.source_name || <span className="text-muted-foreground">-</span>}</div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Status"
          options={AGENT_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value }))}
        />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const config = getAgentStatusConfig(status);
        return (
          <Select value={status} onValueChange={(value) => onStatusChange?.(row.original.ta_id, value as OrgStatus)}>
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
              {AGENT_STATUS_CONFIGS.map((config) => (
                <SelectItem key={config.value} value={config.value} className="text-xs">
                  <div className={cn("flex items-center gap-1.5", config.color)}>
                    <config.icon className={cn("size-3", config.color)} />
                    {config.label}
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
      size: 110,
    },
    {
      id: "queries_count",
      accessorFn: (row) => row.queries_count ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Queries" />,
      cell: ({ row }) => <div className="text-sm tabular-nums">{row.original.queries_count ?? 0}</div>,
      enableSorting: true,
      size: 90,
    },
    {
      id: "booking_count",
      accessorFn: (row) => row.booking_count ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bookings" />,
      cell: ({ row }) => <div className="text-sm tabular-nums">{row.original.booking_count ?? 0}</div>,
      enableSorting: true,
      size: 90,
    },
    {
      id: "token_used",
      accessorFn: (row) => row.token_used ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tokens" />,
      cell: ({ row }) => <div className="text-sm tabular-nums">{(row.original.token_used ?? 0).toLocaleString()}</div>,
      enableSorting: true,
      size: 100,
    },

    // ── Hidden filter-only columns (driven by toolbar DataTableDBFilter) ─────
    {
      id: "country",
      accessorFn: (row) => row.country || "",
      header: () => null,
      cell: () => null,
      meta: { options: [] },
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      size: 0,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "city",
      accessorFn: (row) => row.city || "",
      header: () => null,
      cell: () => null,
      meta: { options: [] },
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      size: 0,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "source",
      accessorFn: (row) => row.source || "",
      header: () => null,
      cell: () => null,
      meta: { options: [] },
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      size: 0,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
  ];
}

// Backwards-compat static export
export const agentColumns = generateAgentColumns();

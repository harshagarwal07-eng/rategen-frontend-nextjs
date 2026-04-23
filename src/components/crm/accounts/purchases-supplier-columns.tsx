"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { PurchaseBySupplier } from "@/types/ops-accounts";
import { getServiceTypeConfig } from "@/lib/status-styles-config";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { cn } from "@/lib/utils";

const SERVICE_TYPE_OPTIONS = [
  { label: "Hotel", value: "hotel" },
  { label: "Tour", value: "tour" },
  { label: "Transfer", value: "transfer" },
];

function PaxCell({ adults, children, infants }: { adults: number; children: number; infants: number }) {
  const total = adults + children + infants;
  const parts: string[] = [];
  if (adults > 0 || children > 0 || infants > 0) {
    parts.push(`${adults}A`);
    if (children > 0) parts.push(`${children}C`);
    if (infants > 0) parts.push(`${infants}I`);
  }
  return (
    <div className="text-xs text-right tabular-nums">
      <span className="text-muted-foreground">{parts.join(" + ")}</span>
      {parts.length > 0 && <span className="text-foreground font-medium"> = {total} Pax</span>}
    </div>
  );
}

function AmountCell({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("font-mono text-xs text-right tabular-nums", className)}>
      {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  );
}

function BalanceCell({ balance, amount }: { balance: number; amount: number }) {
  const pct = amount > 0 ? balance / amount : 0;
  const color =
    balance <= 0
      ? "text-green-600"
      : pct >= 0.5
      ? "text-destructive"
      : "text-amber-600";
  return (
    <div className={cn("font-mono text-xs text-right tabular-nums", color)}>
      {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  );
}

export function generatePurchaseSupplierColumns(): ColumnDef<PurchaseBySupplier>[] {
  return [
    {
      id: "supplier",
      accessorKey: "supplier_name",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Supplier" enableFiltering={false} />,
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium">{row.original.supplier_name}</div>
          {(row.original.supplier_city || row.original.supplier_country) && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {[row.original.supplier_city, row.original.supplier_country]
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
        </div>
      ),
      size: 200,
    },
    {
      id: "service_types",
      accessorKey: "service_types",
      header: ({ column, table }) => {
        const filterCol = table.getColumn("service_type");
        return (
          <DataTableColumnFilter
            column={filterCol ?? column}
            title="Service Type"
            options={SERVICE_TYPE_OPTIONS}
          />
        );
      },
      enableSorting: false,
      cell: ({ row }) => {
        const types = row.original.service_types ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => {
              const cfg = getServiceTypeConfig(t);
              return (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-xs h-5 px-1.5 capitalize"
                  style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bgColor }}
                >
                  {cfg.label || t}
                </Badge>
              );
            })}
            {types.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
          </div>
        );
      },
      size: 160,
    },
    // Ghost column — drives the service_type URL param for server-side filtering
    {
      id: "service_type",
      accessorFn: () => "",
      header: () => null,
      cell: () => null,
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      meta: { options: SERVICE_TYPE_OPTIONS },
      size: 0,
    },
    {
      id: "service_count",
      accessorKey: "service_count",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Services" enableFiltering={false} />,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">{row.original.service_count}</div>
      ),
      size: 80,
    },
    {
      id: "pax",
      header: () => <div className="text-right">Pax</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <PaxCell
          adults={row.original.total_adults}
          children={row.original.total_children}
          infants={row.original.total_infants}
        />
      ),
      size: 80,
    },
    {
      id: "total_amount",
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Amount" enableFiltering={false} />,
      enableSorting: true,
      cell: ({ row }) => <AmountCell value={row.original.total_amount} />,
      meta: { showTotal: true },
      size: 120,
    },
    {
      id: "total_paid",
      accessorKey: "total_paid",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Payment" enableFiltering={false} />,
      enableSorting: true,
      cell: ({ row }) => (
        <AmountCell value={row.original.total_paid} className="text-green-600" />
      ),
      meta: { showTotal: true },
      size: 120,
    },
    {
      id: "balance",
      accessorKey: "balance",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Balance" enableFiltering={false} />,
      enableSorting: true,
      cell: ({ row }) => (
        <BalanceCell balance={row.original.balance} amount={row.original.total_amount} />
      ),
      meta: { showTotal: true },
      size: 120,
    },
  ];
}

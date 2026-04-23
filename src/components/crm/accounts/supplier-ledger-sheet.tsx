"use client";

import * as React from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TruncatedCell } from "@/components/ui/table/truncated-cell";
import { getSupplierLedger } from "@/data-access/ops-accounts";
import type { PurchaseBySupplier, SupplierLedgerRow } from "@/types/ops-accounts";
import { DateRangePicker } from "@/components/ui/new-table/date-range-picker";

interface SupplierLedgerSheetProps {
  supplier: PurchaseBySupplier | null;
  onClose: () => void;
}

function AmountCell({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function BalanceCell({ value }: { value: number }) {
  const color = value <= 0 ? "text-green-600" : value > 0 ? "text-destructive" : "";
  return (
    <span className={cn("font-mono tabular-nums", color)}>
      {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

const ROW_TYPE_LABELS: Record<string, string> = {
  opening_balance: "Opening Bal.",
  purchase: "Purchase",
  payment: "Payment",
  refund: "Refund",
};

const ROW_TYPE_COLORS: Record<string, string> = {
  opening_balance: "text-muted-foreground italic",
  purchase: "",
  payment: "text-green-700",
  refund: "text-destructive",
};

export function SupplierLedgerSheet({ supplier, onClose }: SupplierLedgerSheetProps) {
  const [ledger, setLedger] = React.useState<SupplierLedgerRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

  const open = !!supplier;

  // Reset when supplier changes
  React.useEffect(() => {
    if (supplier) {
      setDateRange({ from: null, to: null });
      setLedger([]);
    }
  }, [supplier?.supplier_id]);

  // Fetch ledger when supplier or date changes
  React.useEffect(() => {
    if (!supplier) return;
    let cancelled = false;
    setLoading(true);
    getSupplierLedger(supplier.supplier_id, dateRange.from ?? undefined, dateRange.to ?? undefined)
      .then((rows) => {
        if (!cancelled) setLedger(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplier?.supplier_id, dateRange.from, dateRange.to]);

  if (!supplier) return null;

  const location = [supplier.supplier_city, supplier.supplier_country].filter(Boolean).join(", ");

  const datedRows = ledger.filter((r) => r.row_type !== "opening_balance" && r.row_date);
  const dateRangeLabel = (() => {
    if (datedRows.length === 0) return null;
    const dates = datedRows.map((r) => r.row_date);
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    if (minDate === maxDate) return format(new Date(minDate), "d MMM yyyy");
    return `${format(new Date(minDate), "d MMM yyyy")} – ${format(new Date(maxDate), "d MMM yyyy")}`;
  })();

  const percentPaid = supplier.total_amount > 0 ? (supplier.total_paid / supplier.total_amount) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 pb-0 shrink-0 space-y-3">
          {/* Sheet title + date range */}
          <div>
            <SheetTitle className="font-semibold">Statement Of Accounts</SheetTitle>
            {dateRangeLabel && <SheetDescription className="text-xs mt-0.5">{dateRangeLabel}</SheetDescription>}
          </div>

          {/* Supplier info + Summary */}
          <div className="flex items-start justify-between gap-4 border-b border-dashed pb-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold leading-tight">{supplier.supplier_name}</span>
              {location && <p className="text-xs text-muted-foreground">{location}</p>}
            </div>

            <div className="inline-flex items-center gap-4 px-3 py-2 rounded-md bg-card divide-x [&>div]:pr-2 shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="text-sm font-semibold font-mono">
                  {supplier.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Paid</p>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold font-mono text-primary">
                    {supplier.total_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground">({percentPaid.toFixed(1)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Balance</p>
                <p
                  className={cn(
                    "text-sm font-semibold font-mono",
                    supplier.balance <= 0 ? "text-primary" : "text-destructive"
                  )}
                >
                  {supplier.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Ledger table */}
        <div className="flex-1 min-h-0 flex flex-col p-4 pt-0 gap-2">
          <div className="flex justify-end">
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to }}
              onChange={(from, to) => setDateRange({ from, to })}
            />
          </div>
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-24 text-xs">Date</TableHead>
                    <TableHead className="w-28 text-xs">Type</TableHead>
                    <TableHead className="min-w-64 text-xs">Details</TableHead>
                    <TableHead className="w-28 text-right text-xs">Amount</TableHead>
                    <TableHead className="w-28 text-right text-xs">Payment</TableHead>
                    <TableHead className="w-28 text-right text-xs">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-xs text-muted-foreground">Loading ledger…</p>
                      </TableCell>
                    </TableRow>
                  ) : ledger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-xs text-muted-foreground">No transactions found for the selected period.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledger.map((row, idx) => {
                      const isOpening = row.row_type === "opening_balance";
                      return (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {isOpening || !row.row_date ? "—" : format(new Date(row.row_date), "d MMM yyyy")}
                          </TableCell>
                          <TableCell className={cn("text-xs whitespace-nowrap", ROW_TYPE_COLORS[row.row_type])}>
                            {ROW_TYPE_LABELS[row.row_type] ?? row.row_type}
                          </TableCell>
                          <TableCell>
                            <TruncatedCell text={row.details} />
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <AmountCell value={row.amount} />
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <AmountCell
                              value={row.payment}
                              className={row.payment < 0 ? "text-destructive" : "text-green-600"}
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <BalanceCell value={row.balance} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

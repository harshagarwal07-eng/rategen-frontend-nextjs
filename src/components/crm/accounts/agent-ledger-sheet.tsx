"use client";

import * as React from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TruncatedCell } from "@/components/ui/table/truncated-cell";
import { getAgentLedger } from "@/data-access/ops-accounts";
import type { SalesByAgent, AgentLedgerRow } from "@/types/ops-accounts";
import { DateRangePicker } from "@/components/ui/new-table/date-range-picker";

interface AgentLedgerSheetProps {
  agent: SalesByAgent | null;
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
  sale: "Sale",
  payment: "Payment",
  refund: "Refund",
};

const ROW_TYPE_COLORS: Record<string, string> = {
  opening_balance: "text-muted-foreground italic",
  sale: "",
  payment: "text-green-700",
  refund: "text-destructive",
};

export function AgentLedgerSheet({ agent, onClose }: AgentLedgerSheetProps) {
  const [ledger, setLedger] = React.useState<AgentLedgerRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

  const open = !!agent;

  // Reset when agent changes
  React.useEffect(() => {
    if (agent) {
      setDateRange({ from: null, to: null });
      setLedger([]);
    }
  }, [agent?.agency_id]);

  // Fetch ledger when agent or date changes
  React.useEffect(() => {
    if (!agent) return;
    let cancelled = false;
    setLoading(true);
    getAgentLedger(agent.agency_id, dateRange.from ?? undefined, dateRange.to ?? undefined)
      .then((rows) => {
        if (!cancelled) setLedger(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agent?.agency_id, dateRange.from, dateRange.to]);

  // Derive totals from fetched ledger rows (respects the date range filter)
  // Must be before the early return to satisfy Rules of Hooks
  const ledgerTotals = React.useMemo(() => {
    const rows = ledger.filter((r) => r.row_type !== "opening_balance");
    const totalSale = rows.reduce((s, r) => s + r.amount, 0);
    const totalPaid = rows.reduce((s, r) => s + r.payment, 0);
    const balance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
    const percentReceived = totalSale > 0 ? (totalPaid / totalSale) * 100 : 0;
    return { totalSale, totalPaid, balance, percentReceived };
  }, [ledger]);

  if (!agent) return null;

  const location = [agent.agency_city, agent.agency_country].filter(Boolean).join(", ");

  const datedRows = ledger.filter((r) => r.row_type !== "opening_balance" && r.row_date);
  const dateRangeLabel = (() => {
    if (datedRows.length === 0) return null;
    const dates = datedRows.map((r) => r.row_date as string);
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    if (minDate === maxDate) return format(new Date(minDate), "d MMM yyyy");
    return `${format(new Date(minDate), "d MMM yyyy")} – ${format(new Date(maxDate), "d MMM yyyy")}`;
  })();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 pb-0 shrink-0 space-y-3">
          <div>
            <SheetTitle className="font-semibold">Statement Of Accounts</SheetTitle>
            {dateRangeLabel && <SheetDescription className="text-xs mt-0.5">{dateRangeLabel}</SheetDescription>}
          </div>

          {/* Agent info + Summary */}
          <div className="flex items-start justify-between gap-4 border-b border-dashed pb-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold leading-tight">{agent.agency_name}</span>
              {agent.agency_address && <p className="text-xs text-muted-foreground">{agent.agency_address}</p>}
              {location && <p className="text-xs text-muted-foreground">{location}</p>}
            </div>

            <div className="inline-flex items-center gap-4 px-3 py-2 rounded-md bg-card divide-x [&>div]:pr-2 shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="text-sm font-semibold font-mono">
                  {ledgerTotals.totalSale.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Received</p>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold font-mono text-primary">
                    {ledgerTotals.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground">({ledgerTotals.percentReceived.toFixed(1)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Balance</p>
                <p
                  className={cn(
                    "text-sm font-semibold font-mono",
                    ledgerTotals.balance <= 0 ? "text-primary" : "text-destructive"
                  )}
                >
                  {ledgerTotals.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                    <TableHead className="w-28 text-right text-xs">Received</TableHead>
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

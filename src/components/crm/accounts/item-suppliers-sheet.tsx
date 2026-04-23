"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getServiceTypeConfig } from "@/lib/status-styles-config";
import { getItemPurchasesBySupplier } from "@/data-access/ops-accounts";
import type { PurchaseByItem, ItemPurchaseBySupplier } from "@/types/ops-accounts";

interface ItemSuppliersSheetProps {
  item: PurchaseByItem | null;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
}

export function ItemSuppliersSheet({ item, onClose, startDate, endDate }: ItemSuppliersSheetProps) {
  const [rows, setRows] = React.useState<ItemPurchaseBySupplier[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setLoading(true);
    getItemPurchasesBySupplier(item.item_id, startDate, endDate)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item?.item_id, startDate, endDate]);

  if (!item) return null;

  const cfg = getServiceTypeConfig(item.service_type);

  const totalPurchaseCount = rows.reduce((s, r) => s + Number(r.purchase_count), 0);
  const totalAdults = rows.reduce((s, r) => s + r.total_adults, 0);
  const totalChildren = rows.reduce((s, r) => s + r.total_children, 0);
  const totalInfants = rows.reduce((s, r) => s + r.total_infants, 0);
  const totalAmount = rows.reduce((s, r) => s + r.total_amount, 0);

  return (
    <Sheet open={!!item} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5  shrink-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <SheetTitle className="text-base font-semibold leading-tight">{item.service_name}</SheetTitle>
              <Badge
                variant="outline"
                className="text-xs h-5 px-1.5 capitalize shrink-0"
                style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bgColor }}
              >
                {cfg.label || item.service_type}
              </Badge>
            </div>
            <SheetDescription className="text-xs mt-0.5">Breakdown by supplier</SheetDescription>
          </div>

          {/* Summary */}
          <div className="flex justify-end border-b border-dashed pb-3">
            <div className="inline-flex items-center gap-4 px-3 py-2 rounded-md bg-card divide-x [&>div]:pr-2 shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="text-sm font-semibold font-mono tabular-nums">
                  {totalPurchaseCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{item.purchase_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Pax</p>
                <p className="text-sm tabular-nums">
                  <span className="text-xs text-muted-foreground">
                    {[
                      `${totalAdults}A`,
                      totalChildren > 0 ? `${totalChildren}C` : null,
                      totalInfants > 0 ? `${totalInfants}I` : null,
                    ]
                      .filter(Boolean)
                      .join(" + ")}
                  </span>
                  <span className="font-semibold"> = {totalAdults + totalChildren + totalInfants}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Amount</p>
                <p className="text-sm font-semibold font-mono tabular-nums">
                  {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 flex flex-col p-4 pt-0 gap-2">
          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[160px] text-xs">Supplier</TableHead>
                    <TableHead className="w-24 text-xs">Type</TableHead>
                    <TableHead className="w-32 text-right text-xs">Purchases</TableHead>
                    <TableHead className="w-28 text-right text-xs">Pax</TableHead>
                    <TableHead className="w-32 text-right text-xs">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell>
                            <Skeleton className="h-4 w-11/12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-14" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-11/12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-11/12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-11/12" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <p className="text-xs text-muted-foreground">No suppliers found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {rows.map((row, idx) => {
                        const rowCfg = getServiceTypeConfig(row.service_type);
                        return (
                          <TableRow key={idx} className="hover:bg-muted/30">
                            <TableCell>
                              <p className="text-xs font-medium leading-tight">{row.supplier_name || "—"}</p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 capitalize"
                                style={{ color: rowCfg.color, backgroundColor: rowCfg.bgColor }}
                              >
                                {rowCfg.label || row.service_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              <span className="font-medium">{Number(row.purchase_count)}</span>{" "}
                              <span className="text-muted-foreground">{row.purchase_unit}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              <span className="text-muted-foreground">
                                {[
                                  `${row.total_adults}A`,
                                  row.total_children > 0 ? `${row.total_children}C` : null,
                                  row.total_infants > 0 ? `${row.total_infants}I` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" + ")}
                              </span>
                              <span className="font-medium">
                                {" "}
                                = {row.total_adults + row.total_children + row.total_infants} Pax
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs font-medium">
                              {row.total_amount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/30 border-t-2">
                        <TableCell className="text-xs font-semibold">Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right tabular-nums text-xs font-semibold">
                          {totalPurchaseCount}{" "}
                          <span className="font-normal text-muted-foreground">{item.purchase_unit}</span>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right tabular-nums text-xs font-semibold">
                          {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </>
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

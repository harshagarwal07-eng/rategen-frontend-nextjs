import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/ui/alert-modal";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ServiceBreakup } from "@/data-access/service-breakups";
import { getServiceTypeConfig } from "@/lib/status-styles-config";
import {
  calculateTotalBaseCost,
  calculateTotalDiscount,
  calculateTotalMarkup,
  calculateTotalTax,
  calculateGrandTotal,
} from "@/lib/pricing/breakup-utils";
import { PRICING_UNIT_TYPES } from "@/constants/data";

interface PricingBreakupSectionProps {
  breakups: ServiceBreakup[];
  availableDays?: number[];
  onAddBreakup: () => void;
  onUpdateBreakup: <K extends keyof ServiceBreakup>(id: string, field: K, value: ServiceBreakup[K]) => void;
  onDeleteBreakup: (id: string) => void;
  onDayChange?: (id: string, dayNumber: number) => void;
  isDeleting?: boolean;
  showDaySelector?: boolean;
}

export function PricingBreakupSection({
  breakups,
  availableDays = [],
  onAddBreakup,
  onUpdateBreakup,
  onDeleteBreakup,
  onDayChange,
  isDeleting = false,
  showDaySelector = false,
}: PricingBreakupSectionProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDeleteBreakup(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const sortedBreakups = [...breakups].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));

  return (
    <>
      <BorderedCard title="Rate Breakdown" collapsible defaultOpen>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Add detailed pricing breakups. The total base cost will automatically sync to the cost price field.
            </p>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onAddBreakup}>
              <Plus className="size-3 mr-1" />
              Add Breakup
            </Button>
          </div>

          {breakups.length > 0 ? (
            <div className="border rounded-lg">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {showDaySelector && <TableHead className="w-14 text-center px-2 py-2">Day</TableHead>}
                    <TableHead className="w-20 text-center px-2 py-2">Date</TableHead>
                    <TableHead className="px-2 py-2">Service</TableHead>
                    <TableHead className="w-16 text-center px-2 py-2">Type</TableHead>
                    <TableHead className="w-16 text-center px-2 py-2">Unit</TableHead>
                    <TableHead className="w-12 text-center px-2 py-2">Qty</TableHead>
                    <TableHead className="w-20 text-center px-2 py-2">Base Cost</TableHead>
                    <TableHead className="w-20 text-center px-2 py-2">Discount</TableHead>
                    <TableHead className="w-20 text-center px-2 py-2">Markup</TableHead>
                    <TableHead className="w-16 text-center px-2 py-2">Tax</TableHead>
                    <TableHead className="w-20 text-center px-2 py-2">Total</TableHead>
                    <TableHead className="w-10 text-center px-2 py-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBreakups.map((b) => {
                    const typeConfig = getServiceTypeConfig(b.service_type);
                    const dateStr = b.service_date
                      ? new Date(b.service_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "";

                    return (
                      <TableRow key={b.id}>
                        {showDaySelector && onDayChange && (
                          <TableCell className="px-2 py-2">
                            <Select
                              value={String(b.day_number || 1)}
                              onValueChange={(value) => onDayChange(b.id, parseInt(value))}
                            >
                              <SelectTrigger className="text-xs w-full px-1 h-8" size="xs" variant="cell">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableDays.map((day) => (
                                  <SelectItem key={day} value={String(day)} className="text-xs">
                                    Day {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground">{dateStr || "-"}</TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="text"
                            variant="cell"
                            value={b.service_name || ""}
                            onChange={(e) => onUpdateBreakup(b.id, "service_name", e.target.value)}
                            className="text-xs font-medium"
                          />
                          {b.season_name && <div className="text-[10px] text-muted-foreground">{b.season_name}</div>}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2">
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] px-1.5", typeConfig.color, typeConfig.bgColor)}
                          >
                            {b.service_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Select
                            value={b.unit_type || "night"}
                            onValueChange={(value) => onUpdateBreakup(b.id, "unit_type", value)}
                          >
                            <SelectTrigger className="text-xs w-full px-1 h-8" size="xs" variant="cell">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRICING_UNIT_TYPES.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value} className="text-xs">
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            variant="cell"
                            align="center"
                            value={b.quantity || 1}
                            onChange={(e) => onUpdateBreakup(b.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            variant="cell"
                            align="right"
                            value={b.base_cost || 0}
                            onChange={(e) => onUpdateBreakup(b.id, "base_cost", parseFloat(e.target.value) || 0)}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            variant="cell"
                            align="right"
                            value={b.discount_amount || 0}
                            onChange={(e) => onUpdateBreakup(b.id, "discount_amount", parseFloat(e.target.value) || 0)}
                            className="text-xs text-primary"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            variant="cell"
                            align="right"
                            value={b.markup_amount || 0}
                            onChange={(e) => onUpdateBreakup(b.id, "markup_amount", parseFloat(e.target.value) || 0)}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            variant="cell"
                            align="right"
                            value={b.tax_amount || 0}
                            onChange={(e) => onUpdateBreakup(b.id, "tax_amount", parseFloat(e.target.value) || 0)}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            variant="cell"
                            align="right"
                            value={b.final_cost || 0}
                            onChange={(e) => onUpdateBreakup(b.id, "final_cost", parseFloat(e.target.value) || 0)}
                            className="text-xs font-semibold"
                          />
                        </TableCell>
                        <TableCell className="text-center px-2 py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteConfirmId(b.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={showDaySelector ? 5 : 4} className="text-right font-semibold px-2 py-2">
                      Total
                    </TableCell>
                    <TableCell className="text-center font-semibold px-2 py-2">
                      {breakups.reduce((sum, b) => sum + (b.quantity || 0), 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold px-2 py-2">
                      {calculateTotalBaseCost(breakups).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold px-2 py-2 text-primary">
                      {calculateTotalDiscount(breakups).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold px-2 py-2">
                      {calculateTotalMarkup(breakups).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold px-2 py-2">
                      {calculateTotalTax(breakups).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold px-2 py-2">
                      {calculateGrandTotal(breakups).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center px-2 py-2"></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg">
              <p className="text-xs mb-3">No rate breakdowns added yet</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onAddBreakup}>
                <Plus className="size-3 mr-1" />
                Add First Breakup
              </Button>
            </div>
          )}
        </div>
      </BorderedCard>

      <AlertModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Rate Breakdown"
        description="Are you sure you want to delete this rate breakdown? This action cannot be undone."
      />
    </>
  );
}

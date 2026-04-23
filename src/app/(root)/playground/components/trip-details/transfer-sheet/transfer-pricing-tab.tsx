"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Calendar } from "lucide-react";
import type { TransferSheetContextValue } from "./types";

interface TransferPricingTabProps {
  ctx: TransferSheetContextValue;
}

const typeColors: Record<string, string> = {
  hotel: "bg-blue-50 text-blue-700 border-blue-200",
  tour: "bg-green-50 text-green-700 border-green-200",
  transfer: "bg-orange-50 text-orange-700 border-orange-200",
  combo: "bg-purple-50 text-purple-700 border-purple-200",
  meal: "bg-amber-50 text-amber-700 border-amber-200",
};

const unitTypes = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "infant", label: "Infant" },
  { value: "vehicle", label: "Vehicle" },
  { value: "transfer", label: "Transfer" },
  { value: "trip", label: "Trip" },
  { value: "person", label: "Person" },
];

export function TransferPricingTab({ ctx }: TransferPricingTabProps) {
  const {
    formData,
    transferDetails,
    breakups,
    saving,
    itineraryInfo,
    updateBreakupField,
    addBreakup,
    deleteBreakup,
    handleSaveBreakups,
  } = ctx;

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sortedBreakups = [...breakups].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));

  const maxDays = itineraryInfo?.nights
    ? itineraryInfo.nights + 1
    : Math.max(formData.day_number || 7, ...breakups.map((b) => b.day_number || 0), 7);

  const availableDays = Array.from({ length: maxDays }, (_, i) => i + 1);

  const checkInDate = itineraryInfo?.checkIn || formData.pickup_date || formData.day_date;

  const getDateForDay = (dayNumber: number): string => {
    if (!checkInDate) return "";
    const startDate = new Date(checkInDate);
    startDate.setDate(startDate.getDate() + dayNumber - 1);
    return startDate.toISOString().split("T")[0];
  };

  const handleDayChange = (breakupId: string, newDay: number) => {
    updateBreakupField(breakupId, "day_number", newDay);
    const newDate = getDateForDay(newDay);
    if (newDate) {
      updateBreakupField(breakupId, "service_date", newDate);
    }
  };

  const calculateTotal = (breakup: typeof breakups[0]) => {
    const qty = breakup.quantity || 1;
    const base = breakup.base_cost || 0;
    const discount = breakup.discount_amount || 0;
    const markup = breakup.markup_amount || 0;
    const tax = breakup.tax_amount || 0;
    return base * qty - discount + markup + tax;
  };

  const handleFieldChange = (breakupId: string, field: string, value: number) => {
    updateBreakupField(breakupId, field, value);

    const breakup = breakups.find((b) => b.id === breakupId);
    if (breakup) {
      const updated = { ...breakup, [field]: value };
      const newTotal = calculateTotal(updated);
      updateBreakupField(breakupId, "final_cost", newTotal);
    }
  };

  const details = transferDetails || formData;
  const seasons = details?.seasons || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 p-3">
        {/* Seasonal Rates from Transfer Details */}
        {seasons.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Package Rates
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="p-2 text-left font-medium">Season</th>
                    <th className="p-2 text-center font-medium" colSpan={2}>
                      SIC
                    </th>
                    <th className="p-2 text-center font-medium">PVT (Per Vehicle)</th>
                  </tr>
                  <tr className="bg-muted/10">
                    <th className="p-1"></th>
                    <th className="p-1 text-center text-[10px] text-muted-foreground">Adult</th>
                    <th className="p-1 text-center text-[10px] text-muted-foreground">Child</th>
                    <th className="p-1 text-center text-[10px] text-muted-foreground">Vehicles</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 font-medium">{season.dates || "All Season"}</td>
                      <td className="p-2 text-center">{season.sic_rate_adult || "-"}</td>
                      <td className="p-2 text-center">{season.sic_rate_child || "-"}</td>
                      <td className="p-2 text-center">
                        {season.per_vehicle_rate && season.per_vehicle_rate.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {season.per_vehicle_rate.map((vr: any, vi: number) => (
                              <span key={vi} className="text-[10px]">
                                {vr.vehicle_type}
                                {vr.capacity && ` (${vr.capacity})`}: {vr.rate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <Separator />

        {/* Rate Breakdown */}
        <section className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground">Rate Breakdown</h3>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={addBreakup} disabled={saving}>
              <Plus className="size-3" />
              Add
            </Button>
          </div>
          {breakups.length > 0 ? (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-14 text-center px-1 py-1">Day</TableHead>
                  <TableHead className="w-16 text-center px-1 py-1">Date</TableHead>
                  <TableHead className="px-1 py-1">Service</TableHead>
                  <TableHead className="w-16 text-center px-1 py-1">Type</TableHead>
                  <TableHead className="w-12 text-center px-1 py-1">Unit</TableHead>
                  <TableHead className="w-10 text-center px-1 py-1">Qty</TableHead>
                  <TableHead className="w-14 text-center px-1 py-1">Base</TableHead>
                  <TableHead className="w-14 text-center px-1 py-1">Disc</TableHead>
                  <TableHead className="w-14 text-center px-1 py-1">Mark</TableHead>
                  <TableHead className="w-12 text-center px-1 py-1">Tax</TableHead>
                  <TableHead className="w-14 text-center px-1 py-1">Total</TableHead>
                  <TableHead className="w-8 text-center px-1 py-1"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBreakups.map((b) => {
                  const typeColor = typeColors[b.service_type] || "bg-gray-50 text-gray-700 border-gray-200";
                  const dateStr = b.service_date
                    ? new Date(b.service_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "";
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="px-1 py-1">
                        <Select
                          value={String(b.day_number || 1)}
                          onValueChange={(value) => handleDayChange(b.id, parseInt(value))}
                        >
                          <SelectTrigger className="text-xs w-full px-1" size="xs" variant="cell">
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
                      <TableCell className="text-center px-1 py-1 text-[10px] text-muted-foreground">
                        {dateStr || "-"}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Input
                          type="text"
                          variant="cell"
                          value={b.service_name || ""}
                          onChange={(e) => updateBreakupField(b.id, "service_name", e.target.value)}
                          className="md:text-xs font-medium"
                        />
                      </TableCell>
                      <TableCell className="text-center px-1 py-1">
                        <Badge variant="outline" className={cn("capitalize text-[10px] px-1", typeColor)}>
                          {b.service_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Select
                          value={b.unit_type || "vehicle"}
                          onValueChange={(value) => updateBreakupField(b.id, "unit_type", value)}
                        >
                          <SelectTrigger className="text-xs w-16 px-1" size="xs" variant="cell">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unitTypes.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value} className="text-xs">
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Input
                          type="number"
                          variant="cell"
                          align="center"
                          value={b.quantity || 1}
                          onChange={(e) => handleFieldChange(b.id, "quantity", parseFloat(e.target.value) || 1)}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Input
                          type="number"
                          variant="cell"
                          align="center"
                          value={b.base_cost || 0}
                          onChange={(e) => handleFieldChange(b.id, "base_cost", parseFloat(e.target.value) || 0)}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Input
                          type="number"
                          variant="cell"
                          align="center"
                          value={b.discount_amount || 0}
                          onChange={(e) => handleFieldChange(b.id, "discount_amount", parseFloat(e.target.value) || 0)}
                          className="text-xs text-primary"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Input
                          type="number"
                          variant="cell"
                          align="center"
                          value={b.markup_amount || 0}
                          onChange={(e) => handleFieldChange(b.id, "markup_amount", parseFloat(e.target.value) || 0)}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Input
                          type="number"
                          variant="cell"
                          align="center"
                          value={b.tax_amount || 0}
                          onChange={(e) => handleFieldChange(b.id, "tax_amount", parseFloat(e.target.value) || 0)}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-right px-1 py-1 text-xs font-semibold">
                        {calculateTotal(b).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center px-1 py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(b.id)}
                          disabled={saving}
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
                  <TableCell colSpan={5} className="text-right font-semibold px-1 py-1">
                    Total
                  </TableCell>
                  <TableCell className="text-center font-semibold px-1 py-1">
                    {breakups.reduce((sum, b) => sum + (b.quantity || 0), 0)}
                  </TableCell>
                  <TableCell className="text-center font-semibold px-1 py-1">
                    {breakups.reduce((sum, b) => sum + (b.base_cost || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center font-semibold px-1 py-1 text-primary">
                    {breakups.reduce((sum, b) => sum + (b.discount_amount || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center font-semibold px-1 py-1">
                    {breakups.reduce((sum, b) => sum + (b.markup_amount || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center font-semibold px-1 py-1">
                    {breakups.reduce((sum, b) => sum + (b.tax_amount || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold px-1 py-1">
                    {breakups.reduce((sum, b) => sum + (b.final_cost || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center px-1 py-1"></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
              <p className="text-xs mb-2">No rate breakdown</p>
              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={addBreakup} disabled={saving}>
                <Plus className="size-3" />
                Add First Breakup
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Sticky Save Button */}
      {breakups.length > 0 && (
        <div className="sticky bottom-0 p-2 bg-background border-t justify-end flex">
          <Button size="sm" onClick={handleSaveBreakups} disabled={saving} loading={saving}>
            Save Changes
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Breakup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rate breakup? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteBreakup(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

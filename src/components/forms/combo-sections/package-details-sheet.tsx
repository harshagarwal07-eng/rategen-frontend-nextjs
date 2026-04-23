"use client";

import { Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import S3Image from "@/components/ui/s3-image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IComboItem } from "../schemas/combos-datastore-schema";

interface PackageDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: IComboItem | null;
  isLoading?: boolean;
}

export default function PackageDetailsSheet({
  isOpen,
  onClose,
  item,
  isLoading = false,
}: PackageDetailsSheetProps) {
  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "-";
    return amount.toFixed(2);
  };

  const formatDuration = (pkg: any) => {
    if (!pkg?.duration) return "-";
    const parts = [];
    if (pkg.duration.days) parts.push(`${pkg.duration.days}d`);
    if (pkg.duration.hours) parts.push(`${pkg.duration.hours}h`);
    if (pkg.duration.minutes) parts.push(`${pkg.duration.minutes}m`);
    return parts.length > 0 ? parts.join(" ") : "-";
  };

  const getAgeLabel = (agePolicy: any, bracket: string) => {
    if (!agePolicy?.[bracket]) return null;
    const { min_age, max_age } = agePolicy[bracket];
    return `${bracket.charAt(0).toUpperCase() + bracket.slice(1)} (${min_age}-${max_age})`;
  };

  if (!item) return null;

  const sourcePackage = item.source_package;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isLoading ? (
        <SheetContent side="right" className="w-[90vw] sm:max-w-[90vw] p-0">
          <SheetHeader className="px-6 py-4 border-b bg-muted/30">
            <SheetTitle className="flex items-center gap-3">
              <span>{item.package_name}</span>
              <Badge variant={item.item_type === "tour" ? "default" : "secondary"}>
                {item.item_type === "tour" ? "Tour" : "Transfer"}
              </Badge>
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {item.item_type === "tour" ? item.tour_name : item.transfer_name}
            </p>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center h-[calc(100vh-100px)]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading package details...</p>
            </div>
          </div>
        </SheetContent>
      ) : (
      <SheetContent side="right" className="w-[90vw] sm:max-w-[90vw] p-0">
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <SheetTitle className="flex items-center gap-3">
            <span>{item.package_name}</span>
            <Badge variant={item.item_type === "tour" ? "default" : "secondary"}>
              {item.item_type === "tour" ? "Tour" : "Transfer"}
            </Badge>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {item.item_type === "tour" ? item.tour_name : item.transfer_name}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6">
            {sourcePackage ? (
              <Card className="overflow-hidden pb-0">
                <CardContent className="space-y-6">
                  {/* Top Section: Details & Operational */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Details */}
                    <div className="lg:col-span-2 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                        <p className="text-sm leading-relaxed">
                          {sourcePackage.description || "No description available."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Inclusions</h4>
                          {sourcePackage.inclusions ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                              {(typeof sourcePackage.inclusions === "string"
                                ? sourcePackage.inclusions.split(",")
                                : sourcePackage.inclusions
                              ).map((inc: string, i: number) => (
                                <li key={i} className="leading-snug">
                                  {inc.trim()}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm">-</p>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Exclusions</h4>
                          {sourcePackage.exclusions ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                              {(typeof sourcePackage.exclusions === "string"
                                ? sourcePackage.exclusions.split(",")
                                : sourcePackage.exclusions
                              ).map((exc: string, i: number) => (
                                <li key={i} className="leading-snug">
                                  {exc.trim()}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm">-</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 p-4 bg-muted/20 rounded-lg border border-border/50">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Meeting Point
                          </h4>
                          <p className="text-sm font-medium">{sourcePackage.meeting_point || "-"}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Pickup / Dropoff
                          </h4>
                          <p className="text-sm font-medium">
                            {sourcePackage.pickup_point || "-"} / {sourcePackage.dropoff_point || "-"}
                          </p>
                        </div>
                      </div>

                      {sourcePackage.notes && (
                        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded text-amber-900 text-sm">
                          <span className="font-medium">Note:</span> {sourcePackage.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Operational Info */}
                    <div className="space-y-6 pl-0 lg:pl-6 lg:border-l">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Operational Hours
                        </h4>
                        {sourcePackage.operational_hours && sourcePackage.operational_hours.length > 0 ? (
                          <div className="space-y-1.5">
                            {sourcePackage.operational_hours.map((h: any, i: number) => (
                              <div key={i} className="text-sm flex justify-between">
                                <span className="font-medium w-12">{h.day.slice(0, 3)}</span>
                                <span className="text-muted-foreground">
                                  {h.time_start} - {h.time_end}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Not specified</p>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{formatDuration(sourcePackage)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Max Participants</span>
                          <span className="font-medium">{sourcePackage.max_participants || "-"}</span>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Age Policy</h4>
                        <div className="flex flex-wrap gap-2">
                          {sourcePackage.age_policy && Object.keys(sourcePackage.age_policy).length > 0 ? (
                            ["adult", "teenager", "child", "infant"].map((bracket) => {
                              const label = getAgeLabel(sourcePackage.age_policy, bracket);
                              if (!label) return null;
                              return (
                                <Badge key={bracket} variant="outline" className="font-normal bg-background">
                                  {label}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Not specified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Seasons Table */}
                  <div className="my-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Seasons & Rates</h4>
                    {sourcePackage.seasons && sourcePackage.seasons.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        {(() => {
                          const agePolicy = sourcePackage.age_policy || {};
                          const hasAgePolicy = Object.keys(agePolicy).length > 0;
                          const showAdult = hasAgePolicy ? !!agePolicy.adult : false;
                          const showTeenager = hasAgePolicy ? !!agePolicy.teenager : false;
                          const showChild = hasAgePolicy ? !!agePolicy.child : false;
                          const showInfant = hasAgePolicy ? !!agePolicy.infant : false;
                          const rateColumnCount =
                            (showAdult ? 1 : 0) + (showTeenager ? 1 : 0) + (showChild ? 1 : 0) + (showInfant ? 1 : 0);

                          return (
                            <Table>
                              <TableHeader className="bg-muted/30">
                                <TableRow>
                                  <TableHead className="w-[180px]">Season Dates</TableHead>
                                  <TableHead className="w-[150px]">Rate Type</TableHead>
                                  {hasAgePolicy ? (
                                    <>
                                      {showAdult && <TableHead className="text-right">Adult</TableHead>}
                                      {showTeenager && <TableHead className="text-right">Teenager</TableHead>}
                                      {showChild && <TableHead className="text-right">Child</TableHead>}
                                      {showInfant && <TableHead className="text-right">Infant</TableHead>}
                                    </>
                                  ) : (
                                    <TableHead className="text-right">Rate</TableHead>
                                  )}
                                  <TableHead className="text-right font-bold bg-muted/10">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {[...sourcePackage.seasons]
                                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                                  .map((season: any, sIdx: number) => {
                                    const rows = [];
                                    const hasRates = (...rates: (number | undefined)[]) =>
                                      rates.some((r) => r !== undefined && r !== null);

                                    // Ticket Only Rates
                                    const ticketRates = [
                                      showAdult ? season.ticket_only_rate_adult : undefined,
                                      showTeenager ? season.ticket_only_rate_teenager : undefined,
                                      showChild ? season.ticket_only_rate_child : undefined,
                                      showInfant ? season.ticket_only_rate_infant : undefined,
                                    ].filter((r) => r !== undefined);

                                    if (hasAgePolicy && ticketRates.length > 0 && hasRates(...ticketRates)) {
                                      rows.push(
                                        <TableRow key={`${sIdx}-ticket`}>
                                          <TableCell className="font-medium text-sm align-top">
                                            <div>
                                              {season.dates || "All Season"}
                                              {season.blackout_dates && (
                                                <div className="text-xs text-destructive mt-1">
                                                  Blackout: {season.blackout_dates}
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">Ticket Only</TableCell>
                                          {showAdult && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.ticket_only_rate_adult)}
                                            </TableCell>
                                          )}
                                          {showTeenager && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.ticket_only_rate_teenager)}
                                            </TableCell>
                                          )}
                                          {showChild && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.ticket_only_rate_child)}
                                            </TableCell>
                                          )}
                                          {showInfant && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.ticket_only_rate_infant)}
                                            </TableCell>
                                          )}
                                          <TableCell className="text-right font-bold tabular-nums bg-muted/5">-</TableCell>
                                        </TableRow>
                                      );
                                    }

                                    // SIC Rates
                                    const sicRates = [
                                      showAdult ? season.sic_rate_adult : undefined,
                                      showTeenager ? season.sic_rate_teenager : undefined,
                                      showChild ? season.sic_rate_child : undefined,
                                      showInfant ? season.sic_rate_infant : undefined,
                                    ].filter((r) => r !== undefined);

                                    if (hasAgePolicy && sicRates.length > 0 && hasRates(...sicRates)) {
                                      rows.push(
                                        <TableRow key={`${sIdx}-sic`}>
                                          <TableCell className="font-medium text-sm align-top">
                                            {rows.length === 0 ? season.dates || "All Season" : ""}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">SIC (Shared)</TableCell>
                                          {showAdult && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.sic_rate_adult)}
                                            </TableCell>
                                          )}
                                          {showTeenager && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.sic_rate_teenager)}
                                            </TableCell>
                                          )}
                                          {showChild && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.sic_rate_child)}
                                            </TableCell>
                                          )}
                                          {showInfant && (
                                            <TableCell className="text-right tabular-nums">
                                              {formatAmount(season.sic_rate_infant)}
                                            </TableCell>
                                          )}
                                          <TableCell className="text-right font-bold tabular-nums bg-muted/5">-</TableCell>
                                        </TableRow>
                                      );
                                    }

                                    // Private Rates (Per Pax)
                                    if (season.pvt_rate) {
                                      Object.entries(season.pvt_rate).forEach(([pax, rate]) => {
                                        rows.push(
                                          <TableRow key={`${sIdx}-pvt-${pax}`}>
                                            <TableCell className="font-medium text-sm align-top">
                                              {rows.length === 0 ? season.dates || "All Season" : ""}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                              Private ({pax} Pax)
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums" colSpan={rateColumnCount || 1}>
                                              <span className="text-xs text-muted-foreground mr-2">Per Person:</span>
                                              {formatAmount(rate as number)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold tabular-nums bg-muted/5">-</TableCell>
                                          </TableRow>
                                        );
                                      });
                                    }

                                    // Private Rates (Per Vehicle)
                                    if (season.per_vehicle_rate && season.per_vehicle_rate.length > 0) {
                                      season.per_vehicle_rate.forEach((vehicle: any, vIdx: number) => {
                                        rows.push(
                                          <TableRow key={`${sIdx}-vehicle-${vIdx}`}>
                                            <TableCell className="font-medium text-sm align-top">
                                              {rows.length === 0 ? season.dates || "All Season" : ""}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                              Private - {vehicle.vehicle_type || vehicle.brand || "Vehicle"}
                                              {vehicle.capacity && <span className="text-xs ml-1">({vehicle.capacity})</span>}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums" colSpan={rateColumnCount || 1}>
                                              -
                                            </TableCell>
                                            <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                              {formatAmount(vehicle.rate)}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      });
                                    }

                                    // Fallback if no rates
                                    if (rows.length === 0) {
                                      rows.push(
                                        <TableRow key={`${sIdx}-empty`}>
                                          <TableCell className="font-medium text-sm">
                                            <div>
                                              {season.dates || "All Season"}
                                              {season.blackout_dates && (
                                                <div className="text-xs text-destructive mt-1">
                                                  Blackout: {season.blackout_dates}
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell
                                            className="text-muted-foreground text-sm italic"
                                            colSpan={(rateColumnCount || 1) + 1}
                                          >
                                            No rates configured
                                          </TableCell>
                                          <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                            {season.total_rate ? formatAmount(season.total_rate) : "-"}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }

                                    return rows;
                                  })}
                              </TableBody>
                            </Table>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                        No seasons configured
                      </div>
                    )}
                  </div>

                  {/* Package Add-ons Section */}
                  {sourcePackage.selected_add_ons && sourcePackage.selected_add_ons.length > 0 && (
                    <div className="my-6 pt-6 border-t">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Package Add-ons</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sourcePackage.selected_add_ons.map((addOn: any, addOnIdx: number) => (
                          <div
                            key={addOnIdx}
                            className="p-3 bg-muted/10 rounded-lg border hover:border-primary/20 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-semibold text-sm">{addOn.name}</h5>
                              {addOn.is_mandatory && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Mandatory
                                </Badge>
                              )}
                            </div>
                            {addOn.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{addOn.description}</p>
                            )}
                            <div className="flex gap-3 text-xs">
                              {addOn.ticket_only_rate_adult !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">Adult: </span>
                                  <span className="font-medium">{formatAmount(addOn.ticket_only_rate_adult)}</span>
                                </div>
                              )}
                              {addOn.ticket_only_rate_child !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">Child: </span>
                                  <span className="font-medium">{formatAmount(addOn.ticket_only_rate_child)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Package Images Section */}
                  {sourcePackage.images && sourcePackage.images.length > 0 && (
                    <div className="my-6 pt-6 border-t">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Package Images</h4>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {sourcePackage.images.map((image: string, imgIdx: number) => (
                          <div key={imgIdx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                            <S3Image url={image} index={imgIdx} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                No package details available
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
      )}
    </Sheet>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Edit,
  MapPin,
  Clock,
  CreditCard,
  Info,
  Shield,
  X,
  Car,
  Route,
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  Package,
} from "lucide-react";
import { ITransferAddOn, ISeason, IOperationalHours } from "./schemas/transfers-datastore-schema";

// Flexible package type that works with both Transfer and ITransfersDatastore
type TransferViewPackage = {
  id?: string;
  transfer_id?: string;
  name: string;
  description?: string;
  remarks?: string;
  notes?: string;
  inclusions?: string;
  exclusions?: string;
  preferred?: boolean;
  iscombo?: boolean;
  order?: number;
  origin?: string;
  destination?: string;
  num_stops?: number;
  via?: string;
  duration?: { days?: number; hours?: number; minutes?: number };
  meeting_point?: string;
  pickup_point?: string;
  dropoff_point?: string;
  images?: string[];
  operational_hours?: IOperationalHours[];
  selected_add_ons?: any[];
  seasons?: ISeason[];
  transfer_type?: string[];
};

// Transfer type label mapping
const TRANSFER_TYPE_LABELS: Record<string, string> = {
  airport_to_hotel: "Airport → Hotel",
  hotel_to_airport: "Hotel → Airport",
  airport_to_port: "Airport → Port",
  port_to_airport: "Port → Airport",
  port_to_hotel: "Port → Hotel",
  hotel_to_port: "Hotel → Port",
  station_to_hotel: "Station → Hotel",
  hotel_to_station: "Hotel → Station",
  hotel_to_tour: "Hotel → Tour",
  tour_to_hotel: "Tour → Hotel",
  tour_to_tour: "Tour → Tour",
  inter_city: "Inter-City",
  hotel_to_hotel: "Hotel → Hotel",
};

// Flexible type that works with both Transfer and ITransfersDatastore
type TransferViewData = {
  id?: string;
  transfer_name?: string;
  description?: string;
  mode?: string;
  preferred?: boolean;
  markup?: number;
  rule?: string;
  raw_rates?: string;
  cancellation_policy?: string;
  remarks?: string;
  currency?: string;
  country?: string;
  city?: string;
  images?: string[];
  examples?: string;
  packages?: TransferViewPackage[];
  add_ons?: ITransferAddOn[];
  city_name?: string;
  country_name?: string;
};
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import S3Image from "@/components/ui/s3-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import RategenMarkdown from "../ui/rategen-markdown";

interface TransferFullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  transferData: TransferViewData | null;
  onEdit?: () => void;
  isLoading?: boolean;
}

const TABS = [
  { id: "packages", title: "Packages & Rates" },
  { id: "general", title: "General Info" },
  { id: "policies", title: "Policies & Add-ons" },
];

export default function TransferFullscreenView({
  isOpen,
  onClose,
  transferData,
  onEdit,
  isLoading = false,
}: TransferFullscreenViewProps) {
  // Accordion state for each tab
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("packages");

  // Generate accordion IDs based on tab content
  const accordionIds = useMemo(() => {
    const ids: Record<string, string[]> = {
      packages: transferData?.packages?.map((_, idx) => `package-${idx}`) || [],
      general: ["images", "basic-details", "description", "examples"],
      policies: ["policies", "add-ons"],
    };
    return ids;
  }, [transferData?.packages]);

  const expandAll = (tab: string) => {
    setOpenAccordions((prev) => {
      const tabIds = accordionIds[tab] || [];
      const otherIds = prev.filter((id) => !tabIds.some((tabId) => id === tabId));
      return [...otherIds, ...tabIds];
    });
  };

  const collapseAll = (tab: string) => {
    setOpenAccordions((prev) => {
      const tabIds = accordionIds[tab] || [];
      return prev.filter((id) => !tabIds.some((tabId) => id === tabId));
    });
  };

  // Show loading state when dialog is open but data is still loading
  if (isLoading || !transferData) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Loading Transfer</DialogTitle>

          {/* Header Skeleton */}
          <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-4">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-center gap-8">
                <Skeleton className="h-8 w-24" />
                <Button variant="destructive" size="icon" onClick={onClose} className="size-7">
                  <span className="sr-only">Close</span>
                  <X />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Loading Content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading transfer details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "-";
    return amount.toFixed(2);
  };

  const formatDuration = (duration: any) => {
    if (!duration) return "-";
    const parts = [];
    if (duration.days) parts.push(`${duration.days}d`);
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    return parts.length > 0 ? parts.join(" ") : "-";
  };

  const resolveAddOn = (addOn: any) => {
    if (!addOn) return null;
    // If it's a string id
    if (typeof addOn === "string") {
      return transferData.add_ons?.find((a) => a.id === addOn) || { id: addOn };
    }

    // If it's an object with id, try to find the full add-on record
    if (addOn.id) {
      return transferData.add_ons?.find((a) => a.id === addOn.id) || addOn;
    }

    // Otherwise assume it's already the full object
    return addOn;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{transferData.transfer_name}</DialogTitle>

        {/* Header */}
        <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight">{transferData.transfer_name}</h1>
              {transferData.preferred && (
                <Badge
                  variant="default"
                  className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs"
                >
                  Preferred
                </Badge>
              )}
              {transferData.mode && (
                <Badge variant="outline" className="text-xs">
                  {transferData.mode}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-8">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-8 text-xs">
                  <Edit className="w-3 h-3" />
                  Edit Transfer
                </Button>
              )}
              <Button variant="destructive" size="icon" onClick={onClose} className="size-7">
                <span className="sr-only">Close</span>
                <X />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            {/* Custom Tabs Navigation */}
            <div className="border-b bg-background px-6 py-2 sticky top-0 z-10">
              <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                <TabsList className="bg-muted p-1 h-auto rounded-lg">
                  {TABS.map((tab, index) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2 px-4 py-2 rounded-md transition-all"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-muted-foreground/20 text-muted-foreground group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground">
                        {index + 1}
                      </span>
                      <span>{tab.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandAll(activeTab)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => collapseAll(activeTab)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5 rotate-90" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="max-w-7xl mx-auto py-6 pb-20 space-y-6">
                {/* Packages Tab */}
                <TabsContent value="packages" className="mt-0 space-y-6">
                  {transferData.packages && transferData.packages.length > 0 ? (
                    <Accordion
                      type="multiple"
                      value={openAccordions}
                      onValueChange={setOpenAccordions}
                      className="space-y-4"
                    >
                      {[...transferData.packages]
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((pkg, pkgIndex) => (
                          <AccordionItem
                            key={pkgIndex}
                            value={`package-${pkgIndex}`}
                            className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                          >
                            <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3 justify-between w-full">
                                  <div className="flex items-center gap-6">
                                    <h3 className="text-lg font-semibold">{pkg.name}</h3>
                                    <div className="flex gap-2">
                                      {pkg.preferred && (
                                        <Badge variant="secondary" className="text-[10px]">
                                          Preferred
                                        </Badge>
                                      )}
                                      {pkg.iscombo && (
                                        <Badge variant="outline" className="text-[10px]">
                                          Combo
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="text-[10px]">
                                        {pkg.seasons?.length || 0} Season{pkg.seasons?.length !== 1 ? "s" : ""}
                                      </Badge>
                                    </div>
                                  </div>
                                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                              <div className="space-y-6">
                                {/* Top Section: Details & Operational */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                  {/* Left: Details */}
                                  <div className="lg:col-span-2 space-y-4">
                                    {/* Transfer Types */}
                                    {pkg.transfer_type && pkg.transfer_type.length > 0 && (
                                      <div className="flex items-center gap-3 pb-4 border-b mt-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                          Transfer Type:
                                        </span>
                                        <div className="flex gap-2 flex-wrap">
                                          {pkg.transfer_type.map((type) => (
                                            <Badge
                                              key={type}
                                              variant="outline"
                                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                            >
                                              {TRANSFER_TYPE_LABELS[type] || type}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div>
                                      <h4 className="text-sm font-medium text-primary mb-1">Description</h4>
                                      <RategenMarkdown
                                        content={pkg.description || "No description available."}
                                        className="text-sm"
                                      />
                                    </div>

                                    {/* Route Details */}
                                    {(pkg.origin || pkg.destination || pkg.via) && (
                                      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                          <Route className="w-4 h-4" /> Route Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <span className="text-xs text-muted-foreground">Origin</span>
                                            <p className="text-sm font-medium">{pkg.origin || "-"}</p>
                                          </div>
                                          <div>
                                            <span className="text-xs text-muted-foreground">Destination</span>
                                            <p className="text-sm font-medium">{pkg.destination || "-"}</p>
                                          </div>
                                          {pkg.via && (
                                            <div className="col-span-2">
                                              <span className="text-xs text-muted-foreground">Via</span>
                                              <p className="text-sm font-medium">{pkg.via}</p>
                                            </div>
                                          )}
                                          {pkg.num_stops !== undefined && pkg.num_stops > 0 && (
                                            <div>
                                              <span className="text-xs text-muted-foreground">Stops</span>
                                              <p className="text-sm font-medium">{pkg.num_stops}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-6">
                                      <div>
                                        <h4 className="text-sm font-medium text-primary mb-1">Inclusions</h4>
                                        {pkg.inclusions ? (
                                          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                                            {pkg.inclusions.split(",").map((item: string, i: number) => (
                                              <li key={i} className="leading-snug">
                                                {item.trim()}
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-sm">-</p>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-primary mb-1">Exclusions</h4>
                                        {pkg.exclusions ? (
                                          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                                            {pkg.exclusions.split(",").map((item: string, i: number) => (
                                              <li key={i} className="leading-snug">
                                                {item.trim()}
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-sm">-</p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6 p-4 bg-muted/20 rounded-lg border border-border/50">
                                      <div>
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                          Meeting Point
                                        </h4>
                                        <p className="text-sm font-medium">{pkg.meeting_point || "-"}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                          Pick-up Point
                                        </h4>
                                        <p className="text-sm font-medium">{pkg.pickup_point || "-"}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                          Drop-off Point
                                        </h4>
                                        <p className="text-sm font-medium">{pkg.dropoff_point || "-"}</p>
                                      </div>
                                    </div>

                                    {pkg.remarks && (
                                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-900 text-sm">
                                        <span className="font-medium">AI Remarks:</span>
                                        <RategenMarkdown content={pkg.remarks} className="text-sm" />
                                      </div>
                                    )}

                                    {pkg.notes && (
                                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-900 text-sm">
                                        <span className="font-medium">Note:</span>
                                        <RategenMarkdown content={pkg.notes} className="text-sm" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Right: Operational Info */}
                                  <div className="space-y-6 pl-0 lg:pl-6 lg:border-l">
                                    <div>
                                      <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                                        Operational Hours
                                      </h4>
                                      {pkg.operational_hours && pkg.operational_hours.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {pkg.operational_hours.map((h: any, i: number) => (
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
                                        <span className="font-medium">{formatDuration(pkg.duration)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom: Seasons Table */}
                                <div className="my-6">
                                  <h4 className="text-sm font-medium text-primary mb-3">Seasons & Rates</h4>
                                  {pkg.seasons && pkg.seasons.length > 0 ? (
                                    <div className="rounded-lg border overflow-hidden">
                                      <Table>
                                        <TableHeader className="bg-muted/30">
                                          <TableRow>
                                            <TableHead className="w-[180px]">Season Dates</TableHead>
                                            <TableHead className="w-[150px]">Rate Type</TableHead>
                                            <TableHead className="text-right">Adult</TableHead>
                                            <TableHead className="text-right">Child</TableHead>
                                            <TableHead className="text-right">Max Pax</TableHead>
                                            <TableHead className="text-right">Max Lug</TableHead>
                                            <TableHead className="text-right font-bold bg-muted/10">Rate</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {[...pkg.seasons]
                                            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                                            .map((season, sIdx) => {
                                              const rows = [];

                                              // Helper to check if any rate exists in a set
                                              const hasRates = (...rates: (number | undefined)[]) =>
                                                rates.some((r) => r !== undefined && r !== null);

                                              // 1. SIC Rates
                                              if (hasRates(season.sic_rate_adult, season.sic_rate_child)) {
                                                rows.push(
                                                  <TableRow key={`${sIdx}-sic`}>
                                                    <TableCell className="font-medium text-sm align-top">
                                                      <div>
                                                        {season.dates || "All Season"}
                                                        {season.blackout_dates && (
                                                          <div className="text-xs text-destructive mt-1">
                                                            Blackout: {season.blackout_dates}
                                                          </div>
                                                        )}
                                                        {season.exception_rules && (
                                                          <div className="text-xs text-info mt-1">
                                                            Exception: {season.exception_rules}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                      SIC (Shared)
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(season.sic_rate_adult)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(season.sic_rate_child)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {season.sic_max_passengers || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {season.sic_max_luggage || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                                      -
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }

                                              // 2. Private Rates (Per Pax)
                                              if (season.pvt_rate) {
                                                Object.entries(season.pvt_rate).forEach(([pax, rate]) => {
                                                  rows.push(
                                                    <TableRow key={`${sIdx}-pvt-${pax}`}>
                                                      <TableCell className="font-medium text-sm align-top">
                                                        {rows.length === 0 ? season.dates || "All Season" : ""}
                                                      </TableCell>
                                                      <TableCell className="text-muted-foreground text-sm">
                                                        Private ({pax})
                                                      </TableCell>
                                                      <TableCell className="text-right tabular-nums" colSpan={4}>
                                                        <span className="text-xs text-muted-foreground mr-2">
                                                          Per Person:
                                                        </span>
                                                        {formatAmount(rate as number)}
                                                      </TableCell>
                                                      <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                                        -
                                                      </TableCell>
                                                    </TableRow>
                                                  );
                                                });
                                              }

                                              // 3. Private Rates (Per Vehicle)
                                              if (season.per_vehicle_rate && season.per_vehicle_rate.length > 0) {
                                                season.per_vehicle_rate.forEach((vehicle: any, vIdx: number) => {
                                                  rows.push(
                                                    <TableRow key={`${sIdx}-vehicle-${vIdx}`}>
                                                      <TableCell className="font-medium text-sm align-top">
                                                        {rows.length === 0 ? season.dates || "All Season" : ""}
                                                      </TableCell>
                                                      <TableCell className="text-muted-foreground text-sm">
                                                        {vehicle.vehicle_type || "Vehicle"}
                                                        {vehicle.brand && (
                                                          <span className="text-xs ml-1">({vehicle.brand})</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="text-right tabular-nums" colSpan={2}>
                                                        -
                                                      </TableCell>
                                                      <TableCell className="text-right tabular-nums">
                                                        {vehicle.max_passengers || "-"}
                                                      </TableCell>
                                                      <TableCell className="text-right tabular-nums">
                                                        {vehicle.max_luggage || "-"}
                                                      </TableCell>
                                                      <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                                        {formatAmount(vehicle.rate)}
                                                      </TableCell>
                                                    </TableRow>
                                                  );
                                                });
                                              }

                                              // Fallback if no specific rates found
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
                                                        {season.exception_rules && (
                                                          <div className="text-xs text-info mt-1">
                                                            Exception: {season.exception_rules}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">-</TableCell>
                                                    <TableCell className="text-right tabular-nums">-</TableCell>
                                                    <TableCell className="text-right tabular-nums">-</TableCell>
                                                    <TableCell className="text-right tabular-nums">-</TableCell>
                                                    <TableCell className="text-right tabular-nums">-</TableCell>
                                                    <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                                      -
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }

                                              return rows;
                                            })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                                      No seasons configured
                                    </div>
                                  )}
                                </div>

                                {/* Package Add-ons Section */}
                                {pkg.selected_add_ons && pkg.selected_add_ons.length > 0 && (
                                  <div className="my-6 pt-6 border-t">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Package Add-ons</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {pkg.selected_add_ons.map((addOn: any, addOnIdx: number) => {
                                        const resolved = resolveAddOn(addOn) || {};
                                        const name = addOn.name || resolved.name || resolved.id || "-";
                                        const description = addOn.description || resolved.description;
                                        const isMandatory = addOn.is_mandatory;
                                        const rateAdult = addOn.rate_adult ?? resolved.rate_adult;
                                        const rateChild = addOn.rate_child ?? resolved.rate_child;
                                        const totalRate = addOn.total_rate ?? resolved.total_rate;
                                        const maxParticipants = addOn.max_participants ?? resolved.max_participants;

                                        return (
                                          <div
                                            key={addOnIdx}
                                            className="p-3 bg-muted/10 rounded-lg border hover:border-primary/20 transition-colors"
                                          >
                                            <div className="flex justify-between items-start mb-1">
                                              <h5 className="font-semibold text-sm">{name}</h5>
                                              {isMandatory && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                  Mandatory
                                                </Badge>
                                              )}
                                            </div>
                                            {description && (
                                              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                                {description}
                                              </p>
                                            )}
                                            <div className="flex gap-3 text-xs items-center">
                                              {rateAdult !== undefined && (
                                                <div>
                                                  <span className="text-muted-foreground">Adult: </span>
                                                  <span className="font-medium">{formatAmount(rateAdult)}</span>
                                                </div>
                                              )}
                                              {rateChild !== undefined && (
                                                <div>
                                                  <span className="text-muted-foreground">Child: </span>
                                                  <span className="font-medium">{formatAmount(rateChild)}</span>
                                                </div>
                                              )}
                                              {totalRate !== undefined && (
                                                <div>
                                                  <span className="text-muted-foreground">Total: </span>
                                                  <span className="font-medium">{formatAmount(totalRate)}</span>
                                                </div>
                                              )}
                                              {maxParticipants !== undefined && (
                                                <div>
                                                  <span className="text-muted-foreground">Max: </span>
                                                  <span className="font-medium">{maxParticipants}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Package Images Section */}
                                {pkg.images && pkg.images.length > 0 && (
                                  <div className="my-6 pt-6 border-t">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Package Images</h4>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                      {pkg.images.map((image: string, imgIdx: number) => (
                                        <div
                                          key={imgIdx}
                                          className="relative aspect-square rounded-lg overflow-hidden border"
                                        >
                                          <S3Image url={image} index={imgIdx} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                      No packages configured for this transfer.
                    </div>
                  )}
                </TabsContent>

                {/* General Info Tab */}
                <TabsContent value="general" className="mt-0 space-y-6">
                  <Accordion
                    type="multiple"
                    value={openAccordions}
                    onValueChange={setOpenAccordions}
                    className="space-y-4"
                  >
                    {/* Images */}
                    <AccordionItem
                      value="images"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold">Images</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {transferData.images?.length || 0} Image{transferData.images?.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {transferData.images && transferData.images.length > 0 ? (
                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin pt-2">
                            {transferData.images.map((image, index) => (
                              <div
                                key={index}
                                className="relative flex-shrink-0 w-64 h-40 bg-muted overflow-hidden rounded-lg border"
                              >
                                <S3Image url={image} index={index} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-40 flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed mt-2">
                            No images available
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Basic Details */}
                    <AccordionItem
                      value="basic-details"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Basic Details</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-2">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Location</span>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {[transferData.city_name, transferData.country_name].filter(Boolean).join(", ") ||
                                    "-"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Mode of Transport</span>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{transferData.mode || "-"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Currency</span>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{transferData.currency || "-"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Markup</span>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                {transferData.markup ? `${transferData.markup}%` : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Description */}
                    <AccordionItem
                      value="description"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Description</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <p className="text-sm leading-relaxed text-foreground/90 pt-2">
                          {transferData.description || "No description available."}
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Examples */}
                    {transferData.examples && (
                      <AccordionItem
                        value="examples"
                        className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                      >
                        <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Info className="w-5 h-5 text-primary" />
                              <span className="text-lg font-semibold">Examples</span>
                            </div>
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap pt-2">
                            {transferData.examples}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </TabsContent>

                {/* Policies & Add-ons Tab */}
                <TabsContent value="policies" className="mt-0 space-y-6">
                  <Accordion
                    type="multiple"
                    value={openAccordions}
                    onValueChange={setOpenAccordions}
                    className="space-y-4"
                  >
                    {/* Policies */}
                    <AccordionItem
                      value="policies"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Policies</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 pt-2">
                          <div>
                            <h4 className="text-sm font-medium text-primary">Rules</h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {transferData.rule || "No rules specified."}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-primary">Cancellation Policy</h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {transferData.cancellation_policy || "No cancellation policy specified."}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-primary">AI Remarks</h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {transferData.remarks || "No remarks specified."}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Global Add-ons */}
                    <AccordionItem
                      value="add-ons"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold">Global Add-ons</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {transferData.add_ons?.length || 0} Add-on{transferData.add_ons?.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {transferData.add_ons && transferData.add_ons.length > 0 ? (
                          <div className="space-y-6 pt-2">
                            {transferData.add_ons.map((addOn, index) => (
                              <div
                                key={index}
                                className="p-6 bg-muted/10 rounded-lg border hover:border-primary/20 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-semibold text-lg mb-1">{addOn.name}</h4>
                                    {addOn.description && (
                                      <p className="text-sm text-muted-foreground">{addOn.description}</p>
                                    )}
                                  </div>
                                  {addOn.is_mandatory && (
                                    <Badge variant="secondary" className="text-xs">
                                      Mandatory
                                    </Badge>
                                  )}
                                </div>

                                {/* Age Policy */}
                                {addOn.age_policy &&
                                  Object.keys(addOn.age_policy).some(
                                    (k) => addOn.age_policy?.[k as keyof typeof addOn.age_policy]
                                  ) && (
                                    <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
                                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                        Age Policy
                                      </h5>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {addOn.age_policy.adult && (
                                          <div className="text-sm">
                                            <span className="font-medium">Adult:</span>{" "}
                                            {addOn.age_policy.adult.min_age !== undefined &&
                                            addOn.age_policy.adult.max_age !== undefined
                                              ? `${addOn.age_policy.adult.min_age}-${addOn.age_policy.adult.max_age}`
                                              : addOn.age_policy.adult.min_age !== undefined
                                              ? `${addOn.age_policy.adult.min_age}+`
                                              : "-"}
                                          </div>
                                        )}
                                        {addOn.age_policy.teenager && (
                                          <div className="text-sm">
                                            <span className="font-medium">Teenager:</span>{" "}
                                            {addOn.age_policy.teenager.min_age !== undefined &&
                                            addOn.age_policy.teenager.max_age !== undefined
                                              ? `${addOn.age_policy.teenager.min_age}-${addOn.age_policy.teenager.max_age}`
                                              : "-"}
                                          </div>
                                        )}
                                        {addOn.age_policy.child && (
                                          <div className="text-sm">
                                            <span className="font-medium">Child:</span>{" "}
                                            {addOn.age_policy.child.min_age !== undefined &&
                                            addOn.age_policy.child.max_age !== undefined
                                              ? `${addOn.age_policy.child.min_age}-${addOn.age_policy.child.max_age}`
                                              : "-"}
                                          </div>
                                        )}
                                        {addOn.age_policy.infant && (
                                          <div className="text-sm">
                                            <span className="font-medium">Infant:</span>{" "}
                                            {addOn.age_policy.infant.min_age !== undefined &&
                                            addOn.age_policy.infant.max_age !== undefined
                                              ? `${addOn.age_policy.infant.min_age}-${addOn.age_policy.infant.max_age}`
                                              : "-"}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Rates */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                                  {addOn.rate_adult !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Adult
                                      </span>
                                      <span className="font-semibold text-sm">{formatAmount(addOn.rate_adult)}</span>
                                    </div>
                                  )}
                                  {addOn.rate_teenager !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Teenager
                                      </span>
                                      <span className="font-semibold text-sm">{formatAmount(addOn.rate_teenager)}</span>
                                    </div>
                                  )}
                                  {addOn.rate_child !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Child
                                      </span>
                                      <span className="font-semibold text-sm">{formatAmount(addOn.rate_child)}</span>
                                    </div>
                                  )}
                                  {addOn.rate_infant !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Infant
                                      </span>
                                      <span className="font-semibold text-sm">{formatAmount(addOn.rate_infant)}</span>
                                    </div>
                                  )}
                                  {addOn.total_rate !== undefined && (
                                    <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Total Rate
                                      </span>
                                      <span className="font-semibold text-sm">{formatAmount(addOn.total_rate)}</span>
                                    </div>
                                  )}
                                  {addOn.max_participants !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Max Pax
                                      </span>
                                      <span className="font-semibold text-sm">{addOn.max_participants}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Remarks and Notes */}
                                {addOn.remarks && (
                                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded text-blue-900 text-sm mb-3">
                                    <span className="font-medium">AI Remarks:</span> {addOn.remarks}
                                  </div>
                                )}
                                {addOn.notes && (
                                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded text-amber-900 text-sm">
                                    <span className="font-medium">Notes:</span> {addOn.notes}
                                  </div>
                                )}

                                {/* Add-on Images */}
                                {addOn.images && addOn.images.length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                      Images
                                    </h5>
                                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                      {addOn.images.map((image, imgIdx) => (
                                        <div
                                          key={imgIdx}
                                          className="relative aspect-square rounded-lg overflow-hidden border"
                                        >
                                          <S3Image url={image} index={imgIdx} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm mt-2">
                            No add-ons configured for this transfer.
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

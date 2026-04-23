"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, MapPin, Clock, Globe, CreditCard, X, Map, Navigation, ChevronDown, ChevronsUpDown } from "lucide-react";
import { IToursDatastore } from "./schemas/tours-datastore-schema";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import S3Image from "@/components/ui/s3-image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { getCategoryLabel } from "@/data/tour-categories";
import RategenMarkdown from "../ui/rategen-markdown";

interface TourFullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  tourData:
    | (IToursDatastore & {
        city_name?: string;
        country_name?: string;
      })
    | null;
  onEdit?: () => void;
  isLoading?: boolean;
}

const TABS = [
  { id: "packages", title: "Packages & Rates" },
  { id: "general", title: "General Info" },
  { id: "policies", title: "Policies & Add-ons" },
];

export default function TourFullscreenView({
  isOpen,
  onClose,
  tourData,
  onEdit,
  isLoading = false,
}: TourFullscreenViewProps) {
  // Accordion state for each tab
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("packages");

  // Generate accordion IDs based on tab content
  const accordionIds = useMemo(() => {
    const ids: Record<string, string[]> = {
      packages: tourData?.packages?.map((_, idx) => `package-${idx}`) || [],
      general: ["images", "basic-details", "notes"],
      policies: ["policies", "add-ons"],
    };
    return ids;
  }, [tourData?.packages]);

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
  if (isLoading || !tourData) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Loading Tour</DialogTitle>

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
              <p className="text-sm text-muted-foreground">Loading tour details...</p>
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

  const formatDuration = (pkg: any) => {
    if (!pkg.duration) return "-";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{tourData.tour_name}</DialogTitle>

        {/* Header */}
        <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight">{tourData.tour_name}</h1>
              {tourData.preferred && (
                <Badge
                  variant="default"
                  className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs"
                >
                  Preferred
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-8">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-8 text-xs">
                  <Edit className="w-3 h-3" />
                  Edit Tour
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
                  {tourData.packages && tourData.packages.length > 0 ? (
                    <Accordion
                      type="multiple"
                      value={openAccordions}
                      onValueChange={setOpenAccordions}
                      className="space-y-4"
                    >
                      {[...tourData.packages]
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
                                      {pkg.includes_transfer && (
                                        <Badge variant="outline" className="text-[10px]">
                                          Transfer
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="text-[10px]">
                                        {pkg.seasons?.length || 0} Season
                                        {pkg.seasons?.length !== 1 ? "s" : ""}
                                      </Badge>
                                    </div>
                                  </div>
                                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                              <h4 className="text-sm font-medium text-primary mb-1">Categories</h4>
                              {pkg.categories && pkg.categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mb-4">
                                  {pkg.categories.map((categoryValue: string) => (
                                    <Badge key={categoryValue} variant="outline" className="text-[10px] bg-primary/5">
                                      {getCategoryLabel(categoryValue)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm">-</p>
                              )}
                              <div className="space-y-6">
                                {/* Top Section: Details & Operational */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                  {/* Left: Details */}
                                  <div className="lg:col-span-2 space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium text-primary mb-1">Description</h4>
                                      <RategenMarkdown
                                        className="text-sm"
                                        content={pkg.description || "No description available."}
                                      />
                                    </div>

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

                                    <div className="grid grid-cols-2 gap-6 p-4 bg-muted/20 rounded-lg border border-border/50">
                                      <div>
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                          Meeting Point
                                        </h4>
                                        <p className="text-sm font-medium">{pkg.meeting_point || "-"}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                          Pickup / Dropoff
                                        </h4>
                                        <p className="text-sm font-medium">
                                          {pkg.pickup_point || "-"} / {pkg.dropoff_point || "-"}
                                        </p>
                                      </div>
                                    </div>

                                    {(pkg.notes || pkg.remarks) && (
                                      <div className="grid gap-4">
                                        {pkg.remarks && (
                                          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-900 text-sm">
                                            <span className="font-medium">AI Remarks</span>
                                            <RategenMarkdown
                                              className="text-sm"
                                              content={pkg.remarks || "No remarks available."}
                                            />
                                          </div>
                                        )}
                                        {pkg.notes && (
                                          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-900 text-sm">
                                            <span className="font-medium">Note</span>
                                            <RategenMarkdown
                                              className="text-sm"
                                              content={pkg.notes || "No notes available."}
                                            />
                                          </div>
                                        )}
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
                                        <span className="font-medium">{formatDuration(pkg)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Max Participants</span>
                                        <span className="font-medium">{pkg.max_participants || "-"}</span>
                                      </div>
                                    </div>

                                    <Separator />

                                    <div>
                                      <h4 className="text-sm font-medium text-primary mb-2">Age Policy</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {pkg.age_policy && Object.keys(pkg.age_policy).length > 0 ? (
                                          ["adult", "teenager", "child", "infant"].map((bracket) => {
                                            const label = getAgeLabel(pkg.age_policy, bracket);
                                            if (!label) return null;
                                            return (
                                              <Badge
                                                key={bracket}
                                                variant="outline"
                                                className="font-normal bg-background"
                                              >
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
                                  <h4 className="text-sm font-medium text-primary mb-3">Seasons & Rates</h4>
                                  {pkg.seasons && pkg.seasons.length > 0 ? (
                                    <div className="rounded-lg border overflow-hidden">
                                      {(() => {
                                        // Determine which rate columns to show based on age policy
                                        const agePolicy = pkg.age_policy || {};
                                        const hasAgePolicy = Object.keys(agePolicy).length > 0;
                                        const showAdult = hasAgePolicy ? !!agePolicy.adult : false;
                                        const showTeenager = hasAgePolicy ? !!agePolicy.teenager : false;
                                        const showChild = hasAgePolicy ? !!agePolicy.child : false;
                                        const showInfant = hasAgePolicy ? !!agePolicy.infant : false;
                                        const rateColumnCount =
                                          (showAdult ? 1 : 0) +
                                          (showTeenager ? 1 : 0) +
                                          (showChild ? 1 : 0) +
                                          (showInfant ? 1 : 0);

                                        return (
                                          <Table>
                                            <TableHeader className="bg-muted/30">
                                              <TableRow>
                                                <TableHead className="w-[180px]">Season Dates</TableHead>
                                                <TableHead className="w-[150px]">Rate Type</TableHead>
                                                {hasAgePolicy ? (
                                                  <>
                                                    {showAdult && <TableHead className="text-right">Adult</TableHead>}
                                                    {showTeenager && (
                                                      <TableHead className="text-right">Teenager</TableHead>
                                                    )}
                                                    {showChild && <TableHead className="text-right">Child</TableHead>}
                                                    {showInfant && <TableHead className="text-right">Infant</TableHead>}
                                                  </>
                                                ) : (
                                                  <TableHead className="text-right">Rate</TableHead>
                                                )}
                                                <TableHead className="text-right font-bold bg-muted/10">
                                                  Total
                                                </TableHead>
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

                                                  // 1. Ticket Only Rates
                                                  const ticketRates = [
                                                    showAdult ? season.ticket_only_rate_adult : undefined,
                                                    showTeenager ? season.ticket_only_rate_teenager : undefined,
                                                    showChild ? season.ticket_only_rate_child : undefined,
                                                    showInfant ? season.ticket_only_rate_infant : undefined,
                                                  ].filter((r) => r !== undefined);

                                                  if (
                                                    hasAgePolicy &&
                                                    ticketRates.length > 0 &&
                                                    hasRates(...ticketRates)
                                                  ) {
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
                                                            {season.exception_rules && (
                                                              <div className="text-xs text-info mt-1">
                                                                Exception: {season.exception_rules}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                          Ticket Only
                                                        </TableCell>
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
                                                        <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                                          -
                                                        </TableCell>
                                                      </TableRow>
                                                    );
                                                  }

                                                  // 2. SIC Rates
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
                                                        <TableCell className="text-muted-foreground text-sm">
                                                          SIC (Shared)
                                                        </TableCell>
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
                                                        <TableCell className="text-right font-bold tabular-nums bg-muted/5">
                                                          -
                                                        </TableCell>
                                                      </TableRow>
                                                    );
                                                  }

                                                  // 3. Private Rates (Per Pax)
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
                                                          <TableCell
                                                            className="text-right tabular-nums"
                                                            colSpan={rateColumnCount || 1}
                                                          >
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

                                                  // 4. Private Rates (Per Vehicle)
                                                  if (season.per_vehicle_rate && season.per_vehicle_rate.length > 0) {
                                                    season.per_vehicle_rate.forEach((vehicle: any, vIdx: number) => {
                                                      rows.push(
                                                        <TableRow key={`${sIdx}-vehicle-${vIdx}`}>
                                                          <TableCell className="font-medium text-sm align-top">
                                                            {rows.length === 0 ? season.dates || "All Season" : ""}
                                                          </TableCell>
                                                          <TableCell className="text-muted-foreground text-sm">
                                                            Private -{" "}
                                                            {vehicle.vehicle_type || vehicle.brand || "Vehicle"}
                                                            {vehicle.capacity && (
                                                              <span className="text-xs ml-1">({vehicle.capacity})</span>
                                                            )}
                                                          </TableCell>
                                                          <TableCell
                                                            className="text-right tabular-nums"
                                                            colSpan={rateColumnCount || 1}
                                                          >
                                                            -
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
                                {pkg.selected_add_ons && pkg.selected_add_ons.length > 0 && (
                                  <div className="my-6 pt-6 border-t">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Package Add-ons</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {pkg.selected_add_ons.map((addOn: any, addOnIdx: number) => (
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
                                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                              {addOn.description}
                                            </p>
                                          )}
                                          <div className="flex gap-3 text-xs">
                                            {addOn.ticket_only_rate_adult !== undefined && (
                                              <div>
                                                <span className="text-muted-foreground">Adult: </span>
                                                <span className="font-medium">
                                                  {formatAmount(addOn.ticket_only_rate_adult)}
                                                </span>
                                              </div>
                                            )}
                                            {addOn.ticket_only_rate_child !== undefined && (
                                              <div>
                                                <span className="text-muted-foreground">Child: </span>
                                                <span className="font-medium">
                                                  {formatAmount(addOn.ticket_only_rate_child)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
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
                      No packages configured for this tour.
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
                              {tourData.images?.length || 0} Image
                              {tourData.images?.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {tourData.images && tourData.images.length > 0 ? (
                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin pt-2">
                            {tourData.images.map((image, index) => (
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
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold">Basic Details</span>
                          </div>
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
                                  {[tourData.city_name, tourData.country_name].filter(Boolean).join(", ") || "-"}
                                </p>
                                <p className="text-sm text-muted-foreground">{tourData.formatted_address}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Timings</span>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <div>
                                {tourData.timings && tourData.timings.length > 0 ? (
                                  <div className="space-y-1">
                                    {tourData.timings.map((timing, idx) => (
                                      <div key={idx} className="text-sm font-medium">
                                        {timing}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Website</span>
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              {tourData.website ? (
                                <a
                                  href={tourData.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline break-all text-sm font-medium"
                                >
                                  {tourData.website}
                                </a>
                              ) : (
                                <p>-</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Financials</span>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                {tourData.currency || "USD"} • {tourData.markup || "-"} Markup
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Second row: Coordinates & Maps */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Coordinates</span>
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              {tourData.latitude && tourData.longitude ? (
                                <p className="text-sm font-medium">
                                  {tourData.latitude}, {tourData.longitude}
                                </p>
                              ) : (
                                <p className="text-sm">-</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <span className="text-sm font-medium text-muted-foreground">Google Maps</span>
                            <div className="flex items-center gap-2">
                              <Map className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              {tourData.maps_url ? (
                                <a
                                  href={tourData.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline break-all font-medium"
                                >
                                  {tourData.maps_url}
                                </a>
                              ) : (
                                <p className="text-sm">-</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="space-y-3">
                          <span className="text-sm font-medium text-muted-foreground">Description</span>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {tourData.description || "No description available."}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Notes & Remarks */}
                    <AccordionItem
                      value="notes"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Notes & Remarks</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 pt-2">
                          {tourData.notes && (
                            <div className="p-4 bg-muted/30 rounded-lg border">
                              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Internal Notes</p>
                              <p className="text-sm">{tourData.notes}</p>
                            </div>
                          )}
                          {tourData.remarks && (
                            <div className="p-4 bg-muted/30 rounded-lg border">
                              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">AI Remarks</p>
                              <p className="text-sm text-muted-foreground italic">{tourData.remarks}</p>
                            </div>
                          )}
                          {!tourData.examples && !tourData.notes && !tourData.remarks && (
                            <p className="text-sm text-muted-foreground">No notes available.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Cancellation Policy</h4>
                            <div className="p-4 bg-muted/10 rounded-lg border text-sm leading-relaxed">
                              {tourData.cancellation_policy || "No cancellation policy configured"}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Child Policy</h4>
                            <div className="p-4 bg-muted/10 rounded-lg border text-sm leading-relaxed">
                              {tourData.child_policy || "No child policy configured"}
                            </div>
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
                              {tourData.add_ons?.length || 0} Add-on
                              {tourData.add_ons?.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {tourData.add_ons && tourData.add_ons.length > 0 ? (
                          <div className="space-y-6 pt-2">
                            {tourData.add_ons.map((addOn, index) => (
                              <div
                                key={index}
                                className="p-6 bg-muted/10 rounded-lg border hover:border-primary/20 transition-colors"
                              >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-semibold text-lg mb-1">{addOn.name}</h4>
                                    {addOn.description && (
                                      <p className="text-sm text-muted-foreground">{addOn.description}</p>
                                    )}
                                  </div>
                                  {addOn.total_rate && (
                                    <Badge variant="secondary" className="font-bold">
                                      Total: {formatAmount(addOn.total_rate)}
                                    </Badge>
                                  )}
                                </div>

                                {/* Rates Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  {addOn.ticket_only_rate_adult !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Adult
                                      </span>
                                      <span className="font-semibold text-sm">
                                        {formatAmount(addOn.ticket_only_rate_adult)}
                                      </span>
                                    </div>
                                  )}
                                  {addOn.ticket_only_rate_child !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Child
                                      </span>
                                      <span className="font-semibold text-sm">
                                        {formatAmount(addOn.ticket_only_rate_child)}
                                      </span>
                                    </div>
                                  )}
                                  {addOn.ticket_only_rate_teenager !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Teenager
                                      </span>
                                      <span className="font-semibold text-sm">
                                        {formatAmount(addOn.ticket_only_rate_teenager)}
                                      </span>
                                    </div>
                                  )}
                                  {addOn.ticket_only_rate_infant !== undefined && (
                                    <div className="p-3 bg-background rounded-md border">
                                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                        Infant
                                      </span>
                                      <span className="font-semibold text-sm">
                                        {formatAmount(addOn.ticket_only_rate_infant)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                                  {addOn.max_participants && (
                                    <div>
                                      <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                                        Max Participants
                                      </span>
                                      <p className="text-sm font-medium">{addOn.max_participants}</p>
                                    </div>
                                  )}
                                  {addOn.age_policy && (
                                    <div className="col-span-4">
                                      <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                                        Age Policy
                                      </span>
                                      <div className="text-sm space-y-1 grid grid-cols-4">
                                        {addOn.age_policy.infant && (
                                          <p className="text-xs">
                                            <span className="font-medium">Infant:</span>{" "}
                                            {addOn.age_policy.infant.min_age}-{addOn.age_policy.infant.max_age} years
                                          </p>
                                        )}
                                        {addOn.age_policy.child && (
                                          <p className="text-xs">
                                            <span className="font-medium">Child:</span> {addOn.age_policy.child.min_age}
                                            -{addOn.age_policy.child.max_age} years
                                          </p>
                                        )}
                                        {addOn.age_policy.teenager && (
                                          <p className="text-xs">
                                            <span className="font-medium">Teenager:</span>{" "}
                                            {addOn.age_policy.teenager.min_age}-{addOn.age_policy.teenager.max_age}{" "}
                                            years
                                          </p>
                                        )}
                                        {addOn.age_policy.adult && (
                                          <p className="text-xs">
                                            <span className="font-medium">Adult:</span> {addOn.age_policy.adult.min_age}
                                            + years
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Remarks & Notes */}
                                {(addOn.remarks || addOn.notes) && (
                                  <div className="space-y-3 border-t pt-4 grid grid-cols-2">
                                    {addOn.remarks && (
                                      <div>
                                        <span className="text-xs uppercase tracking-wider text-muted-foreground block">
                                          AI Remarks
                                        </span>
                                        <p className="text-sm">{addOn.remarks}</p>
                                      </div>
                                    )}
                                    {addOn.notes && (
                                      <div>
                                        <span className="text-xs uppercase tracking-wider text-muted-foreground block">
                                          Notes
                                        </span>
                                        <p className="text-sm">{addOn.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Images */}
                                {addOn.images && addOn.images.length > 0 && (
                                  <div className="border-t pt-4 mt-4">
                                    <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-3">
                                      Images
                                    </span>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                      {addOn.images.map((image, imgIdx) => (
                                        <div
                                          key={imgIdx}
                                          className="aspect-square rounded-md overflow-hidden border relative"
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
                          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg mt-2">
                            No global add-ons available.
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

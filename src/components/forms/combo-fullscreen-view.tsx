"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Edit,
  MapPin,
  CreditCard,
  Info,
  X,
  Package,
  Calendar,
  Layers,
  Hash,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { ICombo, IComboItem } from "./schemas/combos-datastore-schema";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PackageDetailsSheet from "./combo-sections/package-details-sheet";
import { getTourPackageById } from "@/data-access/tours";
import { getTransferPackageById } from "@/data-access/transfers";
import { toast } from "sonner";
import RategenMarkdown from "../ui/rategen-markdown";

interface ComboFullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  comboData: ICombo | null;
  onEdit?: () => void;
  isLoading?: boolean;
}

const TABS = [
  { id: "packages", title: "Packages & Pricing" },
  { id: "general", title: "General Info" },
];

export default function ComboFullscreenView({
  isOpen,
  onClose,
  comboData,
  onEdit,
  isLoading = false,
}: ComboFullscreenViewProps) {
  const [selectedItem, setSelectedItem] = useState<IComboItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [packageLoading, setPackageLoading] = useState(false);

  // Accordion state for each tab
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("packages");

  // Generate accordion IDs based on tab content
  const accordionIds = useMemo(() => {
    const ids: Record<string, string[]> = {
      packages: ["included-packages", "age-policy", "seasons-rates"],
      general: ["basic-details", "remarks"],
    };
    return ids;
  }, []);

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

  const handleViewPackage = async (item: IComboItem) => {
    // Set basic item info first (for header display)
    setSelectedItem(item);
    setSheetOpen(true);
    setPackageLoading(true);

    try {
      let packageData = null;

      if (item.item_type === "tour" && item.tour_package_id) {
        const result = await getTourPackageById(item.tour_package_id);
        if (result.error) {
          toast.error("Failed to load package details");
          console.error(result.error);
          return;
        }
        packageData = result.data;
      } else if (item.item_type === "transfer" && item.transfer_package_id) {
        const result = await getTransferPackageById(item.transfer_package_id);
        if (result.error) {
          toast.error("Failed to load package details");
          console.error(result.error);
          return;
        }
        packageData = result.data;
      }

      if (packageData) {
        // Update the item with fetched package data
        setSelectedItem({
          ...item,
          source_package: packageData,
        });
      }
    } catch (error) {
      toast.error("Failed to load package details");
      console.error(error);
    } finally {
      setPackageLoading(false);
    }
  };

  // Show loading state when dialog is open but data is still loading
  if (isLoading || !comboData) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Loading Combo</DialogTitle>

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
              <p className="text-sm text-muted-foreground">Loading combo details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getAgeLabel = (agePolicy: any, bracket: string) => {
    if (!agePolicy?.[bracket]) return null;
    const { min_age, max_age } = agePolicy[bracket];
    return `${bracket.charAt(0).toUpperCase() + bracket.slice(1)} (${min_age}-${max_age})`;
  };

  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "-";
    return amount.toFixed(2);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">{comboData.title}</DialogTitle>

          {/* Header */}
          <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold tracking-tight">{comboData.title}</h1>
                <Badge variant="outline" className="text-xs">
                  {comboData.items?.length || 0} Packages
                </Badge>
                <Badge variant={comboData.combo_type === "OR" ? "secondary" : "default"} className="text-xs">
                  {comboData.combo_type || "AND"}
                </Badge>
                {(comboData.min_packages && comboData.min_packages > 2) || comboData.max_packages ? (
                  <Badge variant="outline" className="text-xs">
                    {comboData.min_packages ?? 2} - {comboData.max_packages || "∞"} Packages
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-8">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-8 text-xs">
                    <Edit className="w-3 h-3" />
                    Edit Combo
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
                  {/* Packages & Pricing Tab */}
                  <TabsContent value="packages" className="mt-0 space-y-6">
                    <Accordion
                      type="multiple"
                      value={openAccordions}
                      onValueChange={setOpenAccordions}
                      className="space-y-4"
                    >
                      {/* Included Packages */}
                      <AccordionItem
                        value="included-packages"
                        className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                      >
                        <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold">Included Packages</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {comboData.items?.length || 0} Package{comboData.items?.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          {comboData.items && comboData.items.length > 0 ? (
                            <div className="space-y-3 pt-2">
                              {comboData.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{item.package_name}</span>
                                      <Badge
                                        variant={item.item_type === "tour" ? "default" : "secondary"}
                                        className="text-[10px]"
                                      >
                                        {item.item_type === "tour" ? "Tour" : "Transfer"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {item.tour_name || item.transfer_name}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewPackage(item)}
                                    className="h-7 px-2"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm mt-2">
                              No packages included in this combo.
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      {/* Age Policy */}
                      <AccordionItem
                        value="age-policy"
                        className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                      >
                        <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-lg font-semibold">Age Policy</span>
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          {comboData.age_policy && Object.keys(comboData.age_policy).length > 0 ? (
                            <div className="flex flex-wrap gap-3 pt-2">
                              {["adult", "teenager", "child", "infant"].map((bracket) => {
                                const label = getAgeLabel(comboData.age_policy, bracket);
                                if (!label) return null;
                                return (
                                  <Badge
                                    key={bracket}
                                    variant="outline"
                                    className="font-normal bg-background px-4 py-2 text-sm"
                                  >
                                    {label}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic pt-2">No age policy configured</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      {/* Seasons & Rates */}
                      <AccordionItem
                        value="seasons-rates"
                        className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                      >
                        <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold">Seasons & Rates</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {comboData.seasons?.length || 0} Season{comboData.seasons?.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          {comboData.seasons && comboData.seasons.length > 0 ? (
                            <div className="rounded-lg border overflow-hidden">
                              {(() => {
                                // Determine which rate columns to show based on age policy
                                const agePolicy = comboData.age_policy || {};
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
                                      {[...comboData.seasons]
                                        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                                        .map((season, sIdx) => {
                                          const rows: React.ReactNode[] = [];

                                          // Helper to check if any rate exists
                                          const hasRates = (...rates: (number | undefined)[]) =>
                                            rates.some((r) => r !== undefined && r !== null);

                                          // 1. Ticket Only Rates
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
                                                    Private - {vehicle.vehicle_type || vehicle.brand || "Vehicle"}
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
                            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                              No seasons configured
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TabsContent>

                  {/* General Info Tab */}
                  <TabsContent value="general" className="mt-0 space-y-6">
                    <Accordion
                      type="multiple"
                      value={openAccordions}
                      onValueChange={setOpenAccordions}
                      className="space-y-4"
                    >
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 pt-2">
                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">Combo Type</span>
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <Badge
                                  variant={comboData.combo_type === "OR" ? "secondary" : "default"}
                                  className="text-xs"
                                >
                                  {comboData.combo_type === "OR" ? "OR - Any package" : "AND - All packages"}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">Min Packages</span>
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <p className="text-sm font-medium">{comboData.min_packages ?? 2}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">Max Packages</span>
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <p className="text-sm font-medium">{comboData.max_packages || "No limit"}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">Country</span>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <p className="text-sm font-medium">{comboData.country_name || "-"}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">City</span>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <p className="text-sm font-medium">{comboData.city_name || "-"}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">Currency</span>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <p className="text-sm font-medium">{comboData.currency || "USD"}</p>
                              </div>
                            </div>
                          </div>

                          <Separator className="my-6" />

                          <div className="space-y-3">
                            <span className="text-sm font-medium text-muted-foreground">Description</span>
                            <p className="text-sm leading-relaxed text-foreground/90">
                              {comboData.description || "No description available."}
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Remarks */}
                      <AccordionItem
                        value="remarks"
                        className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                      >
                        <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-lg font-semibold">Notes & Remarks</span>
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          {comboData.remarks ? (
                            <div className="pt-2">
                              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">AI Remarks</p>
                              <RategenMarkdown
                                content={comboData.remarks}
                                className="text-sm text-muted-foreground italic"
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground pt-2">No remarks available.</p>
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

      {/* Package Details Sheet */}
      <PackageDetailsSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={selectedItem}
        isLoading={packageLoading}
      />
    </>
  );
}

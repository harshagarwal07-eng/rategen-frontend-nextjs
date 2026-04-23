"use client";

import { useState, useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, MapPin, CreditCard, Bed, X, Phone, Mail, Star, ChevronDown, ChevronsUpDown, Tag } from "lucide-react";
import { IHotelsDatastore } from "./schemas/hotels-datastore-schema";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import RategenMarkdown from "../ui/rategen-markdown";

interface HotelFullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  hotelData:
    | (IHotelsDatastore & {
        city_name?: string;
        country_name?: string;
      })
    | null;
  onEdit?: () => void;
  isLoading?: boolean;
}

const TABS = [
  { id: "rooms", title: "Rooms & Rates" },
  { id: "general", title: "General Info" },
  { id: "policies", title: "Policies" },
];

export default function HotelFullscreenView({
  isOpen,
  onClose,
  hotelData,
  onEdit,
  isLoading = false,
}: HotelFullscreenViewProps) {
  // Accordion state for each tab
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Generate accordion IDs based on tab content
  const accordionIds = useMemo(() => {
    const ids: Record<string, string[]> = {
      rooms: hotelData?.rooms?.map((_, idx) => `room-${idx}`) || [],
      general: ["basic-details", "examples-offers"],
      policies: ["policies", "remarks", "age-policy", "meal-plan-rate"],
    };
    return ids;
  }, [hotelData?.rooms]);

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

  const [activeTab, setActiveTab] = useState("rooms");

  // Show loading state when dialog is open but data is still loading
  if (isLoading || !hotelData) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Loading Hotel</DialogTitle>

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
              <p className="text-sm text-muted-foreground">Loading hotel details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return "-";
    return amount.toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{hotelData.hotel_name}</DialogTitle>

        {/* Header */}
        <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight">
                {hotelData.hotel_code ? `${hotelData.hotel_code} - ` : ""}
                {hotelData.hotel_name}
              </h1>
              {hotelData.preferred && (
                <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                  Preferred
                </Badge>
              )}
              {hotelData.star_rating && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {hotelData.star_rating} Star
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-8">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-8">
                  <Edit className="w-3 h-3" />
                  Edit Hotel
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
                  <Button variant="outline" size="sm" onClick={() => expandAll(activeTab)} className="h-8 gap-1.5">
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => collapseAll(activeTab)} className="h-8 gap-1.5">
                    <ChevronsUpDown className="h-3.5 w-3.5 rotate-90" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="max-w-7xl mx-auto py-6 pb-20 space-y-6">
                {/* Rooms Tab */}
                <TabsContent value="rooms" className="mt-0 space-y-6">
                  {hotelData.rooms && hotelData.rooms.length > 0 ? (
                    <Accordion
                      type="multiple"
                      value={openAccordions}
                      onValueChange={setOpenAccordions}
                      className="space-y-4"
                    >
                      {[...hotelData.rooms]
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .map((room, roomIndex) => (
                          <AccordionItem
                            key={roomIndex}
                            value={`room-${roomIndex}`}
                            className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                          >
                            <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3 justify-between w-full">
                                  <div className="flex items-center gap-6">
                                    <h3 className="text-lg font-semibold">{room.room_category}</h3>
                                    <div className="flex gap-2">
                                      {room.meal_plan && <Badge variant="outline">{room.meal_plan}</Badge>}
                                      {room.max_occupancy && (
                                        <Badge variant="outline">Max Occ: {room.max_occupancy}</Badge>
                                      )}
                                      <Badge variant="secondary">
                                        {room.seasons?.length || 0} Season
                                        {room.seasons?.length !== 1 ? "s" : ""}
                                      </Badge>
                                    </div>
                                  </div>

                                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                              {/* Room Details */}
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
                                <div className="lg:col-span-2 space-y-4">
                                  {room.other_details && (
                                    <div>
                                      <h4 className="text-sm font-medium text-primary mb-1">Details</h4>
                                      <RategenMarkdown
                                        content={room.other_details || "No details provided."}
                                        className="text-sm"
                                      />
                                    </div>
                                  )}

                                  <div className="space-y-6">
                                    {room.extra_bed_policy && (
                                      <div>
                                        <h4 className="text-sm font-medium text-primary mb-1">Extra Bed Policy</h4>
                                        <RategenMarkdown
                                          content={room.extra_bed_policy || "No extra bed policy provided."}
                                          className="text-sm"
                                        />
                                      </div>
                                    )}
                                    {room.stop_sale && (
                                      <div>
                                        <h4 className="text-sm font-medium text-primary mb-1">Stop Sale</h4>
                                        <p className="text-sm text-destructive">{room.stop_sale}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Seasons & Rates Table */}
                              <div className="my-6">
                                <h4 className="text-sm font-medium text-primary mb-3">Seasons & Rates</h4>
                                {room.seasons && room.seasons.length > 0 ? (
                                  <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                      <TableHeader className="bg-muted/30">
                                        <TableRow>
                                          <TableHead className="font-semibold">Season Dates</TableHead>
                                          <TableHead className="text-right font-semibold">Rate/Night</TableHead>
                                          <TableHead className="text-right font-semibold">Single PP</TableHead>
                                          <TableHead className="text-right font-semibold">Double PP</TableHead>
                                          <TableHead className="text-right font-semibold">Extra Bed PP</TableHead>
                                          <TableHead className="text-right font-semibold">Child No Bed</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {room.seasons.map((season, sIdx) => (
                                          <Fragment key={sIdx}>
                                            <TableRow>
                                              <TableCell className="font-medium text-sm align-top">
                                                {season.dates}
                                              </TableCell>
                                              <TableCell className="w-28 text-right tabular-nums">
                                                {formatAmount(season.rate_per_night)}
                                              </TableCell>
                                              <TableCell className="w-28 text-right tabular-nums">
                                                {formatAmount(season.single_pp)}
                                              </TableCell>
                                              <TableCell className="w-28 text-right tabular-nums">
                                                {formatAmount(season.double_pp)}
                                              </TableCell>
                                              <TableCell className="w-28 text-right tabular-nums">
                                                {formatAmount(season.extra_bed_pp)}
                                              </TableCell>
                                              <TableCell className="w-28 text-right tabular-nums">
                                                {formatAmount(season.child_no_bed)}
                                              </TableCell>
                                            </TableRow>

                                            {season.booking_offers && season.booking_offers.length > 0 ? (
                                              <Fragment>
                                                {season.booking_offers.map((offer, oIdx) => (
                                                  <TableRow key={oIdx} className="bg-muted/30">
                                                    <TableCell className="flex items-center gap-1 flex-wrap font-medium text-sm align-top pl-4">
                                                      <span className="flex items-center gap-1 flex-wrap text-primary">
                                                        <Tag className="h-3 w-3 font-bold" /> Booking Offer
                                                      </span>{" "}
                                                      ({offer.offer_dates})
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(offer.rate_per_night)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(offer.single_pp)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(offer.double_pp)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(offer.extra_bed_pp)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                      {formatAmount(offer.child_no_bed)}
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </Fragment>
                                            ) : null}
                                          </Fragment>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                                    No seasons configured
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                      No rooms configured for this hotel.
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
                                  {[hotelData.city_name, hotelData.country_name].filter(Boolean).join(", ") || "-"}
                                </p>
                                <p className="text-sm text-muted-foreground">{hotelData.hotel_address}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Contact</span>
                            <div className="space-y-1">
                              {hotelData.hotel_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <p className="text-sm">{hotelData.hotel_phone}</p>
                                </div>
                              )}
                              {hotelData.hotel_email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <p className="text-sm">{hotelData.hotel_email}</p>
                                </div>
                              )}
                              {!hotelData.hotel_phone && !hotelData.hotel_email && <p className="text-sm">-</p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Property Type</span>
                            <div className="flex items-center gap-2">
                              <Bed className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{hotelData.property_type || "-"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Financials</span>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                {hotelData.hotel_currency || "USD"} • {hotelData.markup || "-"} Markup
                              </p>
                            </div>
                          </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="space-y-3">
                          <span className="text-sm font-medium text-muted-foreground">Description</span>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {hotelData.hotel_description || "No description available."}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="examples-offers"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Examples & Offers</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium text-primary mb-2">Examples</h4>
                            <RategenMarkdown
                              content={hotelData.examples || "No examples provided."}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-primary mb-2">Offers</h4>
                            <RategenMarkdown content={hotelData.offers || "No offers available."} className="text-sm" />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                {/* Policies Tab */}
                <TabsContent value="policies" className="mt-0 space-y-6">
                  <Accordion
                    type="multiple"
                    value={openAccordions}
                    onValueChange={setOpenAccordions}
                    className="space-y-4"
                  >
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
                        <div className="grid grid-cols-1 gap-8 pt-2">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Cancellation Policy</h4>
                            <div className="p-4 bg-muted/10 rounded-lg border text-sm leading-relaxed">
                              {hotelData.cancellation_policy || "No cancellation policy configured"}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Payment Policy</h4>
                            <div className="p-4 bg-muted/10 rounded-lg border text-sm leading-relaxed">
                              {hotelData.payment_policy || "No payment policy configured"}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Group Policy</h4>
                            <div className="p-4 bg-muted/10 rounded-lg border text-sm leading-relaxed">
                              {hotelData.group_policy || "No group policy configured"}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="remarks"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Remarks</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {hotelData.remarks ? (
                          <RategenMarkdown content={hotelData.remarks} />
                        ) : (
                          <p className="text-sm text-muted-foreground pt-2">No remarks available.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

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
                        {hotelData.age_policy ? (
                          <div className="space-y-4">
                            {(["adult", "teenager", "child", "infant"] as const).map((key) => {
                              const policy = (hotelData.age_policy as any)[key];
                              if (!policy) return null;
                              const rooms = policy.rooms;
                              const meals = policy.meals;

                              return (
                                <div key={key} className="rounded-lg border p-4">
                                  <h4 className="text-sm font-medium text-primary mb-2 capitalize">{key}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <div className="text-muted-foreground text-xs">Rooms</div>
                                      {rooms ? (
                                        <p className="mt-1 text-sm">
                                          From: {rooms.from ?? "-"} — To: {rooms.to ?? "-"}
                                        </p>
                                      ) : (
                                        <p className="mt-1 text-sm text-muted-foreground">No rooms range</p>
                                      )}
                                    </div>

                                    <div>
                                      <div className="text-muted-foreground text-xs">Meals</div>
                                      {meals ? (
                                        <p className="mt-1 text-sm">
                                          From: {meals.from ?? "-"} — To: {meals.to ?? "-"}
                                        </p>
                                      ) : (
                                        <p className="mt-1 text-sm text-muted-foreground">No meals range</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pt-2">No age policy available.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="meal-plan-rate"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Meal Plan Rates</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {hotelData.meal_plan_rates && hotelData.meal_plan_rates.length > 0 ? (
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/30">
                                <TableRow>
                                  <TableHead>Meal Type</TableHead>
                                  <TableHead className="text-right">Adult</TableHead>
                                  <TableHead className="text-right">Teenager</TableHead>
                                  <TableHead className="text-right">Child</TableHead>
                                  <TableHead className="text-right">Infant</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {hotelData.meal_plan_rates.map((mp, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium text-sm align-top">{mp.meal_type}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {formatAmount(mp.rates.adult)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {formatAmount(mp.rates.teenager)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {formatAmount(mp.rates.child)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {formatAmount(mp.rates.infant)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                            No meal plan rates configured
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

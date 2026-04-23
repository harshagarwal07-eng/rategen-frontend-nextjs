"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, MapPin, CreditCard, X, ChevronDown, ChevronsUpDown, BookUser } from "lucide-react";
import { IGuidesDatastore } from "./schemas/guides-datastore-schema";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import RategenMarkdown from "../ui/rategen-markdown";

interface GuideFullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  guideData:
    | (IGuidesDatastore & {
        country_name?: string;
        city_name?: string;
      })
    | null;
  onEdit?: () => void;
  isLoading?: boolean;
}

const TABS = [
  { id: "general", title: "General Info" },
  { id: "policies", title: "Policies" },
];

export default function GuideFullscreenView({
  isOpen,
  onClose,
  guideData,
  onEdit,
  isLoading = false,
}: GuideFullscreenViewProps) {
  // Accordion state for each tab
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Generate accordion IDs based on tab content
  const accordionIds = useMemo(() => {
    const ids: Record<string, string[]> = {
      general: ["basic-details", "examples"],
      policies: ["policies", "inclusions-exclusions", "remarks", "notes"],
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

  const [activeTab, setActiveTab] = useState("general");

  // Show loading state when dialog is open but data is still loading
  if (isLoading || !guideData) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Loading Guide</DialogTitle>

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
              <p className="text-sm text-muted-foreground">Loading guide details...</p>
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
        <DialogTitle className="sr-only">{guideData.guide_type}</DialogTitle>

        {/* Header */}
        <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight">{guideData.guide_type}</h1>
              {guideData.preferred && (
                <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                  Preferred
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-8">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-8">
                  <Edit className="w-3 h-3" />
                  Edit Guide
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Country</span>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{guideData.country_name || "-"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">City</span>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{guideData.city_name || "-"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Currency</span>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{guideData.currency || "USD"}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Per Day Rate</span>
                            <div className="flex items-center gap-2">
                              <BookUser className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                {guideData.per_day_rate ? formatAmount(guideData.per_day_rate) : "-"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Language</span>
                            <p className="text-sm font-medium">{guideData.language || "-"}</p>
                          </div>

                          <div className="space-y-2">
                            <span className="text-sm font-medium text-muted-foreground">Markup</span>
                            <p className="text-sm font-medium">{guideData.markup ? `${guideData.markup}%` : "-"}</p>
                          </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="space-y-3">
                          <span className="text-sm font-medium text-muted-foreground">Description</span>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {guideData.description || "No description available."}
                          </p>
                        </div>

                        {guideData.images && guideData.images.length > 0 && (
                          <>
                            <Separator className="my-6" />
                            <div className="space-y-3">
                              <span className="text-sm font-medium text-muted-foreground">Images</span>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {guideData.images.map((imageUrl, index) => (
                                  <div
                                    key={index}
                                    className="relative aspect-video rounded-lg overflow-hidden border bg-muted"
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`Guide image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="examples"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Examples</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <RategenMarkdown content={guideData.examples || "No examples provided."} className="text-sm" />
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
                          <span className="text-lg font-semibold">Cancellation Policy</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="p-4 bg-muted/10 rounded-lg border text-sm leading-relaxed">
                          {guideData.cancellation_policy || "No cancellation policy configured"}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="inclusions-exclusions"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Inclusions & Exclusions</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-2">Inclusions</h4>
                            {guideData.inclusions ? (
                              <RategenMarkdown content={guideData.inclusions} className="text-sm" />
                            ) : (
                              <p className="text-sm text-muted-foreground">No inclusions specified.</p>
                            )}
                          </div>
                          <Separator />
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-2">Exclusions</h4>
                            {guideData.exclusions ? (
                              <RategenMarkdown content={guideData.exclusions} className="text-sm" />
                            ) : (
                              <p className="text-sm text-muted-foreground">No exclusions specified.</p>
                            )}
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
                        {guideData.remarks ? (
                          <RategenMarkdown content={guideData.remarks} />
                        ) : (
                          <p className="text-sm text-muted-foreground pt-2">No remarks available.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem
                      value="notes"
                      className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
                    >
                      <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-semibold">Notes</span>
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {guideData.notes ? (
                          <RategenMarkdown content={guideData.notes} />
                        ) : (
                          <p className="text-sm text-muted-foreground pt-2">No notes available.</p>
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

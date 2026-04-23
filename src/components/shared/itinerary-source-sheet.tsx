"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Loader2,
  History,
  FileText,
  PlusCircle,
  MapPin,
  Moon,
  Users,
  Calendar as CalendarIcon,
  Layers,
  Building2,
  Car,
  LucideFerrisWheel,
  UtensilsCrossed,
  Plane,
  Package,
  Check,
  ArrowRight,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  addOptionToChat,
  getPastItinerariesForDmc,
  getActivitiesForPreview,
  cloneItineraryToChat,
  createChatItinerary,
  getChatItinerary,
  importSampleActivities,
  type ChatItinerary,
} from "@/data-access/chat-itinerary";
import { getSampleItineraries } from "@/data-access/docs";
import {
  createChatWithQuery,
  getAIChatByQueryId,
  createMessage,
  getMessages,
} from "@/data-access/travel-agent";
import { cn } from "@/lib/utils";
import type { IQueryDetails } from "@/types/crm-query";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

type MenuId = "samples" | "past" | "clone" | "scratch";

interface MenuItem {
  id: MenuId;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface PreviewCard {
  key: string;
  label: string;
  sublabel?: string;
  destination: string;
  nights: number;
  adults?: number;
  children?: number;
  checkIn?: string;
  theme?: string;
  chatId?: string;
  optionNumber?: number;
  sampleContent?: string;
  source: "sample" | "past" | "clone";
  raw: any;
}

interface PreviewDay {
  day: number;
  date?: string;
  title?: string;
  activities: PreviewActivity[];
  overnight?: string;
}

interface PreviewActivity {
  type: string;
  name: string;
  subtitle?: string;
  duration?: string;
}

/**
 * "manual" — creating a first itinerary for a CRM query (no chat exists yet)
 * "add-option" — adding an option to an existing chat
 */
type SheetMode =
  | {
      type: "manual";
      queryId: string;
      query: IQueryDetails;
      initialMessage: string;
      onCreated: (chatId: string) => void;
    }
  | {
      type: "add-option";
      chatId: string;
      currentOptions: ChatItinerary[];
      onCreated: (optionNumber: number) => void;
    };

export interface ItinerarySourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dmcId: string;
  mode: SheetMode;
}

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

const MENU_ITEMS_ADD_OPTION: MenuItem[] = [
  { id: "samples", label: "Samples", description: "Use a template", icon: FileText },
  { id: "past", label: "Past", description: "From history", icon: History },
  { id: "clone", label: "Clone", description: "Copy existing", icon: Layers },
  { id: "scratch", label: "Scratch", description: "Start empty", icon: PlusCircle },
];

const MENU_ITEMS_MANUAL: MenuItem[] = [
  { id: "samples", label: "Samples", description: "Use a template", icon: FileText },
  { id: "past", label: "Past", description: "From history", icon: History },
  { id: "scratch", label: "Scratch", description: "Start empty", icon: PlusCircle },
];

const SERVICE_ICONS: Record<string, React.ElementType> = {
  hotel: Building2,
  tour: LucideFerrisWheel,
  transfer: Car,
  meal: UtensilsCrossed,
  flight: Plane,
  combo: Package,
};

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function ItinerarySourceSheet({
  open,
  onOpenChange,
  dmcId,
  mode,
}: ItinerarySourceSheetProps) {
  const isManual = mode.type === "manual";
  const menuItems = isManual ? MENU_ITEMS_MANUAL : MENU_ITEMS_ADD_OPTION;

  const [activeMenu, setActiveMenu] = useState<MenuId>("samples");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List data
  const [pastItineraries, setPastItineraries] = useState<
    Array<ChatItinerary & { chat_title?: string }>
  >([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [sampleItineraries, setSampleItineraries] = useState<
    Array<{
      id: number;
      content: string;
      nights: number;
      country_name: string;
      created_at: string;
    }>
  >([]);
  const [sampleLoading, setSampleLoading] = useState(false);

  // Selection & preview
  const [selectedCard, setSelectedCard] = useState<PreviewCard | null>(null);
  const [previewDays, setPreviewDays] = useState<PreviewDay[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Derive metadata for scratch view & nights filter
  const tripMeta = deriveTripMeta(mode);

  // ─── Data fetching ────────────────────────────────

  useEffect(() => {
    if (open && activeMenu === "past" && pastItineraries.length === 0) {
      setPastLoading(true);
      getPastItinerariesForDmc(dmcId, tripMeta.nights ?? undefined)
        .then(setPastItineraries)
        .catch(() => toast.error("Failed to load past itineraries"))
        .finally(() => setPastLoading(false));
    }
  }, [open, activeMenu, dmcId, pastItineraries.length, tripMeta.nights]);

  useEffect(() => {
    if (open && activeMenu === "samples" && sampleItineraries.length === 0) {
      setSampleLoading(true);
      getSampleItineraries(tripMeta.nights ?? undefined)
        .then(setSampleItineraries)
        .catch(() => toast.error("Failed to load sample itineraries"))
        .finally(() => setSampleLoading(false));
    }
  }, [open, activeMenu, sampleItineraries.length, tripMeta.nights]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPastItineraries([]);
      setSampleItineraries([]);
      setSelectedCard(null);
      setPreviewDays(null);
      setActiveMenu("samples");
    }
  }, [open]);

  // Clear selection when switching menus
  useEffect(() => {
    setSelectedCard(null);
    setPreviewDays(null);
  }, [activeMenu]);

  // ─── Preview loading ──────────────────────────────

  const loadPreview = useCallback(async (card: PreviewCard) => {
    setSelectedCard(card);
    setPreviewDays(null);
    setPreviewLoading(true);

    try {
      if (card.source === "sample" && card.sampleContent) {
        const parsed = JSON.parse(card.sampleContent);
        if (parsed.days && Array.isArray(parsed.days)) {
          setPreviewDays(
            parsed.days.map((d: any) => ({
              day: d.day || 1,
              date: d.date,
              title: d.title,
              activities: (d.activities || []).map((a: any) => ({
                type: a.type || "tour",
                name:
                  a.name ||
                  a.hotel_name ||
                  a.tour_name ||
                  a.transfer_name ||
                  "Unknown",
                subtitle: a.subtitle || a.description,
                duration: a.duration,
              })),
              overnight: d.overnight,
            }))
          );
        } else {
          setPreviewDays([]);
        }
      } else if (card.chatId && card.optionNumber != null) {
        const activities = await getActivitiesForPreview(
          card.chatId,
          card.optionNumber
        );
        const dayMap = new Map<number, PreviewDay>();
        for (const act of activities) {
          if (!dayMap.has(act.day_number)) {
            dayMap.set(act.day_number, {
              day: act.day_number,
              date: act.day_date,
              title: act.day_title,
              activities: [],
            });
          }
          const name =
            act.hotel_name ||
            act.tour_name ||
            act.transfer_name ||
            "Unknown";
          dayMap.get(act.day_number)!.activities.push({
            type: act.service_type,
            name,
            subtitle: act.notes,
            duration: act.duration,
          });
          if (act.service_type === "hotel") {
            dayMap.get(act.day_number)!.overnight = name;
          }
        }
        setPreviewDays(
          Array.from(dayMap.values()).sort((a, b) => a.day - b.day)
        );
      } else {
        setPreviewDays([]);
      }
    } catch {
      setPreviewDays([]);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // ─── Build card lists ─────────────────────────────

  const sampleCards: PreviewCard[] = sampleItineraries.map((s) => {
    let dayCount = s.nights;
    let theme: string | undefined;
    try {
      const p = JSON.parse(s.content);
      if (p.days) dayCount = p.days.length;
      if (p.theme) theme = p.theme;
    } catch {}
    return {
      key: `sample-${s.id}`,
      label: s.country_name || "Unknown",
      sublabel: `${dayCount} days`,
      destination: s.country_name || "Unknown",
      nights: s.nights,
      checkIn: s.created_at,
      theme,
      sampleContent: s.content,
      source: "sample",
      raw: s,
    };
  });

  const pastCards: PreviewCard[] = pastItineraries.map((itin) => ({
    key: `past-${itin.id}`,
    label: itin.destination,
    sublabel: itin.chat_title,
    destination: itin.destination,
    nights: itin.nights,
    adults: itin.adults,
    children: itin.children,
    checkIn: itin.check_in,
    chatId: itin.chat_id,
    optionNumber: itin.option_number,
    source: "past",
    raw: itin,
  }));

  const cloneCards: PreviewCard[] =
    mode.type === "add-option"
      ? mode.currentOptions.map((opt) => ({
          key: `clone-${opt.option_number}`,
          label: `Option ${opt.option_number}`,
          sublabel: opt.destination,
          destination: opt.destination,
          nights: opt.nights,
          adults: opt.adults,
          children: opt.children,
          checkIn: opt.check_in,
          chatId: opt.chat_id,
          optionNumber: opt.option_number,
          source: "clone" as const,
          raw: opt,
        }))
      : [];

  const currentCards =
    activeMenu === "samples"
      ? sampleCards
      : activeMenu === "past"
        ? pastCards
        : activeMenu === "clone"
          ? cloneCards
          : [];

  const isListLoading =
    (activeMenu === "samples" && sampleLoading) ||
    (activeMenu === "past" && pastLoading);

  // ─── Actions ──────────────────────────────────────

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      if (mode.type === "add-option") {
        await handleAddOptionSubmit(mode, activeMenu, selectedCard, tripMeta);
      } else {
        await handleManualSubmit(mode, activeMenu, selectedCard, dmcId);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[ItinerarySourceSheet] Submit error:", err);
      toast.error("Failed to create itinerary");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────

  const sheetTitle = isManual ? "Create Itinerary" : "Add New Option";
  const sheetDesc = isManual
    ? "Choose a source to create your itinerary"
    : "Choose a source for your new itinerary option";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-screen-xl w-full p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 py-3.5 border-b shrink-0">
          <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
          <SheetDescription className="text-xs">
            {sheetDesc}
          </SheetDescription>
        </SheetHeader>

        <SidebarProvider defaultOpen className="flex-1 !min-h-0">
          {/* ─── Left sidebar menu ─── */}
          <Sidebar
            collapsible="none"
            className="!h-full !static border-r bg-muted/30 w-[180px]"
          >
            <SidebarContent className="py-3">
              <SidebarGroup className="p-0">
                <SidebarGroupLabel className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Source
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5 px-2">
                    {menuItems.map((item) => {
                      const isActive = activeMenu === item.id;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => setActiveMenu(item.id)}
                            className={cn(
                              "h-auto py-2 px-2.5 hover:bg-background cursor-pointer rounded-md transition-all",
                              isActive
                                ? "bg-background shadow-sm border border-border text-foreground"
                                : "text-muted-foreground hover:text-foreground border border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2.5 w-full">
                              <div
                                className={cn(
                                  "h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <item.icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium leading-none">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* ─── Main content ─── */}
          <SidebarInset className="flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 flex">
              {activeMenu === "scratch" ? (
                <ScratchView meta={tripMeta} />
              ) : (
                <>
                  {/* Card list */}
                  <div className="w-[300px] shrink-0 border-r flex flex-col overflow-hidden bg-muted/10">
                    <div className="px-3.5 py-2.5 border-b">
                      <p className="text-xs font-semibold">
                        {activeMenu === "samples" && "Sample Templates"}
                        {activeMenu === "past" && "Past Itineraries"}
                        {activeMenu === "clone" && "Existing Options"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeMenu === "samples" &&
                          "Select a template to preview"}
                        {activeMenu === "past" &&
                          "Browse itineraries from past trips"}
                        {activeMenu === "clone" &&
                          "Duplicate an existing option"}
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {isListLoading ? (
                        <div className="flex items-center justify-center py-16">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : currentCards.length === 0 ? (
                        <EmptyCardList activeMenu={activeMenu} />
                      ) : (
                        <div className="p-2 space-y-1.5">
                          {currentCards.map((card) => (
                            <ItineraryCard
                              key={card.key}
                              card={card}
                              isSelected={selectedCard?.key === card.key}
                              onClick={() => loadPreview(card)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview panel */}
                  <div className="flex-1 overflow-y-auto">
                    {!selectedCard ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center space-y-3 px-8">
                          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 opacity-40" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              No item selected
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Choose an itinerary from the list to see a
                              day-by-day preview
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : previewLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <PreviewPanel
                        card={selectedCard}
                        days={previewDays}
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ─── Sticky bottom bar ─── */}
            <div className="shrink-0 border-t px-4 py-3 bg-background flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {activeMenu !== "scratch" && selectedCard
                  ? `Selected: ${selectedCard.label}`
                  : activeMenu === "scratch"
                    ? "An empty itinerary will be created"
                    : "Select an item to continue"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (activeMenu !== "scratch" && !selectedCard)
                  }
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {isManual ? "Create Itinerary" : "Add as New Option"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════

/** Itinerary card in the list panel */
function ItineraryCard({
  card,
  isSelected,
  onClick,
}: {
  card: PreviewCard;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full text-left rounded-lg p-3 transition-all group relative",
        isSelected
          ? "bg-primary/5 ring-1 ring-primary/30 shadow-sm"
          : "hover:bg-accent/60 ring-1 ring-transparent hover:ring-border"
      )}
      onClick={onClick}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      )}

      <div className="space-y-2 pr-6">
        {/* Destination / label */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-accent"
            )}
          >
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight">
              {card.label}
            </p>
            {card.sublabel && (
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {card.sublabel}
              </p>
            )}
          </div>
        </div>

        {/* Metadata chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-5 font-medium gap-1"
          >
            <Moon className="h-2.5 w-2.5" />
            {card.nights}N
          </Badge>
          {card.adults != null && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-5 font-medium gap-1"
            >
              <Users className="h-2.5 w-2.5" />
              {card.adults}A
              {card.children ? `, ${card.children}C` : ""}
            </Badge>
          )}
          {card.checkIn && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 font-normal gap-1 text-muted-foreground"
            >
              <CalendarIcon className="h-2.5 w-2.5" />
              {format(new Date(card.checkIn), "MMM d, yy")}
            </Badge>
          )}
          {card.theme && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 font-normal gap-1 capitalize text-muted-foreground"
            >
              <Palette className="h-2.5 w-2.5" />
              {card.theme.replace(/[-_]/g, " ")}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

/** Empty state for card lists */
function EmptyCardList({ activeMenu }: { activeMenu: MenuId }) {
  const messages: Record<MenuId, { title: string; desc: string }> = {
    samples: {
      title: "No samples found",
      desc: "Add sample itineraries in Docs > Itineraries",
    },
    past: {
      title: "No past itineraries",
      desc: "Past itineraries from this DMC will appear here",
    },
    clone: {
      title: "No options to clone",
      desc: "Create at least one option first",
    },
    scratch: { title: "", desc: "" },
  };
  const msg = messages[activeMenu];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{msg.title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{msg.desc}</p>
    </div>
  );
}

/** Day-wise preview panel */
function PreviewPanel({
  card,
  days,
}: {
  card: PreviewCard;
  days: PreviewDay[] | null;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Summary header */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryChip icon={MapPin} label="Destination" value={card.destination} />
        <SummaryChip
          icon={Moon}
          label="Duration"
          value={`${card.nights} nights`}
        />
        {card.adults != null && (
          <SummaryChip
            icon={Users}
            label="Travelers"
            value={`${card.adults}A${card.children ? ` ${card.children}C` : ""}`}
          />
        )}
        {card.checkIn && (
          <SummaryChip
            icon={CalendarIcon}
            label="Date"
            value={format(new Date(card.checkIn), "MMM d, yy")}
          />
        )}
        {card.theme && (
          <SummaryChip
            icon={Palette}
            label="Theme"
            value={card.theme.replace(/[-_]/g, " ")}
            capitalize
          />
        )}
      </div>

      {/* Day-wise view */}
      {days && days.length > 0 ? (
        <div className="space-y-2.5">
          {days.map((day) => (
            <DayPreviewCard key={day.day} day={day} />
          ))}
        </div>
      ) : days && days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No day-wise details available
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Small info chip for the preview summary header */
function SummaryChip({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2.5 bg-muted/20">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">
          {label}
        </p>
        <p className={cn("text-xs font-medium truncate mt-0.5", capitalize && "capitalize")}>{value}</p>
      </div>
    </div>
  );
}

/** Single day card in the preview */
function DayPreviewCard({ day }: { day: PreviewDay }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/30">
        <div className="h-6 w-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 bg-primary/10 text-primary">
          {day.day}
        </div>
        {day.date && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(day.date), "EEE, MMM d")}
          </span>
        )}
        {day.title && (
          <span className="text-xs font-medium truncate">{day.title}</span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
          {day.activities.length}{" "}
          {day.activities.length === 1 ? "activity" : "activities"}
        </span>
      </div>

      {/* Activities */}
      {day.activities.length > 0 ? (
        <div className="divide-y">
          {day.activities.map((act, idx) => {
            const Icon = SERVICE_ICONS[act.type] || Package;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-3 py-2"
              >
                <div className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-accent text-accent-foreground">
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{act.name}</p>
                  {act.subtitle && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {act.subtitle}
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className="text-[9px] shrink-0 capitalize h-4 px-1.5"
                >
                  {act.type}
                </Badge>
                {act.duration && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {act.duration}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-3 text-center text-[10px] text-muted-foreground">
          No activities planned
        </div>
      )}

      {/* Overnight */}
      {day.overnight && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t bg-muted/20">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Overnight: {day.overnight}
          </span>
        </div>
      )}
    </div>
  );
}

/** Scratch (start from empty) view */
function ScratchView({
  meta,
}: {
  meta: { destination: string; nights: number | null; checkIn: string | null; adults: number; children: number };
}) {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h3 className="text-sm font-semibold">Start from Scratch</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Create an empty itinerary, then build it day-by-day in the Trip
            panel.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Trip details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MetaField label="Destination" value={meta.destination} />
            <MetaField
              label="Check-in"
              value={
                meta.checkIn
                  ? format(new Date(meta.checkIn), "MMM d, yyyy")
                  : "Not specified"
              }
            />
            <MetaField
              label="Duration"
              value={
                meta.nights != null ? `${meta.nights} nights` : "Not specified"
              }
            />
            <MetaField
              label="Travelers"
              value={`${meta.adults} adults${meta.children > 0 ? `, ${meta.children} children` : ""}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

/** Extract trip metadata from either mode */
function deriveTripMeta(mode: SheetMode) {
  if (mode.type === "add-option") {
    const base = mode.currentOptions[0];
    return {
      destination: base?.destination || "Unknown",
      nights: base?.nights ?? null,
      checkIn: base?.check_in ?? null,
      adults: base?.adults || 2,
      children: base?.children || 0,
      childrenAges: base?.children_ages || undefined,
    };
  }
  const q = mode.query;
  return {
    destination: q.travel_country_names?.join(", ") || "Unknown",
    nights: q.duration || null,
    checkIn: q.travel_date || null,
    adults: q.pax_details?.adults || 2,
    children: q.pax_details?.children || 0,
    childrenAges: q.pax_details?.children_ages || undefined,
  };
}

// ─── Add-option submit ──────────────────────────────

async function handleAddOptionSubmit(
  mode: Extract<SheetMode, { type: "add-option" }>,
  activeMenu: MenuId,
  selectedCard: PreviewCard | null,
  tripMeta: ReturnType<typeof deriveTripMeta>
) {
  if (activeMenu === "scratch") {
    const result = await addOptionToChat(mode.chatId, { type: "scratch" });
    if (!result) throw new Error("Failed to create empty option");
    toast.success(`Option ${result.option_number} created`);
    mode.onCreated(result.option_number);
    return;
  }

  if (!selectedCard) return;

  let result: ChatItinerary | null = null;

  if (selectedCard.source === "clone") {
    result = await addOptionToChat(mode.chatId, {
      type: "clone",
      sourceOptionNumber: selectedCard.raw.option_number,
    });
  } else if (selectedCard.source === "past") {
    result = await addOptionToChat(mode.chatId, {
      type: "past",
      sourceChatId: selectedCard.raw.chat_id,
      sourceOptionNumber: selectedCard.raw.option_number,
    });
  } else if (selectedCard.source === "sample") {
    result = await addOptionToChat(mode.chatId, {
      type: "sample",
      sampleContent: selectedCard.raw.content,
      checkIn:
        tripMeta.checkIn || format(new Date(), "yyyy-MM-dd"),
      pax: { adults: tripMeta.adults, children: tripMeta.children },
    });
  }

  if (!result) throw new Error("Failed to add option");
  toast.success(`Option ${result.option_number} created`);
  mode.onCreated(result.option_number);
}

// ─── Manual submit ──────────────────────────────────

async function handleManualSubmit(
  mode: Extract<SheetMode, { type: "manual" }>,
  activeMenu: MenuId,
  selectedCard: PreviewCard | null,
  dmcId: string
) {
  const { queryId, query, initialMessage, onCreated } = mode;

  // Ensure chat exists
  const chatId = await ensureChatForQuery(queryId, dmcId);
  if (!chatId) throw new Error("Failed to create chat");

  const nights = query.duration || 3;
  const checkIn = query.travel_date
    ? new Date(query.travel_date)
    : new Date();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);

  if (activeMenu === "scratch") {
    const result = await ensureItinerary(chatId, {
      chat_id: chatId,
      destination: query.travel_country_names?.join(", ") || "Unknown",
      check_in: format(checkIn, "yyyy-MM-dd"),
      check_out: format(checkOut, "yyyy-MM-dd"),
      nights,
      adults: query.pax_details?.adults || 2,
      children: query.pax_details?.children || 0,
      children_ages: query.pax_details?.children_ages || undefined,
    });
    if (!result) throw new Error("Failed to create itinerary");

    await pushInitialMessage(chatId, initialMessage);
    toast.success("Itinerary created!");
    onCreated(chatId);
    return;
  }

  if (!selectedCard) return;

  if (selectedCard.source === "past") {
    const existingItinerary = await getChatItinerary(chatId);
    if (existingItinerary) {
      toast.success("Itinerary already exists for this query");
      onCreated(chatId);
      return;
    }
    const result = await cloneItineraryToChat(
      selectedCard.raw.chat_id,
      chatId,
      selectedCard.raw.option_number
    );
    if (!result) throw new Error("Failed to clone itinerary");

    await pushInitialMessage(chatId, initialMessage);
    toast.success("Itinerary imported successfully");
    onCreated(chatId);
  } else if (selectedCard.source === "sample") {
    let parsedContent: any = {};
    try {
      parsedContent = JSON.parse(selectedCard.raw.content);
    } catch {}

    const result = await ensureItinerary(chatId, {
      chat_id: chatId,
      destination:
        selectedCard.raw.country_name ||
        parsedContent.destination ||
        "Unknown",
      destination_code: parsedContent.destination_code || undefined,
      check_in: format(checkIn, "yyyy-MM-dd"),
      check_out: format(checkOut, "yyyy-MM-dd"),
      nights,
      adults: query.pax_details?.adults || 2,
      children: query.pax_details?.children || 0,
      children_ages: query.pax_details?.children_ages || undefined,
    });
    if (!result) throw new Error("Failed to create itinerary from sample");

    if (parsedContent.days && Array.isArray(parsedContent.days)) {
      await importSampleActivities(
        chatId,
        result.id,
        parsedContent.days,
        format(checkIn, "yyyy-MM-dd"),
        {
          adults: query.pax_details?.adults || 2,
          children: query.pax_details?.children || 0,
        }
      );
    }

    await pushInitialMessage(chatId, initialMessage);
    toast.success("Sample itinerary imported successfully");
    onCreated(chatId);
  }
}

// ─── Shared helpers for manual mode ─────────────────

async function ensureChatForQuery(
  queryId: string,
  dmcId: string
): Promise<string | null> {
  const existing = await getAIChatByQueryId(queryId);
  if (existing) return existing.id;

  const chat = await createChatWithQuery(dmcId, "Manual Itinerary", queryId);
  if (!chat) {
    toast.error("Failed to create chat for itinerary");
    return null;
  }
  return chat.id;
}

async function pushInitialMessage(chatId: string, message: string) {
  try {
    const existing = await getMessages(chatId);
    if (existing.length > 0) return;
    await createMessage({
      chat_id: chatId,
      role: "user",
      content: message,
      version: 1,
    });
  } catch (error) {
    console.error("[ItinerarySourceSheet] Error pushing initial message:", error);
  }
}

async function ensureItinerary(
  chatId: string,
  input: Parameters<typeof createChatItinerary>[0]
): Promise<ChatItinerary | null> {
  const existing = await getChatItinerary(chatId);
  if (existing) return existing;
  return createChatItinerary(input);
}

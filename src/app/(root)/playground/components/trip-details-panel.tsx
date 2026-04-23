"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowLeftToLine,
  Undo2,
  Redo2,
  Plus,
  Minus,
  CalendarIcon,
  Star,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import Itineraries from "./trip-details/itineraries";
import ServiceRates from "./trip-details/service-rates";
import ShareTab from "./trip-details/share-tab";
import type { ChatItinerary } from "@/data-access/chat-itinerary";
import { createClient } from "@/utils/supabase/client";
import debounce from "lodash/debounce";
import { PiListChecks, PiMoneyWavy, PiShareNetwork } from "react-icons/pi";
import { ItinerarySourceSheet } from "@/components/shared/itinerary-source-sheet";

interface TripDetailsPanelProps {
  itinerary: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  chatId: string;
  dmcId: string;
  isGenerating?: boolean;
  onSendMessage?: (message: string) => Promise<void>;
  fromQuery?: boolean;
  latestMessageId?: string;
}

interface ChildAge {
  id: number;
  age: number;
}

const sidebarNavItems = [
  { id: "itinerary", label: "Itinerary", icon: PiListChecks },
  { id: "rates", label: "Rates", icon: PiMoneyWavy },
  { id: "share", label: "Share", icon: PiShareNetwork },
];

// Sidebar component that uses useSidebar hook
function TripSidebar({
  activeTab,
  onTabChange,
  isExpanded,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isExpanded: boolean;
}) {
  const { toggleSidebar, state } = useSidebar();

  // Sync sidebar state with panel expansion
  useEffect(() => {
    if (isExpanded && state === "collapsed") {
      toggleSidebar();
    } else if (!isExpanded && state === "expanded") {
      toggleSidebar();
    }
  }, [isExpanded]);

  return (
    <Sidebar collapsible="icon" className="!h-full !static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {sidebarNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "h-9 hover:bg-muted cursor-pointer",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 pb-0 border-t">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 mx-auto">
          <ChevronsRight className={cn("h-4 w-4 transition-transform", state === "expanded" && "rotate-180")} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function TripDetailsPanel({
  itinerary,
  isExpanded,
  onToggleExpanded,
  chatId,
  dmcId,
  isGenerating = false,
  onSendMessage,
  fromQuery = false,
  latestMessageId,
}: TripDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState("itinerary");
  const [totalAmount, setTotalAmount] = useState<{ amount: number; currency: string } | null>(null);

  // Multi-option support
  const [options, setOptions] = useState<ChatItinerary[]>([]);
  const [selectedOption, setSelectedOption] = useState<number>(1);
  const [itineraryRefreshKey, setItineraryRefreshKey] = useState(0);
  const [showAddOptionSheet, setShowAddOptionSheet] = useState(false);

  // Track previous isGenerating to detect when generation completes
  const wasGeneratingRef = useRef(isGenerating);
  // Ref to read current selectedOption without triggering useCallback recreation
  const selectedOptionRef = useRef(selectedOption);
  selectedOptionRef.current = selectedOption;
  // Track whether user has ever manually picked an option (don't override their choice)
  const hasUserSelectedRef = useRef(false);

  // Fetch options directly via browser Supabase client (bypasses server action caching)
  const fetchOptionsDirect = useCallback(async () => {
    if (!chatId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_itineraries")
      .select("*")
      .eq("chat_id", chatId)
      .order("option_number", { ascending: true });

    if (error) {
      console.error("[TripDetailsPanel] Error fetching options:", error);
      return;
    }

    const result = (data || []) as ChatItinerary[];
    setOptions(result);

    // Only auto-select if user hasn't manually picked an option
    if (!hasUserSelectedRef.current) {
      const recommended = result.find((o) => o.recommended);
      if (recommended) {
        setSelectedOption(recommended.option_number);
      } else if (result.length > 0) {
        setSelectedOption(result[0].option_number);
      }
    } else if (result.length > 0 && !result.some((o) => o.option_number === selectedOptionRef.current)) {
      // Current selection was deleted — fall back to first available
      setSelectedOption(result[0].option_number);
    }
  }, [chatId]);

  // Reset user selection flag when switching to a different chat
  useEffect(() => {
    hasUserSelectedRef.current = false;
  }, [chatId]);

  // Fetch options when chatId is available or generation completes
  useEffect(() => {
    if (!chatId) return;

    // Always fetch when generation transitions from true → false
    if (wasGeneratingRef.current && !isGenerating) {
      hasUserSelectedRef.current = false; // Allow auto-select on fresh generation
      fetchOptionsDirect();
    }
    // Also fetch on mount and when latestMessageId changes (non-generating)
    else if (!isGenerating) {
      fetchOptionsDirect();
    }

    wasGeneratingRef.current = isGenerating;
  }, [chatId, latestMessageId, isGenerating, fetchOptionsDirect]);

  // Supabase Realtime: auto-update options when new rows are inserted
  useEffect(() => {
    if (!chatId) return;

    const supabase = createClient();

    const debouncedFetch = debounce(() => {
      console.log("[TripDetailsPanel] 📡 Realtime: chat_itineraries changed");
      fetchOptionsDirect();
    }, 300);

    const channel = supabase
      .channel(`chat-itineraries-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_itineraries",
          filter: `chat_id=eq.${chatId}`,
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      debouncedFetch.cancel();
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchOptionsDirect]);

  // Traveler edit popover states
  const [travelerPopoverOpen, setTravelerPopoverOpen] = useState(false);
  const [editAdults, setEditAdults] = useState(0);
  const [editChildren, setEditChildren] = useState<ChildAge[]>([]);
  const [editInfants, setEditInfants] = useState(0);

  // Date edit popover states
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>();

  const handleTotalChange = useCallback((amount: number, currency: string) => {
    setTotalAmount({ amount, currency });
  }, []);

  // Callback to refresh itinerary when activity is deleted from rates
  const handleActivityDeleted = useCallback(() => {
    setItineraryRefreshKey((prev) => prev + 1);
  }, []);

  // Handle tab change - auto-expand for rates tab
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      // Auto-expand when switching to rates tab (stays expanded when leaving)
      if (tab === "rates" && !isExpanded) {
        onToggleExpanded();
      }
    },
    [isExpanded, onToggleExpanded]
  );

  // Initialize traveler edit form with current values
  const openTravelerPopover = useCallback(() => {
    const travelers = itinerary?.itinerary_data?.travelers || {};
    setEditAdults(travelers.adults || 0);
    setEditInfants(travelers.infants || 0);

    // Get child ages from multiple possible sources:
    // 1. itinerary.children_ages (direct column on chat_itineraries, stored as string[])
    // 2. travelers.children_ages (array of numbers)
    // 3. travelers.children (array of objects with age property)
    let childAges: number[] = [];

    if (itinerary?.children_ages && Array.isArray(itinerary.children_ages)) {
      // From chat_itineraries.children_ages column (strings)
      childAges = itinerary.children_ages
        .map((age: string | number) => (typeof age === "string" ? parseInt(age, 10) : age))
        .filter((age: number) => !isNaN(age));
    } else if (travelers.children_ages && Array.isArray(travelers.children_ages)) {
      // From itinerary_data.travelers.children_ages
      childAges = travelers.children_ages;
    } else if (travelers.children && Array.isArray(travelers.children)) {
      // From itinerary_data.travelers.children (array of objects)
      childAges = travelers.children.map((c: { age: number }) => c.age);
    }

    const children: ChildAge[] = childAges.map((age, i) => ({ id: i, age: age || 5 }));
    setEditChildren(children);
    setTravelerPopoverOpen(true);
  }, [itinerary]);

  // Initialize date edit form with current values
  const openDatePopover = useCallback(() => {
    const checkIn = itinerary?.check_in ? new Date(itinerary.check_in) : undefined;
    const checkOut = itinerary?.check_out ? new Date(itinerary.check_out) : undefined;
    setEditDateRange({ from: checkIn, to: checkOut });
    setDatePopoverOpen(true);
  }, [itinerary]);

  // Handle traveler count changes
  const addChild = useCallback(() => {
    setEditChildren((prev) => [...prev, { id: Date.now(), age: 5 }]);
  }, []);

  const removeChild = useCallback((id: number) => {
    setEditChildren((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateChildAge = useCallback((id: number, age: number) => {
    setEditChildren((prev) => prev.map((c) => (c.id === id ? { ...c, age } : c)));
  }, []);

  // Format and send traveler update message
  const handleTravelerUpdate = useCallback(async () => {
    if (!onSendMessage) return;

    let message = `Change pax details to ${editAdults}A`;
    if (editChildren.length > 0) {
      const childAges = editChildren.map((c) => `${c.age}yr`).join(", ");
      message += `, ${editChildren.length}C(${childAges})`;
    }
    if (editInfants > 0) {
      message += `, ${editInfants}INF`;
    }

    setTravelerPopoverOpen(false);
    await onSendMessage(message);
  }, [onSendMessage, editAdults, editChildren, editInfants]);

  // Format and send date update message
  const handleDateUpdate = useCallback(async () => {
    if (!onSendMessage || !editDateRange?.from || !editDateRange?.to) return;

    const fromStr = format(editDateRange.from, "dd MMM yyyy");
    const toStr = format(editDateRange.to, "dd MMM yyyy");
    const message = `Change dates to ${fromStr} - ${toStr}`;

    setDatePopoverOpen(false);
    await onSendMessage(message);
  }, [onSendMessage, editDateRange]);

  // Show panel even during generation with loading state
  const hasItinerary = !!itinerary?.itinerary_data;
  if (!hasItinerary && !isGenerating) return null;

  // Get data from selected option if multiple options exist, otherwise use the prop
  const selectedOptionData = options.length > 0 ? options.find((o) => o.option_number === selectedOption) : null;

  const days = itinerary?.itinerary_data?.days || [];
  const travelers = itinerary?.itinerary_data?.travelers || {};
  // Handle both old format (string) and new format (object {country, city, code})
  const rawDestination = itinerary?.itinerary_data?.destination || "Trip";
  const destination =
    typeof rawDestination === "string" ? rawDestination : rawDestination?.country || rawDestination?.city || "Trip";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden h-full transition-all duration-300",
        isExpanded ? "lg:col-span-7" : "lg:col-span-3",
        !fromQuery && "border-l"
      )}
    >
      {/* Header */}
      <div className="space-y-2 shrink-0 border-b px-3 py-2">
        <div className="flex justify-between w-full gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <p className="text-lg font-bold leading-normal truncate">
              {itinerary?.itinerary_data?.trip_name || `Exploring ${destination}`}
            </p>
            {totalAmount && totalAmount.amount > 0 && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 shrink-0 text-sm font-semibold px-2.5 py-1"
              >
                {totalAmount.currency}{" "}
                {totalAmount.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Undo changes">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Redo changes">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button onClick={onToggleExpanded} className="gap-2" size={"sm"}>
              <ArrowLeftToLine
                className={cn("size-4 stroke-2 transition-all ease-in-out", isExpanded && "rotate-180")}
              />
              {isExpanded ? "Chat" : "Expand"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex gap-2 flex-wrap">
            {/* Traveler Edit Popover */}
            <Popover open={travelerPopoverOpen} onOpenChange={setTravelerPopoverOpen}>
              <PopoverTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-muted-foreground py-1.5 text-[10px] cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={openTravelerPopover}
                >
                  {travelers.adults || 0}A{travelers.children > 0 && `, ${travelers.children}C`}
                  {travelers.infants > 0 && `, ${travelers.infants}INF`}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Edit Travelers</h4>

                  {/* Adults */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Adults</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditAdults((prev) => Math.max(1, prev - 1))}
                        disabled={editAdults <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{editAdults}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditAdults((prev) => prev + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Children</Label>
                      <Button variant="outline" size="sm" onClick={addChild} className="h-8">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Child
                      </Button>
                    </div>
                    {editChildren.map((child, index) => (
                      <div key={child.id} className="flex items-center gap-2 pl-2">
                        <span className="text-sm text-muted-foreground w-16">Child {index + 1}</span>
                        <Input
                          type="number"
                          min={0}
                          max={17}
                          value={child.age}
                          onChange={(e) => updateChildAge(child.id, parseInt(e.target.value) || 0)}
                          className="h-8 w-20"
                          placeholder="Age"
                        />
                        <span className="text-sm text-muted-foreground">years</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeChild(child.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Infants */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Infants (0-2 yrs)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditInfants((prev) => Math.max(0, prev - 1))}
                        disabled={editInfants <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{editInfants}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditInfants((prev) => prev + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Update Button */}
                  <Button className="w-full" onClick={handleTravelerUpdate} disabled={!onSendMessage}>
                    Update Travelers
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Badge variant="outline" className="text-muted-foreground py-1.5 text-[10px]">
              {destination}
            </Badge>

            {/* Date Range Edit Popover */}
            {itinerary?.check_in && itinerary?.check_out && (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground py-1.5 text-[10px] cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={openDatePopover}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(new Date(itinerary.check_in), "dd MMM ''yy")} -{" "}
                    {format(new Date(itinerary.check_out), "dd MMM ''yy")}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 border-b">
                    <h4 className="font-medium text-sm">Edit Travel Dates</h4>
                  </div>
                  <Calendar
                    mode="range"
                    selected={editDateRange}
                    onSelect={setEditDateRange}
                    numberOfMonths={2}
                    defaultMonth={editDateRange?.from}
                    disabled={{ before: new Date() }}
                  />
                  <div className="p-3 border-t">
                    <Button
                      className="w-full"
                      onClick={handleDateUpdate}
                      disabled={!onSendMessage || !editDateRange?.from || !editDateRange?.to}
                    >
                      Update Dates
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Options area - show when at least 1 option exists */}
          {options.length >= 1 && (
            <div className="flex items-center gap-1 shrink-0">
              {options.length === 1 ? (
                <Badge variant="secondary" className="py-1.5">
                  Option {selectedOption}
                  {options[0]?.recommended && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 ml-1" />}
                </Badge>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="secondary" className="cursor-pointer py-1.5 gap-1">
                      Option {selectedOption}
                      {options.find((o) => o.option_number === selectedOption)?.recommended && (
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      )}
                      <ChevronDown className="w-3 h-3" />
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {options.map((opt) => (
                      <DropdownMenuItem
                        key={opt.option_number}
                        onClick={() => {
                          hasUserSelectedRef.current = true;
                          setSelectedOption(opt.option_number);
                        }}
                        className={cn("cursor-pointer", selectedOption === opt.option_number && "bg-accent")}
                      >
                        <span className="flex items-center gap-2">
                          Option {opt.option_number}
                          {opt.recommended && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowAddOptionSheet(true)}
                title="Add new option"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <SidebarProvider defaultOpen={isExpanded} className={cn("!min-h-0 flex-1 h-full")}>
        <TripSidebar activeTab={activeTab} onTabChange={handleTabChange} isExpanded={isExpanded} />
        <SidebarInset className="flex flex-col overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 min-h-0 mt-3 overflow-hidden">
            {activeTab === "itinerary" && (
              <div className="h-full overflow-x-hidden overflow-y-auto px-3">
                <h4 className="text-sm font-semibold">Trip Itinerary</h4>
                <Itineraries
                  days={days}
                  chatId={chatId}
                  dmcId={dmcId}
                  isLoading={isGenerating && days.length === 0}
                  itineraryData={itinerary?.itinerary_data}
                  optionNumber={selectedOption}
                  isPanelExpanded={isExpanded}
                  checkInDate={selectedOptionData?.check_in || itinerary?.check_in}
                  numNights={selectedOptionData?.nights || itinerary?.nights}
                  refreshKey={itineraryRefreshKey}
                  onItineraryUpdate={(newData) => {
                    // Update the local state to reflect changes immediately
                    // The database is already updated by the mutations hook
                    setOptions((prev) => {
                      // If we have existing options, update the matching one
                      if (prev.length > 0) {
                        const exists = prev.some((opt) => opt.option_number === selectedOption);
                        if (exists) {
                          return prev.map((opt) =>
                            opt.option_number === selectedOption ? { ...opt, itinerary_data: newData } : opt
                          );
                        }
                      }
                      // Otherwise create a new entry
                      return [{ option_number: selectedOption, itinerary_data: newData } as ChatItinerary];
                    });
                  }}
                />
              </div>
            )}

            {activeTab === "rates" && (
              <div className="h-full overflow-y-auto">
                <ServiceRates
                  chatId={chatId}
                  messageId={latestMessageId}
                  optionNumber={selectedOption}
                  dayDates={days.map((d: any) => d.date)}
                  days={days.map((d: any, idx: number) => ({
                    day_number: idx + 1,
                    date: d.date,
                    activities: (d.activities || []).map((a: any) => {
                      // Determine service type from multiple possible fields
                      let serviceType = a.service_type || a.package_type || a.type;
                      // Fallback: infer from which name field exists
                      if (!serviceType) {
                        if (a.hotel_name) serviceType = "hotel";
                        else if (a.tour_name) serviceType = "tour";
                        else if (a.transfer_name) serviceType = "transfer";
                        else serviceType = "other";
                      }
                      return {
                        service_type: serviceType,
                        name:
                          a.hotel_name ||
                          a.tour_name ||
                          a.transfer_name ||
                          a.title ||
                          a.activity ||
                          a.name ||
                          "Unknown",
                        id: a.id || a.activity_id,
                      };
                    }),
                  }))}
                  onTotalChange={handleTotalChange}
                  onActivityDeleted={handleActivityDeleted}
                />
              </div>
            )}

            {activeTab === "share" && (
              <div className="h-full overflow-x-hidden overflow-y-auto space-y-3 px-3 py-2">
                <h4 className="text-sm font-semibold">Share Quote</h4>
                <ShareTab messageId={latestMessageId} />
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ItinerarySourceSheet
        open={showAddOptionSheet}
        onOpenChange={setShowAddOptionSheet}
        dmcId={dmcId}
        mode={{
          type: "add-option",
          chatId,
          currentOptions: options,
          onCreated: (optionNum) => {
            hasUserSelectedRef.current = true;
            setSelectedOption(optionNum);
            fetchOptionsDirect();
          },
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";
import S3Image from "@/components/ui/s3-image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  updateActivity,
  getHotelActivitiesByServiceId,
  getHotelActivitiesByParentAndServiceId,
  type HotelActivity,
} from "@/data-access/itinerary-activities";
import {
  getServiceDetailsByServiceId,
  getHotelRoomsByHotelId,
  type HotelRoomDetails,
} from "@/data-access/service-details";
import {
  getServiceBreakupsByActivityId,
  getServiceBreakupsByChat,
  updateServiceBreakup,
  createManualBreakup,
  deleteServiceBreakup,
  type ServiceBreakup,
} from "@/data-access/service-breakups";
import { getMessages } from "@/data-access/travel-agent";
import { getChatItinerary } from "@/data-access/chat-itinerary";
import { HotelOverviewTab } from "./hotel-sheet/hotel-overview-tab";
import { HotelPoliciesTab } from "./hotel-sheet/hotel-policies-tab";
import { HotelPricingTab } from "./hotel-sheet/hotel-pricing-tab";
import type { HotelSheetContextValue, HotelFormData, AvailableRoom, ItineraryInfo } from "./hotel-sheet/types";

interface HotelActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: HotelActivity | null;
  onActivityUpdate?: (updatedActivity: HotelActivity) => void;
  onRefresh?: () => void;
}

export default function HotelActivitySheet({
  open,
  onOpenChange,
  activity,
  onActivityUpdate,
  onRefresh,
}: HotelActivitySheetProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hotelDetails, setHotelDetails] = useState<HotelRoomDetails | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [breakups, setBreakups] = useState<ServiceBreakup[]>([]);
  const [allActivities, setAllActivities] = useState<HotelActivity[]>([]);
  const [itineraryInfo, setItineraryInfo] = useState<ItineraryInfo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Aggregated form state
  const [formData, setFormData] = useState<HotelFormData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load all hotel activities and aggregate data
  useEffect(() => {
    if (open && activity) {
      loadAllData();
    }
  }, [open, activity]);

  const loadAllData = async () => {
    if (!activity) return;

    console.log("[HotelActivitySheet] loadAllData called", {
      rooms: activity.rooms,
      chat_id: activity.chat_id,
      service_id: activity.service_id,
      service_parent_id: activity.service_parent_id,
    });

    // Always set initial form data from activity
    setFormData({ ...activity, allActivityIds: [activity.id] });
    setAllActivities([activity]);

    setLoading(true);

    // Load itinerary info for day/date constraints
    if (activity.chat_id) {
      try {
        const itinerary = await getChatItinerary(activity.chat_id, activity.option_number || 1);
        console.log("[HotelActivitySheet] Loaded itinerary:", {
          chat_id: activity.chat_id,
          option_number: activity.option_number,
          itinerary: itinerary ? { nights: itinerary.nights, check_in: itinerary.check_in } : null,
        });
        if (itinerary) {
          setItineraryInfo({
            nights: itinerary.nights,
            checkIn: itinerary.check_in,
          });
        } else {
          // Fallback: calculate nights from activity data
          const nights = activity.day_number || 7; // Use current day as minimum
          const checkIn = activity.check_in_date || activity.day_date;
          if (checkIn) {
            setItineraryInfo({ nights, checkIn });
          }
        }
      } catch (error) {
        console.error("[HotelActivitySheet] Error loading itinerary:", error);
      }
    }

    // Load hotel details - use service_parent_id (hotel_id) if available, fallback to service_id
    const hotelIdToFetch = activity.service_parent_id || activity.service_id;
    let loadedHotelDetails: HotelRoomDetails | null = null;
    if (hotelIdToFetch) {
      try {
        const { data } = await getServiceDetailsByServiceId(activity.service_id || hotelIdToFetch, "hotel");
        if (data?.type === "hotel") {
          loadedHotelDetails = data.data;
          setHotelDetails(data.data);
          // If hotelDetails has images and activity doesn't, use hotelDetails images
          if (data.data.images && data.data.images.length > 0 && (!activity.images || activity.images.length === 0)) {
            setFormData(prev => ({ ...prev, images: data.data.images }));
          }
          // Use service_parent_id as hotel_id, or get from response
          const hotelId = activity.service_parent_id || data.data.hotel_id;
          if (hotelId) {
            const { data: rooms } = await getHotelRoomsByHotelId(hotelId);
            setAvailableRooms(rooms || []);
          }
        }
      } catch (error) {
        console.error("[HotelActivitySheet] Error loading hotel details:", error);
      }
    }

    // Load breakups for current activity
    try {
      const actBreakups = await getServiceBreakupsByActivityId(activity.id);
      setBreakups(actBreakups);
    } catch (error) {
      console.error("[HotelActivitySheet] Error loading breakups:", error);
    }

    // If no chat_id, we can't fetch related activities
    if (!activity.chat_id) {
      setLoading(false);
      return;
    }

    // Try to aggregate with other activities for same hotel
    // Use service_parent_id (hotel_id) AND service_id (room_id) for grouping
    try {
      let activities: HotelActivity[] = [];

      if (activity.service_parent_id && activity.service_id) {
        // Best case: use both parent and service ID
        console.log("[HotelActivitySheet] Fetching by service_parent_id + service_id:", {
          service_parent_id: activity.service_parent_id,
          service_id: activity.service_id,
        });
        activities = await getHotelActivitiesByParentAndServiceId(
          activity.chat_id,
          activity.service_parent_id,
          activity.service_id,
          activity.option_number || 1
        );
      } else if (activity.service_id) {
        // Fallback: use service_id only
        console.log("[HotelActivitySheet] Fetching by service_id only:", activity.service_id);
        activities = await getHotelActivitiesByServiceId(
          activity.chat_id,
          activity.service_id,
          activity.option_number || 1
        );
      }

      console.log("[HotelActivitySheet] Fetched", activities.length, "activities from DB");

      if (activities.length > 0) {
        setAllActivities(activities);
        const aggregated = aggregateHotelData(activities);
        console.log("[HotelActivitySheet] Aggregated data:", {
          check_in_date: aggregated.check_in_date,
          check_out_date: aggregated.check_out_date,
          rooms: aggregated.rooms,
          nights: activities.length,
          images: aggregated.images?.length || 0,
        });
        // If aggregated data has no images but loadedHotelDetails does, use loadedHotelDetails images
        if ((!aggregated.images || aggregated.images.length === 0) && loadedHotelDetails?.images && loadedHotelDetails.images.length > 0) {
          aggregated.images = loadedHotelDetails.images;
        }
        setFormData(aggregated);

        // Load breakups for all activities
        const allBreakups: ServiceBreakup[] = [];
        for (const act of activities) {
          const actBreakups = await getServiceBreakupsByActivityId(act.id);
          allBreakups.push(...actBreakups);
        }
        setBreakups(allBreakups);
      }
    } catch (error) {
      console.error("[HotelActivitySheet] Error loading activities:", error);
    }

    setHasChanges(false);
    setLoading(false);
  };

  // Aggregate hotel data from multiple activities
  const aggregateHotelData = (activities: HotelActivity[]): HotelFormData => {
    if (activities.length === 0) return {};

    // Sort by day_number to get first and last
    const sorted = [...activities].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
      ...first,
      // Use check-in from first activity, check-out from last
      check_in_date: first.check_in_date || first.day_date,
      check_out_date: last.check_out_date || last.day_date,
      check_in_time: first.check_in_time,
      check_out_time: last.check_out_time,
      early_checkin: first.early_checkin,
      late_checkout: last.late_checkout,
      // Rooms from first activity (should be same across all)
      rooms: first.rooms || [],
      room_pax_distribution: first.room_pax_distribution || [],
      // Images from first activity
      images: first.images || [],
      // Store all activity IDs for saving
      allActivityIds: activities.map((a) => a.id),
    };
  };

  const updateFormField = useCallback(
    <K extends keyof HotelActivity>(field: K, value: HotelActivity[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    },
    []
  );

  const updateBreakupField = useCallback((id: string, field: string, value: any) => {
    setBreakups((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }, []);

  const handleSave = async () => {
    if (!activity?.id || !formData.allActivityIds) return;

    setSaving(true);
    try {
      // Update all activities with the common data
      for (const actId of formData.allActivityIds) {
        const isFirst = actId === formData.allActivityIds[0];
        const isLast = actId === formData.allActivityIds[formData.allActivityIds.length - 1];

        const updateData = {
          hotel_name: formData.hotel_name,
          rooms: formData.rooms || [],
          room_pax_distribution: formData.room_pax_distribution || [],
          meal_plan: formData.meal_plan,
          meal_complimentary: formData.meal_complimentary,
          adults: formData.adults,
          teens: formData.teens,
          children: formData.children,
          infants: formData.infants,
          remarks: formData.remarks,
          offers: formData.offers,
          images: formData.images || [],
          // Check-in only on first activity
          ...(isFirst && {
            check_in_date: formData.check_in_date,
            check_in_time: formData.check_in_time,
            early_checkin: formData.early_checkin,
          }),
          // Check-out only on last activity
          ...(isLast && {
            check_out_date: formData.check_out_date,
            check_out_time: formData.check_out_time,
            late_checkout: formData.late_checkout,
          }),
        };

        console.log("[HotelActivitySheet] Saving activity:", actId, "rooms:", updateData.rooms, "distribution:", updateData.room_pax_distribution);

        const result = await updateActivity(actId, updateData);
        if (!result) {
          console.error("[HotelActivitySheet] Failed to update activity:", actId);
        }
      }

      toast.success("Changes saved");
      setHasChanges(false);
      if (allActivities[0]) {
        onActivityUpdate?.({ ...allActivities[0], ...formData } as HotelActivity);
      }
    } catch (error) {
      console.error("[HotelActivitySheet] Save error:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBreakups = async () => {
    setSaving(true);
    try {
      for (const b of breakups) {
        await updateServiceBreakup(b.id, {
          day_number: b.day_number,
          service_date: b.service_date,
          service_name: b.service_name,
          unit_type: b.unit_type,
          quantity: b.quantity,
          rate_per_unit: b.rate_per_unit,
          base_cost: b.base_cost,
          discount_amount: b.discount_amount,
          markup_amount: b.markup_amount,
          tax_amount: b.tax_amount,
          final_cost: b.final_cost,
        });
      }
      toast.success("Breakups saved");
    } catch (error) {
      toast.error("Failed to save breakups");
    } finally {
      setSaving(false);
    }
  };

  const addBreakup = async () => {
    if (!activity?.id || !activity?.chat_id) {
      toast.error("Cannot add breakup - missing activity data");
      return;
    }

    setSaving(true);
    try {
      // Get message_id: prefer from existing breakup, else from latest assistant message
      let messageId: string | null = null;

      // First try from existing breakups
      if (breakups.length > 0) {
        messageId = breakups[0].message_id;
      }

      // If no breakups, try to get from chat's breakups
      if (!messageId) {
        const chatBreakups = await getServiceBreakupsByChat(activity.chat_id, activity.option_number || 1);
        if (chatBreakups.length > 0) {
          messageId = chatBreakups[0].message_id;
        }
      }

      // If still no message_id, get from latest assistant message
      if (!messageId) {
        const messages = await getMessages(activity.chat_id);
        const assistantMsg = messages.filter((m) => m.role === "assistant").pop();
        if (assistantMsg) {
          messageId = assistantMsg.id;
        }
      }

      if (!messageId) {
        toast.error("Cannot add breakup - no message reference found");
        setSaving(false);
        return;
      }

      // Get next day number from existing breakups
      const maxDay = breakups.reduce((max, b) => Math.max(max, b.day_number || 0), 0);
      const newDayNumber = maxDay + 1;

      // Calculate service_date based on itinerary check-in
      let serviceDate: string | null = null;
      if (itineraryInfo?.checkIn) {
        const checkIn = new Date(itineraryInfo.checkIn);
        checkIn.setDate(checkIn.getDate() + newDayNumber - 1);
        serviceDate = checkIn.toISOString().split("T")[0];
      }

      const newBreakup = await createManualBreakup({
        chat_id: activity.chat_id,
        message_id: messageId,
        activity_id: activity.id,
        day_number: newDayNumber,
        service_date: serviceDate,
        service_name: formData.hotel_name || "Hotel",
        service_type: "hotel",
        quantity: 1,
        unit_type: "night",
        base_cost: 0,
        discount_amount: 0,
        markup_amount: 0,
        tax_amount: 0,
        final_cost: 0,
        currency: "USD",
        option_number: activity.option_number || 1,
      });

      if (newBreakup) {
        setBreakups((prev) => [...prev, newBreakup]);
        toast.success("Breakup added");
      } else {
        toast.error("Failed to add breakup");
      }
    } catch (error) {
      console.error("[HotelActivitySheet] Error adding breakup:", error);
      toast.error("Failed to add breakup");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBreakup = async (id: string) => {
    setSaving(true);
    try {
      const success = await deleteServiceBreakup(id);
      if (success) {
        setBreakups((prev) => prev.filter((b) => b.id !== id));
        toast.success("Breakup deleted");
      } else {
        toast.error("Failed to delete breakup");
      }
    } catch (error) {
      console.error("[HotelActivitySheet] Error deleting breakup:", error);
      toast.error("Failed to delete breakup");
    } finally {
      setSaving(false);
    }
  };

  const formatStarRating = (rating?: string | null) => {
    if (!rating) return null;
    const numMatch = rating.match(/\d+/);
    return numMatch ? `${numMatch[0]}*` : rating;
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    // Refresh activities when sheet closes
    if (!isOpen) {
      onRefresh?.();
    }
  };

  const ctx: HotelSheetContextValue = {
    formData,
    hotelDetails,
    availableRooms,
    breakups,
    saving,
    hasChanges,
    itineraryInfo,
    updateFormField,
    updateBreakupField,
    addBreakup,
    deleteBreakup: handleDeleteBreakup,
    handleSave,
    handleSaveBreakups,
  };

  if (!activity) return null;

  const nightsCount = allActivities.length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col" side="right">
        {/* Header */}
        <SheetHeader className="px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <SheetTitle className="text-left text-sm font-medium">
              {formData.hotel_name || "Hotel"}
            </SheetTitle>
            {formData.hotel_star_rating && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200"
              >
                <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                {formatStarRating(formData.hotel_star_rating)}
              </Badge>
            )}
            {nightsCount > 1 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {nightsCount} nights
              </Badge>
            )}
          </div>
          {(formData.hotel_city || formData.hotel_country) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[formData.hotel_city, formData.hotel_country].filter(Boolean).join(", ")}
            </div>
          )}
        </SheetHeader>

        {/* Image Gallery */}
        {formData.images && formData.images.length > 0 && (
          <div className="relative shrink-0 bg-muted">
            <div className="h-48 w-full relative">
              <S3Image
                url={formData.images[currentImageIndex]}
                alt={`${formData.hotel_name} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Image counter */}
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {currentImageIndex + 1} / {formData.images.length}
              </div>
              {/* Navigation buttons */}
              {formData.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? formData.images!.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => setCurrentImageIndex((prev) => (prev === formData.images!.length - 1 ? 0 : prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {/* Thumbnail strip */}
            {formData.images.length > 1 && (
              <div className="flex gap-1 p-2 overflow-x-auto">
                {formData.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                      idx === currentImageIndex ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <S3Image url={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="mx-3 mt-2 shrink-0 w-full max-w-lg">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="policies" className="text-xs">
              Policies
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">
              Pricing
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <TabsContent value="overview" className="mt-0">
              <HotelOverviewTab ctx={ctx} />
            </TabsContent>
            <TabsContent value="policies" className="mt-0">
              <HotelPoliciesTab ctx={ctx} />
            </TabsContent>
            <TabsContent value="pricing" className="mt-0">
              <HotelPricingTab ctx={ctx} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

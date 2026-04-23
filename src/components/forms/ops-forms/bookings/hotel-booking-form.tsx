"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { MapPin, Star, Phone, Mail, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BorderedCard } from "@/components/ui/bordered-card";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { saveBooking } from "@/data-access/bookings";
import {
  getServiceDetailsByServiceId,
  getHotelRoomsByHotelId,
  type HotelRoomDetails,
} from "@/data-access/service-details";
import { getChatItinerary, type ChatItinerary } from "@/data-access/chat-itinerary";
import type { HotelActivity } from "@/data-access/itinerary-activities";
import type { OpsBooking, BookingStatus, VoucherStatus } from "@/types/ops-bookings";
import type { ISupplierOption } from "@/types/suppliers";
import { hotelBookingSchema, type HotelBookingFormData } from "@/components/forms/schemas/booking-schema";
import { BookingDetailsSection, BOOKING_DEFAULTS } from "./booking-details-section";
import { PricingBreakupSection } from "./pricing-breakup-section";
import { usePricingBreakups } from "./use-pricing-breakups";
import { PaxRoomDistribution } from "@/app/(root)/playground/components/trip-details/hotel-sheet/pax-room-distribution";
import { HOTEL_MEAL_PLANS } from "@/constants/data";

interface HotelBookingFormProps {
  queryId: string;
  activityId: string;
  activity: HotelActivity;
  suppliers: ISupplierOption[];
  isLoadingSuppliers: boolean;
  existingBooking?: OpsBooking;
  onSuccess: () => void;
  onClose: () => void;
}

// Helper to build form default values
function getFormDefaults(activity: HotelActivity, existingBooking?: OpsBooking) {
  return {
    ...activity,
    check_in_date: activity.check_in_date ?? "",
    check_in_time: activity.check_in_time ?? "15:00",
    check_out_date: activity.check_out_date ?? "",
    check_out_time: activity.check_out_time ?? "11:00",
    early_checkin: activity.early_checkin ?? false,
    late_checkout: activity.late_checkout ?? false,
    meal_plan: activity.meal_plan ?? "",
    meal_complimentary: activity.meal_complimentary ?? false,
    rooms: activity.rooms && activity.rooms.length > 0 ? activity.rooms : [{ room_category: "", quantity: 1 }],
    room_pax_distribution: activity.room_pax_distribution ?? [],
    remarks: activity.remarks ?? "",
    ...(existingBooking
      ? {
          title: existingBooking.title ?? activity.hotel_name ?? "",
          supplier_id: existingBooking.supplier_id ?? "",
          booking_status: existingBooking.booking_status,
          voucher_status: existingBooking.voucher_status,
          confirmation_no: existingBooking.confirmation_no ?? "",
          notes: existingBooking.notes ?? "",
          reconfirmed_by: existingBooking.reconfirmed_by ?? "",
          currency: existingBooking.currency ?? activity.currency ?? "",
          cost_price: existingBooking.cost_price ?? activity.cost_price ?? 0,
        }
      : {
          ...BOOKING_DEFAULTS,
          title: activity.hotel_name ?? "",
          currency: activity.currency ?? "",
          cost_price: activity.cost_price ?? 0,
        }),
  };
}

function formatStarRating(rating?: string | null) {
  if (!rating) return null;
  const numMatch = rating.match(/\d+/);
  return numMatch ? `${numMatch[0]}` : rating;
}

async function loadBookingData(serviceId: string, chatId: string, serviceParentId?: string) {
  const [hotelResponse, itineraryData] = await Promise.all([
    getServiceDetailsByServiceId(serviceId, "hotel"),
    getChatItinerary(chatId),
  ]);

  const hotelData = hotelResponse.data?.type === "hotel" ? hotelResponse.data.data : null;
  const hotelId = serviceParentId || hotelData?.hotel_id;

  let rooms: HotelRoomDetails[] = [];
  if (hotelId) {
    const { data } = await getHotelRoomsByHotelId(hotelId);
    rooms = data || [];
  }

  return { hotelData, itineraryData, rooms };
}

export function HotelBookingForm({
  queryId,
  activityId,
  activity,
  suppliers,
  isLoadingSuppliers,
  existingBooking,
  onSuccess,
  onClose,
}: HotelBookingFormProps) {
  const router = useRouter();
  const isEditMode = !!existingBooking;

  const [activeTab, setActiveTab] = useState<"activity" | "booking">("activity");
  const [hotelDetails, setHotelDetails] = useState<HotelRoomDetails | null>(null);
  const [availableRooms, setAvailableRooms] = useState<HotelRoomDetails[]>([]);
  const [itinerary, setItinerary] = useState<ChatItinerary | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<HotelBookingFormData>({
    resolver: zodResolver(hotelBookingSchema),
    defaultValues: getFormDefaults(activity, existingBooking),
  });

  // Use pricing breakups hook
  const checkInDate = itinerary?.check_in || activity.check_in_date || activity.day_date;
  const { breakups, updateBreakupField, addBreakup, deleteBreakup, isDeleting } = usePricingBreakups({
    activityId,
    queryId,
    serviceType: "hotel",
    defaultServiceName: hotelDetails?.room_category || "Room",
    defaultServiceId: activity.service_id || "",
    defaultDayNumber: activity.day_number || 1,
    defaultCheckInDate: checkInDate || "",
    defaultCurrency: form.getValues("currency") || "USD",
    onTotalCostChange: (totalCost, currency) => {
      form.setValue("cost_price", totalCost > 0 ? totalCost : undefined);
      if (currency) {
        form.setValue("currency", currency);
      }
    },
  });

  useEffect(() => {
    let isMounted = true;
    setIsLoadingData(true);

    // If service_id is missing, only load itinerary (hotel details will be null)
    if (!activity.service_id) {
      console.warn("[HotelBookingForm] activity.service_id is missing, loading without hotel details");
      getChatItinerary(activity.chat_id)
        .then((itineraryData) => {
          if (!isMounted) return;
          setItinerary(itineraryData);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("[HotelBookingForm] Error loading itinerary:", error);
          toast.error("Failed to load itinerary details");
        })
        .finally(() => {
          if (isMounted) setIsLoadingData(false);
        });
    } else {
      loadBookingData(activity.service_id, activity.chat_id, activity.service_parent_id)
        .then(({ hotelData, itineraryData, rooms }) => {
          if (!isMounted) return;
          setItinerary(itineraryData);
          if (hotelData) setHotelDetails(hotelData);
          setAvailableRooms(rooms);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("[HotelBookingForm] Error loading data:", error);
          toast.error("Failed to load booking details");
        })
        .finally(() => {
          if (isMounted) setIsLoadingData(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activity.service_id, activity.service_parent_id, activity.chat_id]);

  // Reset form when activity or existingBooking changes
  useEffect(() => {
    form.reset(getFormDefaults(activity, existingBooking));
  }, [activity, existingBooking]);

  // Auto-select first supplier if available and no supplier is selected
  useEffect(() => {
    if (!isLoadingSuppliers && suppliers.length > 0 && !form.getValues("supplier_id")) {
      form.setValue("supplier_id", suppliers[0].value);
    }
  }, [suppliers, isLoadingSuppliers]);

  const rooms = form.watch("rooms") || [];
  const roomPaxDistribution = form.watch("room_pax_distribution") || [];

  const paymentStatus = existingBooking?.payment_status;
  const isPaymentLocked = isEditMode && !!paymentStatus && paymentStatus !== "not_configured";

  // Calculate max days - use itinerary or derive from breakups/activity
  const maxDays = itinerary?.nights
    ? itinerary.nights + 1
    : Math.max(activity.day_number || 7, ...breakups.map((b) => b.day_number || 0), 7);

  // Generate available days
  const availableDays = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Calculate date for a given day number
  const getDateForDay = (dayNumber: number): string => {
    if (!checkInDate) return "";
    const checkIn = new Date(checkInDate);
    checkIn.setDate(checkIn.getDate() + dayNumber - 1);
    return checkIn.toISOString().split("T")[0];
  };

  // Handle day change - also update the service_date
  const handleDayChange = (breakupId: string, newDay: number) => {
    updateBreakupField(breakupId, "day_number", newDay);
    const newDate = getDateForDay(newDay);
    if (newDate) {
      updateBreakupField(breakupId, "service_date", newDate);
    }
  };

  const handleSaveBooking = async () => {
    setIsSavingBooking(true);

    try {
      const formData = form.getValues();

      // Prepare activity updates
      const activityFields: Partial<HotelActivity> = {
        check_in_date: formData.check_in_date,
        check_in_time: formData.check_in_time || undefined,
        check_out_date: formData.check_out_date,
        check_out_time: formData.check_out_time || undefined,
        early_checkin: formData.early_checkin,
        late_checkout: formData.late_checkout,
        meal_plan: formData.meal_plan,
        meal_complimentary: formData.meal_complimentary,
        rooms: formData.rooms,
        room_pax_distribution: formData.room_pax_distribution,
        remarks: formData.remarks,
      };

      // Get supplier_item_id from selected supplier
      const selectedSupplier = suppliers.find((s) => s.value === formData.supplier_id);

      // Prepare booking data (without supplier service table)
      const bookingData = {
        query_id: queryId,
        itinerary_id: activityId,
        title: formData.title || null,
        booking_status: formData.booking_status as BookingStatus,
        voucher_status: formData.voucher_status as VoucherStatus,
        supplier_id: formData.supplier_id || null,
        confirmation_no: formData.confirmation_no || null,
        reconfirmed_by: formData.reconfirmed_by || null,
        notes: formData.notes || null,
        supplier_item_id: selectedSupplier?.supplier_item_id || null,
        cost_price: formData.cost_price ?? 0,
        currency: formData.currency || null,
        payment_plan_id: null,
      };

      // Single server-side call consolidating all operations
      const result = await saveBooking({
        activityId,
        activityData: activityFields,
        breakups,
        bookingData,
        existingBookingId: existingBooking?.id,
      });

      if (!result.success) {
        toast.error(result.error || `Failed to ${isEditMode ? "update" : "create"} booking`);
        return;
      }

      toast.success(`Booking ${isEditMode ? "updated" : "created"} successfully`);

      router.refresh();
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(`An error occurred while ${isEditMode ? "updating" : "creating"} booking`);
      console.error(error);
    } finally {
      setIsSavingBooking(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Hotel Header */}
      {isLoadingData ? (
        <div className="space-y-2 px-10 py-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      ) : hotelDetails ? (
        <div className="space-y-0.5 px-10 py-4 border-b">
          <div className="flex items-center gap-3 text-base">
            <h2 className="text-2xl font-bold mb-2">{hotelDetails.hotel_name || "Hotel"}</h2>
            {hotelDetails.star_rating && (
              <Badge variant="secondary" className="text-sm bg-primary/10 text-primary">
                {formatStarRating(hotelDetails.star_rating)}
                <Star className="h-3 w-3 mr-0.5 fill-current" />
              </Badge>
            )}
            {hotelDetails.property_type && (
              <Badge variant="secondary" className="text-sm capitalize bg-primary/10 text-primary">
                {hotelDetails.property_type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(hotelDetails.country_name || hotelDetails.city_name || hotelDetails.hotel_address) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {[hotelDetails.country_name, hotelDetails.city_name, hotelDetails.hotel_address]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}

            {hotelDetails.hotel_phone && (
              <>
                <span className="text-muted-foreground">|</span>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">{hotelDetails.hotel_phone}</span>
                </div>
              </>
            )}

            {hotelDetails.hotel_email && (
              <>
                <span className="text-muted-foreground">|</span>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">{hotelDetails.hotel_email}</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <Form {...form}>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "activity" | "booking")}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="px-10 py-4">
            <TabsList className="bg-transparent py-1 h-fit border">
              <TabsTrigger
                value="activity"
                className={cn(
                  "h-10 rounded-md px-3 py-1.5",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                  "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
                )}
              >
                Activity Details
              </TabsTrigger>
              <TabsTrigger
                value="booking"
                className={cn(
                  "h-9 rounded-md px-3 py-1.5",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                  "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
                )}
              >
                Pricing & Booking
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Activity Details Tab */}
          <TabsContent value="activity" className="flex-1 mt-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 h-0">
              <div className="px-10 py-6 space-y-6 pb-20">
                {/* Title & Supplier */}
                <BorderedCard title="Service Info" collapsible defaultOpen>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Booking title" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supplier_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <Autocomplete
                              options={suppliers}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select supplier"
                              searchPlaceholder="Search suppliers..."
                              maxResults={20}
                              disabled={isPaymentLocked || isLoadingSuppliers}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </BorderedCard>

                {/* Stay Details */}
                <BorderedCard title="Check-in & Check-out" collapsible defaultOpen>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Check-in */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="check_in_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Check-in Date *</FormLabel>
                              <FormControl>
                                <DatePicker
                                  value={field.value ? new Date(field.value) : undefined}
                                  onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                  placeholder="Date"
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="check_in_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Time</FormLabel>
                              <FormControl>
                                <TimePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Time"
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="early_checkin"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs font-normal cursor-pointer">Early check-in</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Check-out */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="check_out_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Check-out Date *</FormLabel>
                              <FormControl>
                                <DatePicker
                                  value={field.value ? new Date(field.value) : undefined}
                                  onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                  placeholder="Date"
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="check_out_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Time</FormLabel>
                              <FormControl>
                                <TimePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Time"
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="late_checkout"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs font-normal cursor-pointer">Late check-out</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </BorderedCard>

                {/* Meal Plan */}
                <BorderedCard title="Meal Plan" collapsible defaultOpen>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="meal_plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meal Plan</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select meal plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HOTEL_MEAL_PLANS.map((plan) => (
                                <SelectItem key={plan.value} value={plan.value}>
                                  {plan.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meal_complimentary"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0 mt-8">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer">Complimentary</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </BorderedCard>

                {/* Room & Pax Distribution */}
                <BorderedCard title="Room & Pax Distribution" collapsible defaultOpen>
                  <div className="mt-4">
                    <PaxRoomDistribution
                      adults={activity.adults || 0}
                      teens={activity.teens || 0}
                      children={activity.children || 0}
                      infants={activity.infants || 0}
                      childrenAges={activity.children_ages || []}
                      rooms={rooms}
                      roomPaxDistribution={roomPaxDistribution}
                      availableRooms={availableRooms}
                      onRoomsChange={(newRooms) => form.setValue("rooms", newRooms)}
                      onDistributionChange={(newDist) => form.setValue("room_pax_distribution", newDist)}
                    />
                  </div>
                </BorderedCard>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Booking & Pricing Tab */}
          <TabsContent value="booking" className="flex-1 mt-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 h-0">
              <div className="px-10 py-6 space-y-6 pb-20">
                {/* Rate Breakdown */}
                <PricingBreakupSection
                  breakups={breakups}
                  availableDays={availableDays}
                  onAddBreakup={addBreakup}
                  onUpdateBreakup={updateBreakupField}
                  onDeleteBreakup={deleteBreakup}
                  onDayChange={handleDayChange}
                  isDeleting={isDeleting}
                  showDaySelector={true}
                />

                {/* Booking Details */}
                <BookingDetailsSection form={form} showReconfirmedBy={true} hideTitle paymentLocked={isPaymentLocked} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Unified Footer - Outside Tabs */}
        <div className="sticky bottom-0 border-t px-4 py-2 bg-background">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {activeTab === "booking" && (
              <Button type="button" variant="outline" onClick={() => setActiveTab("activity")}>
                <ChevronRight className="size-4 mr-2 rotate-180" />
                Back
              </Button>
            )}
            {activeTab === "activity" ? (
              <Button type="button" onClick={() => setActiveTab("booking")} className="min-w-32">
                Next
                <ChevronRight className="size-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveBooking}
                loading={isSavingBooking}
                loadingText="Saving..."
                disabled={isSavingBooking}
                className="min-w-32"
              >
                <Save className="size-4 mr-2" />
                {isEditMode ? "Update Booking" : "Create Booking"}
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}

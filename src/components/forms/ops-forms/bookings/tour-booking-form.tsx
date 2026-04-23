"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { MapPin, Clock, ChevronRight, Save } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { saveBooking } from "@/data-access/bookings";
import LibraryItemPicker from "@/components/ui/library-item-picker";
import { getServiceDetailsByServiceId, type TourPackageDetails } from "@/data-access/service-details";
import { getChatItinerary, type ChatItinerary } from "@/data-access/chat-itinerary";
import type { TourActivity } from "@/data-access/itinerary-activities";
import type { OpsBooking, BookingStatus, VoucherStatus } from "@/types/ops-bookings";
import type { ISupplierOption } from "@/types/suppliers";
import { tourBookingSchema, type TourBookingFormData } from "@/components/forms/schemas/booking-schema";
import { BookingDetailsSection, BOOKING_DEFAULTS } from "./booking-details-section";
import { PricingBreakupSection } from "./pricing-breakup-section";
import { usePricingBreakups } from "./use-pricing-breakups";

interface TourBookingFormProps {
  queryId: string;
  activityId: string;
  activity: TourActivity;
  suppliers: ISupplierOption[];
  isLoadingSuppliers: boolean;
  existingBooking?: OpsBooking;
  onSuccess: () => void;
  onClose: () => void;
}

// Helper to build form default values
function getFormDefaults(activity: TourActivity, existingBooking?: OpsBooking) {
  // Calculate end date/time from duration if available
  let tourEndDate = "";
  let tourEndTime = "";

  if (activity.tour_date) {
    const startDate = new Date(activity.tour_date);
    const startTime = activity.tour_time || "00:00";

    // Parse start datetime
    const start = new Date(`${activity.tour_date}T${startTime}`);

    // Calculate total minutes from duration
    const days = activity.duration_days || 0;
    const hours = activity.duration_hours || 0;
    const minutes = activity.duration_minutes || 0;
    const totalMinutes = days * 24 * 60 + hours * 60 + minutes;

    if (totalMinutes > 0) {
      // Add duration to start date
      const end = new Date(start.getTime() + totalMinutes * 60 * 1000);
      tourEndDate = format(end, "yyyy-MM-dd");
      tourEndTime = format(end, "HH:mm");
    }
  }

  return {
    tour_start_date: activity.tour_date ?? "",
    tour_start_time: activity.tour_time ?? "",
    tour_end_date: tourEndDate,
    tour_end_time: tourEndTime,
    duration_days: activity.duration_days ?? undefined,
    duration_hours: activity.duration_hours ?? undefined,
    duration_minutes: activity.duration_minutes ?? undefined,
    tour_type: activity.tour_type ?? "",
    transfer_mode: activity.transfer_mode ?? "",
    transfer_type: activity.transfer_type ?? "",
    vehicle_type: activity.vehicle_type ?? "",
    no_of_vehicles: activity.no_of_vehicles ?? undefined,
    pickup_date: activity.pickup_date ?? "",
    pickup_time: activity.pickup_time ?? "",
    pickup_point: activity.pickup_point ?? "",
    drop_date: activity.drop_date ?? "",
    drop_time: activity.drop_time ?? "",
    drop_point: activity.drop_point ?? "",
    inclusions: activity.inclusions ?? [],
    exclusions: activity.exclusions ?? [],
    ...(existingBooking
      ? {
          title: existingBooking.title ?? activity.tour_name ?? "",
          supplier_id: existingBooking.supplier_id ?? "",
          booking_status: existingBooking.booking_status,
          voucher_status: existingBooking.voucher_status,
          confirmation_no: existingBooking.confirmation_no ?? "",
          notes: existingBooking.notes ?? "",
          currency: existingBooking.currency ?? activity.currency ?? "",
          cost_price: existingBooking.cost_price ?? activity.cost_price ?? 0,
          vehicle_id: existingBooking.vehicle_id ?? "",
          driver_id: existingBooking.driver_id ?? "",
        }
      : {
          ...BOOKING_DEFAULTS,
          title: activity.tour_name ?? "",
          currency: activity.currency ?? "",
          cost_price: activity.cost_price ?? 0,
          vehicle_id: "",
          driver_id: "",
        }),
  };
}

async function loadBookingData(serviceId: string, chatId: string) {
  const [tourResponse, itineraryData] = await Promise.all([
    getServiceDetailsByServiceId(serviceId, "tour"),
    getChatItinerary(chatId),
  ]);

  const tourData =
    tourResponse.data?.type === "tour" || tourResponse.data?.type === "combo" ? tourResponse.data.data : null;

  return { tourData, itineraryData };
}

export function TourBookingForm({
  queryId,
  activityId,
  activity,
  suppliers,
  isLoadingSuppliers,
  existingBooking,
  onSuccess,
  onClose,
}: TourBookingFormProps) {
  const router = useRouter();
  const isEditMode = !!existingBooking;
  const paymentStatus = existingBooking?.payment_status;
  const isPaymentLocked = isEditMode && !!paymentStatus && paymentStatus !== "not_configured";

  const [activeTab, setActiveTab] = useState<"activity" | "booking">("activity");
  const [tourPackageDetails, setTourPackageDetails] = useState<TourPackageDetails | null>(null);
  const [itinerary, setItinerary] = useState<ChatItinerary | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<TourBookingFormData>({
    resolver: zodResolver(tourBookingSchema),
    defaultValues: getFormDefaults(activity, existingBooking),
  });

  // Use pricing breakups hook
  const tourStartDate = activity.tour_date || activity.day_date;
  const { breakups, updateBreakupField, addBreakup, deleteBreakup, isDeleting } = usePricingBreakups({
    activityId,
    queryId,
    serviceType: "tour",
    defaultServiceName: tourPackageDetails?.tour_name || tourPackageDetails?.name || "Tour",
    defaultServiceId: activity.service_id || "",
    defaultDayNumber: activity.day_number || 1,
    defaultCheckInDate: tourStartDate || "",
    defaultCurrency: form.getValues("currency") || "USD",
    onTotalCostChange: (totalCost, currency) => {
      form.setValue("cost_price", totalCost > 0 ? totalCost : undefined);
      if (currency) {
        form.setValue("currency", currency);
      }
    },
  });

  // Watch supplier to pass as supplierId to vehicle/driver pickers
  const watchedSupplierId = form.watch("supplier_id");
  const watchedTourType = form.watch("tour_type");

  // Reset transfer fields when tour type switches away from transfer types
  useEffect(() => {
    if (watchedTourType === "ticket_only") {
      const stringFields = [
        "transfer_mode",
        "transfer_type",
        "vehicle_type",
        "vehicle_id",
        "driver_id",
        "pickup_date",
        "pickup_time",
        "pickup_point",
        "drop_date",
        "drop_time",
        "drop_point",
      ] as const;
      stringFields.forEach((field) => form.setValue(field, ""));
      form.setValue("no_of_vehicles", undefined);
    }
  }, [watchedTourType]);


  useEffect(() => {
    let isMounted = true;
    setIsLoadingData(true);

    // If service_id is missing, only load itinerary (tour package details will be null)
    if (!activity.service_id) {
      console.warn("[TourBookingForm] activity.service_id is missing, loading without tour package details");
      getChatItinerary(activity.chat_id)
        .then((itineraryData) => {
          if (!isMounted) return;
          setItinerary(itineraryData);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("[TourBookingForm] Error loading itinerary:", error);
          toast.error("Failed to load itinerary details");
        })
        .finally(() => {
          if (isMounted) setIsLoadingData(false);
        });
    } else {
      loadBookingData(activity.service_id, activity.chat_id)
        .then(({ tourData, itineraryData }) => {
          if (!isMounted) return;
          setItinerary(itineraryData);
          if (tourData) setTourPackageDetails(tourData);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("[TourBookingForm] Error loading data:", error);
          toast.error("Failed to load booking details");
        })
        .finally(() => {
          if (isMounted) setIsLoadingData(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activity.service_id, activity.chat_id]);

  // Reset form when activity or existingBooking changes
  useEffect(() => {
    form.reset(getFormDefaults(activity, existingBooking));
  }, [activity, existingBooking]);

  // Set default date/time values on mount if not present
  useEffect(() => {
    const startDate = form.getValues("tour_start_date");
    const startTime = form.getValues("tour_start_time");
    const endDate = form.getValues("tour_end_date");
    const endTime = form.getValues("tour_end_time");

    let needsUpdate = false;
    const updates: Partial<TourBookingFormData> = {};

    // Set default start date to today if not present
    if (!startDate) {
      updates.tour_start_date = format(new Date(), "yyyy-MM-dd");
      needsUpdate = true;
    }

    // Set default start time to 00:00 if not present
    if (!startTime) {
      updates.tour_start_time = "00:00";
      needsUpdate = true;
    }

    // Set default end date to start date if not present
    if (!endDate) {
      updates.tour_end_date = updates.tour_start_date || startDate || format(new Date(), "yyyy-MM-dd");
      needsUpdate = true;
    }

    // Set default end time to 00:00 if not present
    if (!endTime) {
      updates.tour_end_time = "00:00";
      needsUpdate = true;
    }

    // Apply updates if needed
    if (needsUpdate) {
      Object.entries(updates).forEach(([key, value]) => {
        form.setValue(key as keyof TourBookingFormData, value as any);
      });
    }
  }, []); // Run once on mount

  // Simple function to calculate duration - called directly from onChange handlers
  const calculateDuration = () => {
    const startDate = form.getValues("tour_start_date");
    const startTime = form.getValues("tour_start_time") || "00:00";
    const endDate = form.getValues("tour_end_date");
    const endTime = form.getValues("tour_end_time") || "00:00";

    if (!startDate || !endDate) {
      form.setValue("duration_days", undefined);
      form.setValue("duration_hours", undefined);
      form.setValue("duration_minutes", undefined);
      return;
    }

    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      // If end is before or equal to start, duration is 0
      if (end <= start) {
        form.setValue("duration_days", undefined);
        form.setValue("duration_hours", 0);
        form.setValue("duration_minutes", undefined);
        return;
      }

      // Calculate duration
      const diffMs = end.getTime() - start.getTime();
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (24 * 60));
      const remainingAfterDays = totalMinutes % (24 * 60);
      const hours = Math.floor(remainingAfterDays / 60);
      const minutes = remainingAfterDays % 60;

      form.setValue("duration_days", days || undefined);
      form.setValue("duration_hours", hours || undefined);
      form.setValue("duration_minutes", minutes || undefined);
    } catch (error) {
      console.error("Error calculating duration:", error);
    }
  };

  // Auto-fill inclusions/exclusions from tourPackageDetails when it loads
  useEffect(() => {
    if (tourPackageDetails) {
      const currentInclusions = form.getValues("inclusions");
      const currentExclusions = form.getValues("exclusions");

      // Only auto-fill if empty
      if ((!currentInclusions || currentInclusions.length === 0) && tourPackageDetails.inclusions) {
        form.setValue("inclusions", tourPackageDetails.inclusions.split("\n").filter(Boolean));
      }
      if ((!currentExclusions || currentExclusions.length === 0) && tourPackageDetails.exclusions) {
        form.setValue("exclusions", tourPackageDetails.exclusions.split("\n").filter(Boolean));
      }
    }
  }, [tourPackageDetails]);

  // Auto-select first supplier if available and no supplier is selected
  useEffect(() => {
    if (!isLoadingSuppliers && suppliers.length > 0 && !form.getValues("supplier_id")) {
      form.setValue("supplier_id", suppliers[0].value);
    }
  }, [suppliers, isLoadingSuppliers]);

  // Calculate max days - use itinerary or derive from breakups/activity
  const maxDays = itinerary?.nights
    ? itinerary.nights + 1
    : Math.max(activity.day_number || 7, ...breakups.map((b) => b.day_number || 0), 7);

  // Generate available days
  const availableDays = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Calculate date for a given day number
  const getDateForDay = (dayNumber: number): string => {
    if (!tourStartDate) return "";
    const startDate = new Date(tourStartDate);
    startDate.setDate(startDate.getDate() + dayNumber - 1);
    return startDate.toISOString().split("T")[0];
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

      const {
        title,
        booking_status,
        voucher_status,
        supplier_id,
        confirmation_no,
        notes: booking_notes,
        tour_start_date,
        tour_start_time,
        tour_end_date,
        tour_end_time,
        currency,
        cost_price,
        reconfirmed_by,
        free_cancellation_date,
        free_cancellation_time,
        vehicle_id,
        driver_id,
        ...activityFields
      } = formData;

      // Convert empty strings to undefined for database compatibility
      // Note: tour_end_date/tour_end_time are excluded - only duration fields are stored in DB
      const sanitizedActivityFields = {
        ...activityFields,
        tour_date: tour_start_date || undefined,
        tour_time: tour_start_time || undefined,
        tour_type: activityFields.tour_type || undefined,
        transfer_mode: activityFields.transfer_mode || undefined,
        transfer_type: activityFields.transfer_type || undefined,
        vehicle_type: activityFields.vehicle_type || undefined,
        pickup_date: activityFields.pickup_date || undefined,
        pickup_time: activityFields.pickup_time || undefined,
        pickup_point: activityFields.pickup_point || undefined,
        drop_date: activityFields.drop_date || undefined,
        drop_time: activityFields.drop_time || undefined,
        drop_point: activityFields.drop_point || undefined,
      } as Partial<TourActivity>;

      const selectedSupplier = suppliers.find((s) => s.value === supplier_id);

      const bookingData = {
        query_id: queryId,
        itinerary_id: activityId,
        title: title || null,
        booking_status: booking_status as BookingStatus,
        voucher_status: voucher_status as VoucherStatus,
        supplier_id: supplier_id || null,
        confirmation_no: confirmation_no || null,
        notes: booking_notes || null,
        reconfirmed_by: reconfirmed_by || null,
        supplier_item_id: selectedSupplier?.supplier_item_id || null,
        vehicle_id: vehicle_id || null,
        driver_id: driver_id || null,
        cost_price: cost_price || 0,
        currency: currency || null,
        payment_plan_id: null,
      };

      // Single server-side call consolidating all operations
      const result = await saveBooking({
        activityId,
        activityData: sanitizedActivityFields,
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
      {/* Tour Header */}
      {isLoadingData ? (
        <div className="space-y-2 px-10 py-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      ) : tourPackageDetails ? (
        <div className="space-y-0.5 px-10 py-4 border-b">
          <div className="flex items-center gap-3 text-base">
            <h2 className="text-2xl font-bold mb-2">{tourPackageDetails.name || "Tour Package"}</h2>
            <Badge variant="secondary" className="text-sm bg-primary/10 text-primary">
              {tourPackageDetails.iscombo ? "Combo Package" : "Tour"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {(tourPackageDetails.country_name || tourPackageDetails.city_name || tourPackageDetails.tour_address) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {[tourPackageDetails.country_name, tourPackageDetails.city_name, tourPackageDetails.tour_address]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
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

                {/* Tour Schedule */}
                <BorderedCard title="Tour Details" collapsible defaultOpen>
                  {/* Duration Display - Small text at top */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-info justify-end">
                    <Clock className="size-4" />
                    <span>
                      Duration:{" "}
                      {(() => {
                        const days = form.watch("duration_days");
                        const hours = form.watch("duration_hours");
                        const minutes = form.watch("duration_minutes");
                        const parts = [];
                        if (days) parts.push(`${days}d`);
                        if (hours) parts.push(`${hours}h`);
                        if (minutes) parts.push(`${minutes}m`);
                        return parts.length > 0 ? parts.join(" ") : "0h";
                      })()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Start Date & Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="tour_start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Start Date *</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => {
                                  const newDate = date ? format(date, "yyyy-MM-dd") : "";
                                  field.onChange(newDate);

                                  // Auto-set end date to same date if not set
                                  if (newDate && !form.getValues("tour_end_date")) {
                                    form.setValue("tour_end_date", newDate);
                                  }

                                  // Calculate duration
                                  calculateDuration();
                                }}
                                placeholder="Date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tour_start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Start Time</FormLabel>
                            <FormControl>
                              <TimePicker
                                value={field.value || ""}
                                onChange={(time) => {
                                  field.onChange(time);
                                  calculateDuration();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* End Date & Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="tour_end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">End Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => {
                                  field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                  calculateDuration();
                                }}
                                placeholder="Date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tour_end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">End Time</FormLabel>
                            <FormControl>
                              <TimePicker
                                value={field.value || ""}
                                onChange={(time) => {
                                  field.onChange(time);
                                  calculateDuration();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tour Type */}
                    <FormField
                      control={form.control}
                      name="tour_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select tour type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ticket_only">Ticket Only</SelectItem>
                              <SelectItem value="sic_transfers">With SIC Transfers</SelectItem>
                              <SelectItem value="pvt_transfers">With PVT Transfers</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </BorderedCard>

                {/* Transfer Details (conditional - shown when tour includes transfers) */}
                {(form.watch("tour_type") === "sic_transfers" || form.watch("tour_type") === "pvt_transfers") && (
                  <BorderedCard title="Transfer Details" collapsible defaultOpen>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="transfer_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transfer Mode *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select transfer mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="vehicle">Vehicle</SelectItem>
                                <SelectItem value="vehicle_on_disposal">Vehicle on Disposal</SelectItem>
                                <SelectItem value="ferry">Ferry</SelectItem>
                                <SelectItem value="train">Train</SelectItem>
                                <SelectItem value="bus">Bus</SelectItem>
                                <SelectItem value="helicopter">Helicopter</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transfer_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transfer Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select transfer type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SIC">SIC (Shared)</SelectItem>
                                <SelectItem value="PVT">PVT (Private)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicle_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Type</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue("vehicle_id", "");
                              }}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select vehicle type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="sedan">Sedan</SelectItem>
                                <SelectItem value="suv">SUV</SelectItem>
                                <SelectItem value="minivan">Minivan</SelectItem>
                                <SelectItem value="van">Van</SelectItem>
                                <SelectItem value="coach">Coach</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="no_of_vehicles"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Vehicles</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="1"
                                className="h-9"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicle_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Vehicle</FormLabel>
                            <FormControl>
                              <LibraryItemPicker
                                type="vehicles"
                                value={field.value || ""}
                                onChange={(id) => field.onChange(id)}
                                supplierId={watchedSupplierId || undefined}
                                placeholder="Select from library"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="driver_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Driver</FormLabel>
                            <FormControl>
                              <LibraryItemPicker
                                type="drivers"
                                value={field.value || ""}
                                onChange={(id) => field.onChange(id)}
                                supplierId={watchedSupplierId || undefined}
                                placeholder="Select from library"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Pickup Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="pickup_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                placeholder="Select date"
                                className="h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pickup_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Time</FormLabel>
                            <FormControl>
                              <TimePicker value={field.value || ""} onChange={field.onChange} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pickup_point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Point</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter pickup location" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Drop Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="drop_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drop Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                placeholder="Select date"
                                className="h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="drop_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drop Time</FormLabel>
                            <FormControl>
                              <TimePicker value={field.value || ""} onChange={field.onChange} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="drop_point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drop Point</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter drop location" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </BorderedCard>
                )}

                {/* Pickup & Drop Details (if applicable) */}
                {(tourPackageDetails?.pickup_point ||
                  tourPackageDetails?.dropoff_point ||
                  activity.pickup_point ||
                  activity.drop_point) && (
                  <BorderedCard title="Pickup & Drop" collapsible defaultOpen>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {/* Pickup */}
                      <FormField
                        control={form.control}
                        name="pickup_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                placeholder="Select date"
                                className="h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pickup_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Time</FormLabel>
                            <FormControl>
                              <TimePicker value={field.value || ""} onChange={field.onChange} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pickup_point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Point</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter pickup location" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Drop */}
                      <FormField
                        control={form.control}
                        name="drop_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drop Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                placeholder="Select date"
                                className="h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="drop_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drop Time</FormLabel>
                            <FormControl>
                              <TimePicker value={field.value || ""} onChange={field.onChange} className="h-9" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="drop_point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drop Point</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter drop location" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </BorderedCard>
                )}

                {/* Additional Information */}
                <BorderedCard title="Additional Information" collapsible defaultOpen>
                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="inclusions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inclusions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter inclusions (one per line)"
                              className="min-h-24"
                              value={field.value?.join("\n") || ""}
                              onChange={(e) => field.onChange(e.target.value.split("\n").filter(Boolean))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exclusions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exclusions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter exclusions (one per line)"
                              className="min-h-24"
                              value={field.value?.join("\n") || ""}
                              onChange={(e) => field.onChange(e.target.value.split("\n").filter(Boolean))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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
                <BookingDetailsSection
                  form={form}
                  showReconfirmedBy={false}
                  hideTitle
                  paymentLocked={isPaymentLocked}
                />
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
                <ChevronRight className="rotate-180" />
                Back
              </Button>
            )}
            {activeTab === "activity" ? (
              <Button type="button" onClick={() => setActiveTab("booking")} className="min-w-32">
                Next
                <ChevronRight />
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
                <Save />
                {isEditMode ? "Update Booking" : "Create Booking"}
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}

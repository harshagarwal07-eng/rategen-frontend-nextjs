"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { MapPin, ChevronRight, Save, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BorderedCard } from "@/components/ui/bordered-card";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import LibraryItemPicker from "@/components/ui/library-item-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { saveBooking } from "@/data-access/bookings";
import { getServiceDetailsByServiceId, type TransferPackageDetails } from "@/data-access/service-details";
import { getChatItinerary, type ChatItinerary } from "@/data-access/chat-itinerary";
import type { TransferActivity } from "@/data-access/itinerary-activities";
import type { OpsBooking, BookingStatus, VoucherStatus } from "@/types/ops-bookings";
import type { ISupplierOption } from "@/types/suppliers";
import { transferBookingSchema, type TransferBookingFormData } from "@/components/forms/schemas/booking-schema";
import { BookingDetailsSection, BOOKING_DEFAULTS } from "./booking-details-section";
import { PricingBreakupSection } from "./pricing-breakup-section";
import { usePricingBreakups } from "./use-pricing-breakups";
import { Textarea } from "@/components/ui/textarea";

interface TransferBookingFormProps {
  queryId: string;
  activityId: string;
  activity: TransferActivity;
  suppliers: ISupplierOption[];
  isLoadingSuppliers: boolean;
  existingBooking?: OpsBooking;
  onSuccess: () => void;
  onClose: () => void;
}

// Helper to build form default values
function getFormDefaults(activity: TransferActivity, existingBooking?: OpsBooking) {
  return {
    transfer_mode: activity.transfer_mode ?? "",
    transfer_type: activity.transfer_type ?? "",
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
          title: existingBooking.title ?? activity.transfer_name ?? "",
          supplier_id: existingBooking.supplier_id ?? "",
          booking_status: existingBooking.booking_status,
          voucher_status: existingBooking.voucher_status,
          confirmation_no: existingBooking.confirmation_no ?? "",
          vehicle_id: existingBooking.vehicle_id ?? "",
          driver_id: existingBooking.driver_id ?? "",
          meeting_point: existingBooking.meeting_point ?? "",
          welcome_placard: existingBooking.welcome_placard ?? "",
          notes: existingBooking.notes ?? "",
          reconfirmed_by: existingBooking.reconfirmed_by ?? "",
          currency: existingBooking.currency ?? activity.currency ?? "",
          cost_price: existingBooking.cost_price ?? activity.cost_price ?? 0,
        }
      : {
          vehicle_id: "",
          driver_id: "",
          meeting_point: "",
          welcome_placard: "",
          ...BOOKING_DEFAULTS,
          title: activity.transfer_name ?? "",
          currency: activity.currency ?? "",
          cost_price: activity.cost_price ?? 0,
        }),
  };
}

async function loadBookingData(serviceId: string, chatId: string) {
  const [transferResponse, itineraryData] = await Promise.all([
    getServiceDetailsByServiceId(serviceId, "transfer"),
    getChatItinerary(chatId),
  ]);

  const transferData = transferResponse.data?.type === "transfer" ? transferResponse.data.data : null;

  return { transferData, itineraryData };
}

export function TransferBookingForm({
  queryId,
  activityId,
  activity,
  suppliers,
  isLoadingSuppliers,
  existingBooking,
  onSuccess,
  onClose,
}: TransferBookingFormProps) {
  const router = useRouter();
  const isEditMode = !!existingBooking;
  const paymentStatus = existingBooking?.payment_status;
  const isPaymentLocked = isEditMode && !!paymentStatus && paymentStatus !== "not_configured";

  const [activeTab, setActiveTab] = useState<"activity" | "booking">("activity");
  const [transferDetails, setTransferDetails] = useState<TransferPackageDetails | null>(null);
  const [itinerary, setItinerary] = useState<ChatItinerary | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<TransferBookingFormData>({
    resolver: zodResolver(transferBookingSchema),
    defaultValues: getFormDefaults(activity, existingBooking),
  });

  // Use pricing breakups hook
  const pickupDate = activity.pickup_date || activity.day_date;
  const { breakups, updateBreakupField, addBreakup, deleteBreakup, isDeleting } = usePricingBreakups({
    activityId,
    queryId,
    serviceType: "transfer",
    defaultServiceName: transferDetails?.transfer_name || "Transfer",
    defaultServiceId: activity.service_id || "",
    defaultDayNumber: activity.day_number || 1,
    defaultCheckInDate: pickupDate || "",
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

    // If service_id is missing, only load itinerary (transfer details will be null)
    if (!activity.service_id) {
      console.warn("[TransferBookingForm] activity.service_id is missing, loading without transfer details");
      getChatItinerary(activity.chat_id)
        .then((itineraryData) => {
          if (!isMounted) return;
          setItinerary(itineraryData);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("[TransferBookingForm] Error loading itinerary:", error);
          toast.error("Failed to load itinerary details");
        })
        .finally(() => {
          if (isMounted) setIsLoadingData(false);
        });
    } else {
      loadBookingData(activity.service_id, activity.chat_id)
        .then(({ transferData, itineraryData }) => {
          if (!isMounted) return;
          setItinerary(itineraryData);
          if (transferData) setTransferDetails(transferData);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("[TransferBookingForm] Error loading data:", error);
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

  // Auto-fill inclusions/exclusions from transferDetails when it loads
  useEffect(() => {
    if (transferDetails) {
      const currentInclusions = form.getValues("inclusions");
      const currentExclusions = form.getValues("exclusions");

      // Only auto-fill if empty
      if ((!currentInclusions || currentInclusions.length === 0) && transferDetails.inclusions) {
        const inclusionsList =
          typeof transferDetails.inclusions === "string"
            ? transferDetails.inclusions.split("\n").filter(Boolean)
            : transferDetails.inclusions;
        form.setValue("inclusions", inclusionsList);
      }
      if ((!currentExclusions || currentExclusions.length === 0) && transferDetails.exclusions) {
        const exclusionsList =
          typeof transferDetails.exclusions === "string"
            ? transferDetails.exclusions.split("\n").filter(Boolean)
            : transferDetails.exclusions;
        form.setValue("exclusions", exclusionsList);
      }
    }
  }, [transferDetails]);

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
    if (!pickupDate) return "";
    const pickup = new Date(pickupDate);
    pickup.setDate(pickup.getDate() + dayNumber - 1);
    return pickup.toISOString().split("T")[0];
  };

  // Handle day change - also update the service_date
  const handleDayChange = (breakupId: string, newDay: number) => {
    updateBreakupField(breakupId, "day_number", newDay);
    const newDate = getDateForDay(newDay);
    if (newDate) {
      updateBreakupField(breakupId, "service_date", newDate);
    }
  };

  const watchedSupplierId = form.watch("supplier_id");
  const transferMode = form.watch("transfer_mode");
  const showVehicleFields = transferMode === "vehicle" || transferMode === "vehicle_on_disposal";

  // Reset vehicle/driver fields when switching away from vehicle modes
  useEffect(() => {
    if (transferMode && !showVehicleFields) {
      form.setValue("vehicle_id", "");
      form.setValue("driver_id", "");
    }
  }, [transferMode]);

  // Calculate duration from pickup and drop dates/times
  const calculateDuration = () => {
    const pickupDate = form.watch("pickup_date");
    const pickupTime = form.watch("pickup_time");
    const dropDate = form.watch("drop_date");
    const dropTime = form.watch("drop_time");

    if (!pickupDate || !dropDate) return null;

    const pickup = new Date(`${pickupDate}T${pickupTime || "00:00"}`);
    const drop = new Date(`${dropDate}T${dropTime || "00:00"}`);

    const diffMs = drop.getTime() - pickup.getTime();
    if (diffMs <= 0) return null;

    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours < 24) {
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    }
  };

  const duration = calculateDuration();

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
        meeting_point,
        welcome_placard,
        vehicle_id,
        driver_id,
        currency,
        cost_price,
        reconfirmed_by,
        free_cancellation_date,
        free_cancellation_time,
        ...activityFields
      } = formData;

      // Convert empty strings to undefined for database compatibility
      const sanitizedActivityFields = {
        ...activityFields,
        transfer_mode: activityFields.transfer_mode || undefined,
        transfer_type: activityFields.transfer_type || undefined,
        pickup_date: activityFields.pickup_date || undefined,
        pickup_time: activityFields.pickup_time || undefined,
        pickup_point: activityFields.pickup_point || undefined,
        drop_date: activityFields.drop_date || undefined,
        drop_time: activityFields.drop_time || undefined,
        drop_point: activityFields.drop_point || undefined,
      } as Partial<TransferActivity>;

      const selectedSupplier = suppliers.find((s) => s.value === supplier_id);

      const bookingData = {
        query_id: queryId,
        itinerary_id: activityId,
        title: title || null,
        booking_status: booking_status as BookingStatus,
        voucher_status: voucher_status as VoucherStatus,
        supplier_id: supplier_id || null,
        confirmation_no: confirmation_no || null,
        vehicle_id: vehicle_id || null,
        driver_id: driver_id || null,
        meeting_point: meeting_point || null,
        welcome_placard: welcome_placard || null,
        notes: booking_notes || null,
        reconfirmed_by: reconfirmed_by || null,
        supplier_item_id: selectedSupplier?.supplier_item_id || null,
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
      {/* Transfer Header */}
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
      ) : transferDetails ? (
        <div className="space-y-0.5 px-10 py-4 border-b">
          <div className="flex items-center gap-3 text-base">
            <h2 className="text-2xl font-bold mb-2">{transferDetails.transfer_name || "Transfer"}</h2>

            <Badge variant="secondary" className="text-sm capitalize bg-primary/10 text-primary">
              Transfer
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {(transferDetails.country_name || transferDetails.city_name) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  {[transferDetails.country_name, transferDetails.city_name].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {transferDetails.via && (
              <>
                <span className="text-muted-foreground">|</span>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                  Via: {transferDetails.via}
                </Badge>
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
              <div className="px-10 py-2 space-y-6 pb-20">
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

                {/* Transfer Details */}
                <BorderedCard title="Transfer Details" collapsible defaultOpen>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transfer_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transfer Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PVT">PVT (Private)</SelectItem>
                                <SelectItem value="SIC">SIC (Shared)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transfer_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mode *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select mode" />
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
                    </div>

                    {/* Vehicle & Driver fields (conditional - shown for P2P and Vehicle on Disposal) */}
                    {showVehicleFields && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vehicle_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Vehicle *</FormLabel>
                              <FormControl>
                                <LibraryItemPicker
                                  type="vehicles"
                                  supplierId={watchedSupplierId || undefined}
                                  value={field.value || ""}
                                  onChange={(id) => field.onChange(id)}
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
                                  supplierId={watchedSupplierId || undefined}
                                  value={field.value || ""}
                                  onChange={(id) => field.onChange(id)}
                                  placeholder="Select from library"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </BorderedCard>

                {/* Pickup & Drop-off */}
                <BorderedCard title="Pickup & Drop-off" collapsible defaultOpen>
                  {/* Duration Display - Small text at top */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-info justify-end">
                    <Clock className="size-4" />
                    <span>Duration: {duration || "0h 0m"}</span>
                  </div>

                  <div className="space-y-4 mt-4">
                    {/* Pickup Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="pickup_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Pickup Date *</FormLabel>
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
                              <TimePicker
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Select time"
                                className="h-9"
                              />
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              <TimePicker
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Select time"
                                className="h-9"
                              />
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
                  </div>
                </BorderedCard>

                {/* Additional Information */}
                <BorderedCard title="Additional Information" collapsible defaultOpen>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="meeting_point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meeting Point</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter meeting point" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="welcome_placard"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Welcome Placard</FormLabel>
                            <FormControl>
                              <Input placeholder="Name on welcome placard" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                <BookingDetailsSection form={form} showReconfirmedBy={false} hideTitle paymentLocked={isPaymentLocked} />
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

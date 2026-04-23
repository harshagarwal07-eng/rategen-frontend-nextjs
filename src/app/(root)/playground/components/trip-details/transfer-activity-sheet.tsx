"use client";

import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Car, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import S3Image from "@/components/ui/s3-image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  updateActivity,
  type TransferActivity,
} from "@/data-access/itinerary-activities";
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
import { TransferOverviewTab } from "./transfer-sheet/transfer-overview-tab";
import { TransferPoliciesTab } from "./transfer-sheet/transfer-policies-tab";
import { TransferPricingTab } from "./transfer-sheet/transfer-pricing-tab";
import type { TransferSheetContextValue, TransferFormData, TransferDetails, ItineraryInfo, TRANSFER_MODES } from "./transfer-sheet/types";

interface TransferActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: TransferActivity | null;
  onActivityUpdate?: (updatedActivity: TransferActivity) => void;
  onRefresh?: () => void;
}

// Transfer mode labels
const TRANSFER_MODE_LABELS: Record<string, string> = {
  vehicle: "Vehicle",
  vehicle_disposal: "Vehicle on Disposal",
  ferry: "Ferry",
  rail: "Rail",
  helicopter: "Helicopter",
};

export default function TransferActivitySheet({
  open,
  onOpenChange,
  activity,
  onActivityUpdate,
  onRefresh,
}: TransferActivitySheetProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferDetails, setTransferDetails] = useState<TransferDetails | null>(null);
  const [breakups, setBreakups] = useState<ServiceBreakup[]>([]);
  const [itineraryInfo, setItineraryInfo] = useState<ItineraryInfo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Form state
  const [formData, setFormData] = useState<TransferFormData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load data when opened
  useEffect(() => {
    if (open && activity) {
      loadAllData();
    }
  }, [open, activity]);

  const loadAllData = async () => {
    if (!activity) return;

    // Set initial form data from activity
    setFormData({ ...activity, allActivityIds: [activity.id] });

    setLoading(true);

    // Load itinerary info
    if (activity.chat_id) {
      try {
        const itinerary = await getChatItinerary(activity.chat_id, activity.option_number || 1);
        if (itinerary) {
          setItineraryInfo({
            nights: itinerary.nights,
            checkIn: itinerary.check_in,
          });
        }
      } catch (error) {
        console.error("[TransferActivitySheet] Error loading itinerary:", error);
      }
    }

    // Build transfer details from activity data (for library transfers)
    const details: TransferDetails = {
      transfer_name: activity.transfer_name,
      package_name: activity.package_name,
      package_description: activity.package_description,
      city: activity.transfer_city,
      country: activity.transfer_country,
      transfer_mode: activity.transfer_mode,
      transfer_type: activity.transfer_type,
      is_sic: activity.is_sic,
      pickup_date: activity.pickup_date,
      pickup_time: activity.pickup_time,
      pickup_point: activity.pickup_point,
      drop_date: activity.drop_date,
      drop_time: activity.drop_time,
      drop_point: activity.drop_point,
      meeting_point: activity.meeting_point,
      duration_hours: activity.duration_hours,
      duration_days: activity.duration_days,
      distance_km: activity.distance_km,
      inclusions: activity.inclusions,
      exclusions: activity.exclusions,
      cancellation_policy: activity.cancellation_policy,
      agency_cancellation_policy: activity.agency_cancellation_policy,
      age_policy: activity.age_policy,
      seasons: activity.seasons,
      add_ons: activity.add_ons,
      images: activity.images,
      notes: activity.notes,
      remarks: activity.remarks,
      currency: activity.currency,
    };
    setTransferDetails(details);

    // Load breakups
    try {
      const actBreakups = await getServiceBreakupsByActivityId(activity.id);
      setBreakups(actBreakups);
    } catch (error) {
      console.error("[TransferActivitySheet] Error loading breakups:", error);
    }

    setHasChanges(false);
    setLoading(false);
  };

  const updateFormField = useCallback(
    <K extends keyof TransferActivity>(field: K, value: TransferActivity[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    },
    []
  );

  const updateBreakupField = useCallback((id: string, field: string, value: any) => {
    setBreakups((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }, []);

  const handleSave = async () => {
    if (!activity?.id) return;

    setSaving(true);
    try {
      const updateData = {
        transfer_name: formData.transfer_name,
        package_name: formData.package_name,
        pickup_date: formData.pickup_date,
        pickup_time: formData.pickup_time,
        pickup_point: formData.pickup_point,
        drop_date: formData.drop_date,
        drop_time: formData.drop_time,
        drop_point: formData.drop_point,
        meeting_point: formData.meeting_point,
        duration_hours: formData.duration_hours,
        duration_days: formData.duration_days,
        distance_km: formData.distance_km,
        is_sic: formData.is_sic,
        remarks: formData.remarks,
        notes: formData.notes,
        images: formData.images || [],
      };

      const result = await updateActivity(activity.id, updateData);
      if (!result) {
        throw new Error("Failed to update activity");
      }

      toast.success("Changes saved");
      setHasChanges(false);
      onActivityUpdate?.({ ...activity, ...formData } as TransferActivity);
    } catch (error) {
      console.error("[TransferActivitySheet] Save error:", error);
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
      let messageId: string | null = null;

      if (breakups.length > 0) {
        messageId = breakups[0].message_id;
      }

      if (!messageId) {
        const chatBreakups = await getServiceBreakupsByChat(activity.chat_id, activity.option_number || 1);
        if (chatBreakups.length > 0) {
          messageId = chatBreakups[0].message_id;
        }
      }

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

      const maxDay = breakups.reduce((max, b) => Math.max(max, b.day_number || 0), 0);
      const newDayNumber = maxDay > 0 ? maxDay : (formData.day_number || 1);

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
        service_name: formData.transfer_name || formData.package_name || "Transfer",
        service_type: "transfer",
        quantity: 1,
        unit_type: "vehicle",
        base_cost: 0,
        discount_amount: 0,
        markup_amount: 0,
        tax_amount: 0,
        final_cost: 0,
        currency: formData.currency || "USD",
        option_number: activity.option_number || 1,
      });

      if (newBreakup) {
        setBreakups((prev) => [...prev, newBreakup]);
        toast.success("Breakup added");
      } else {
        toast.error("Failed to add breakup");
      }
    } catch (error) {
      console.error("[TransferActivitySheet] Error adding breakup:", error);
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
      console.error("[TransferActivitySheet] Error deleting breakup:", error);
      toast.error("Failed to delete breakup");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      onRefresh?.();
    }
  };

  // Get transfer mode label
  const getTransferModeLabel = (mode?: string) => {
    if (!mode) return "Vehicle";
    return TRANSFER_MODE_LABELS[mode] || mode;
  };

  const ctx: TransferSheetContextValue = {
    formData,
    transferDetails,
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

  const images = formData.images || transferDetails?.images || [];
  const transferMode = formData.transfer_mode || transferDetails?.transfer_mode;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col" side="right">
        {/* Header */}
        <SheetHeader className="px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-orange-600" />
            <SheetTitle className="text-left text-sm font-medium">
              {formData.transfer_name || transferDetails?.transfer_name || "Transfer"}
            </SheetTitle>
            {transferMode && (
              <Badge variant="outline" className="text-[10px] h-5">
                {getTransferModeLabel(transferMode)}
              </Badge>
            )}
            {(formData.is_sic || transferDetails?.is_sic) && (
              <Badge variant="secondary" className="text-[10px] h-5">
                SIC
              </Badge>
            )}
          </div>
          {(formData.package_name || transferDetails?.package_name) && (
            <p className="text-xs text-muted-foreground">
              {formData.package_name || transferDetails?.package_name}
            </p>
          )}
          {(formData.transfer_city || transferDetails?.city || formData.transfer_country || transferDetails?.country) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[formData.transfer_city || transferDetails?.city, formData.transfer_country || transferDetails?.country]
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
        </SheetHeader>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="relative shrink-0 bg-muted">
            <div className="h-48 w-full relative">
              <S3Image
                url={images[currentImageIndex]}
                alt={`${formData.transfer_name || transferDetails?.transfer_name} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {currentImageIndex + 1} / {images.length}
              </div>
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-1 p-2 overflow-x-auto">
                {images.map((img, idx) => (
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
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
              <TransferOverviewTab ctx={ctx} />
            </TabsContent>
            <TabsContent value="policies" className="mt-0">
              <TransferPoliciesTab ctx={ctx} />
            </TabsContent>
            <TabsContent value="pricing" className="mt-0">
              <TransferPricingTab ctx={ctx} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

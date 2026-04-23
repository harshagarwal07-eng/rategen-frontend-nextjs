"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivityById, ServiceType } from "@/data-access/itinerary-activities";
import { getSupplierOptionsWithItemId } from "@/data-access/suppliers";
import { getBookingById } from "@/data-access/bookings";
import type { ISupplierOption, ItemTypes } from "@/types/suppliers";
import { HotelBookingForm } from "./bookings/hotel-booking-form";
import { TourBookingForm } from "./bookings/tour-booking-form";
import { TransferBookingForm } from "./bookings/transfer-booking-form";

interface BookingFormOrchestratorProps {
  isOpen: boolean;
  queryId: string;
  activityId: string;
  bookingId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingFormOrchestrator({
  isOpen,
  queryId,
  activityId,
  bookingId,
  onClose,
  onSuccess,
}: BookingFormOrchestratorProps) {
  const router = useRouter();
  const isEditMode = !!bookingId;

  // Load activity data
  const { data: activity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => getActivityById(activityId),
    enabled: isOpen && !!activityId,
  });

  // Load existing booking data if in edit mode
  const { data: existingBooking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBookingById(bookingId!),
    enabled: isOpen && !!bookingId,
  });

  // Load suppliers based on activity - using service_id and service_parent_id for accurate matching
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["supplier-options", activity?.service_type, activity?.service_id, activity?.service_parent_id],
    queryFn: async () => {
      const options = await getSupplierOptionsWithItemId({
        serviceType: activity!.service_type as unknown as ItemTypes,
        serviceId: activity!.service_id,
        serviceParentId: activity!.service_parent_id,
      });
      return options as ISupplierOption[];
    },
    enabled: isOpen && !!activity,
  });

  const isLoading = isLoadingActivity || isLoadingSuppliers || (isEditMode && isLoadingBooking);
  const suppliers = suppliersData || [];
  const serviceType = activity?.service_type as ServiceType;

  const handleClose = () => {
    router.refresh();
    onClose();
  };

  const getFormTitle = () => {
    const action = isEditMode ? "Edit" : "Create";
    switch (serviceType) {
      case "hotel":
        return `${action} Hotel Booking`;
      case "tour":
        return `${action} Tour Booking`;
      case "transfer":
        return `${action} Transfer Booking`;
      default:
        return `${action} Booking`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col rounded-none"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{getFormTitle()}</DialogTitle>

        {/* Form Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full">
            {isLoading ? (
              <div className="space-y-6 px-10 py-4">
                {/* Loading skeleton - General Information Section */}
                <div className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-40 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                {/* Loading skeleton - Details Section */}
                <div className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-48 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                {/* Loading skeleton - Booking Details Section */}
                <div className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-36 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            ) : activity ? (
              <>
                {/* Route to correct service-specific form */}
                {serviceType === "hotel" && (
                  <HotelBookingForm
                    queryId={queryId}
                    activityId={activityId}
                    activity={activity as any}
                    suppliers={suppliers}
                    isLoadingSuppliers={isLoadingSuppliers}
                    existingBooking={existingBooking || undefined}
                    onSuccess={onSuccess}
                    onClose={handleClose}
                  />
                )}

                {serviceType === "tour" && (
                  <TourBookingForm
                    queryId={queryId}
                    activityId={activityId}
                    activity={activity as any}
                    suppliers={suppliers}
                    isLoadingSuppliers={isLoadingSuppliers}
                    existingBooking={existingBooking || undefined}
                    onSuccess={onSuccess}
                    onClose={handleClose}
                  />
                )}

                {serviceType === "transfer" && (
                  <TransferBookingForm
                    queryId={queryId}
                    activityId={activityId}
                    activity={activity as any}
                    suppliers={suppliers}
                    isLoadingSuppliers={isLoadingSuppliers}
                    existingBooking={existingBooking || undefined}
                    onSuccess={onSuccess}
                    onClose={handleClose}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Activity not found</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { IApiServices } from "@/types/api-service";
import Show from "@/components/ui/show";
import HotelGuestDetailsCard from "../hotels/guest-details-card";
import { useRouter, useParams, useSearchParams } from "next/navigation";

type Props = {
  serviceType: IApiServices;
};

export default function GuestDetailsWrapper({ serviceType }: Props) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const getChangeButtonText = () => {
    switch (serviceType) {
      case "hotel":
        return "Change Hotel";
      default:
        return "Change Booking";
    }
  };

  const handleChangeBooking = () => {
    // Navigate back to choose room/service step
    const destination = searchParams.get("destination");

    if (serviceType === "hotel") {
      // Keep destination, remove hotel, go back to choose-room step
      router.push(`/api-services/hotels/search?step=choose-room&destination=${destination}`);
    }
  };

  return (
    <div className="w-full pr-10 grid grid-cols-4 gap-4">
      <div className="col-span-3 mt-2 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Booking Details</p>
          <Button variant={"outline"} onClick={handleChangeBooking}>
            {getChangeButtonText()}
          </Button>
        </div>

        <Show when={serviceType === "hotel"}>
          <HotelGuestDetailsCard />
        </Show>
      </div>

      <div className="space-y-4">
        {/* Cancellation Warning */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2 justify-center text-destructive">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="font-semibold text-sm">Booking Under Cancellation</p>
          </div>
        </div>

        {/* Sale Summary Card */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-primary/5 border-b px-5 py-3">
            <h3 className="font-semibold text-base text-center">Sale Summary</h3>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Vehicle Name */}
            <h4 className="font-semibold text-sm">Private Standard Hybrid Car</h4>

            {/* Price Breakdown */}
            <div className="space-y-3">
              <SummaryRow label="Rate" value="₹ 5,000" />
              <SummaryRow label="No. of Vehicles" value="1" />
              <SummaryRow label="Service Charge" value="₹ 0" />
              <SummaryRow label="GST" value="₹ 0" />
              <div className="pt-2 border-t">
                <SummaryRow label="Total" value="₹ 5,000" className="font-medium" />
              </div>
            </div>
          </div>

          {/* Footer - Amount to Pay */}
          <div className="bg-primary/10 px-5 py-4 border-t">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-base">Amount to pay</span>
              <span className="font-bold text-lg text-primary">₹ 5,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable SummaryRow component
interface SummaryRowProps {
  label: string;
  value: string | number;
  className?: string;
}

function SummaryRow({ label, value, className = "" }: SummaryRowProps) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

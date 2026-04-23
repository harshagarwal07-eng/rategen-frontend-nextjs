import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";
import HotelBookingSearchForm from "@/components/forms/api-service-forms/hotel-search-form";
import SearchHotelWrapper from "@/components/api-services/hotels/search-hotel-wrapper";
import ChooseHotelRoomWrapper from "@/components/api-services/hotels/choose-room-wrapper";
import GuestDetailsWrapper from "@/components/api-services/shared/guest-details-wrapper";
import StepIndicator from "@/components/api-services/shared/step-indicator";
import Show from "@/components/ui/show";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "Hotel Search",
};

type Props = {
  searchParams: Promise<{
    step?: string;
    destination?: string;
    hotel?: string;
  }>;
};

const hotelBookingSteps = [
  {
    value: "search-form",
    label: "Search Hotel",
  },
  {
    value: "choose-room",
    label: "Choose Hotel & Room",
  },
  {
    value: "guest-details",
    label: "Guest Details & Book",
  },
];

export default async function HotelSearchPage({ searchParams }: Props) {
  const { step = "search-form", destination, hotel } = await searchParams;

  // Determine completed steps based on searchParams
  const completedSteps: string[] = [];
  if (destination) completedSteps.push("search-form");
  if (hotel) completedSteps.push("choose-room");

  // Show step indicator from step 2 onwards (when destination is present)
  const showStepIndicator = !!destination;

  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-6">
        {showStepIndicator && (
          <div className="mb-6">
            <StepIndicator steps={hotelBookingSteps} completedSteps={completedSteps} />
          </div>
        )}

        <Show when={step === "search-form" && !destination}>
          <Card className="max-w-3xl border-border/60 shadow-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Search Hotel</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Search and book hotels</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <HotelBookingSearchForm />
            </CardContent>
          </Card>
        </Show>

        <Show when={!!destination && step === "choose-room" && !hotel}>
          <SearchHotelWrapper />
        </Show>

        <Show when={!!destination && !!hotel && step === "choose-room"}>
          <ChooseHotelRoomWrapper />
        </Show>

        <Show when={!!hotel && step === "guest-details"}>
          <GuestDetailsWrapper serviceType="hotel" />
        </Show>
      </div>
    </ScrollArea>
  );
}

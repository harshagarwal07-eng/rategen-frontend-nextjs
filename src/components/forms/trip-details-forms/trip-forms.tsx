import FlightForm, { IFlightForm } from "./add-flight-form";
import HotelForm, { IHotelForm } from "./add-hotel-form";
import TourForm, { ITourForm } from "./add-tour-form";
import TransferForm, { ITransferForm } from "./add-transfer-form";
import { ItineraryItem } from "@/types/crm-query";

type Props = {
  category: string;
  data?: ItineraryItem;
};

export default function TripForms({ category, data }: Props) {
  switch (category) {
    case "hotel":
      return <HotelForm initialData={data as unknown as IHotelForm} />;
    case "tour":
      return <TourForm initialData={data as unknown as ITourForm} />;
    case "transfer":
      return <TransferForm initialData={data as unknown as ITransferForm} />;
    case "flight":
      return <FlightForm initialData={data as unknown as IFlightForm} />;
    // case "food":
    //   return <FoodForm initialData={data as unknown as IFoodForm} />;
    // case "custom_ui":
    //   return <CustomUIForm initialData={data as unknown as ICustomUIForm} />;
    default:
      return (
        <p className="text-muted-foreground text-center py-3">
          No form available
        </p>
      );
  }
}

import Image from "next/image";
import { Users, Bed, Maximize, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IHotelSearchParams, IRoom } from "@/types/api-service";
import { FaMugHot, FaUtensils } from "react-icons/fa6";
import { AmenityBadge } from "../shared/amenity-badge";
// import RoomDetailsDialog from "@/components/dialogs/room-details-dialog";
import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";

type Props = {
  searchParams: IHotelSearchParams | null;
  onFilterChange: <K extends keyof IHotelSearchParams>(key: K, value: IHotelSearchParams[K]) => void;
};

const SAMPLE_ROOMS: IRoom[] = [
  {
    id: "room-1",
    type: "Deluxe Room",
    description: "Spacious room with modern amenities and city view",
    maxOccupancy: 3,
    bedType: "1 King Bed or 2 Twin Beds",
    size: 32,
    sizeUnit: "sqm",
    images: [
      {
        url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80",
        alt: "Deluxe Room",
      },
    ],
    amenities: ["Free WiFi", "Air Conditioning", "Flat Screen TV", "Mini Bar", "Safe"],
    ratePlans: [
      {
        id: "rate-1-1",
        name: "Room Only",
        price: 5000,
        currency: "₹",
        isRefundable: false,
        cancellationPolicy: "No Free Cancellation",
        mealPlan: "room_only",
      },
      {
        id: "rate-1-2",
        name: "Room with Breakfast",
        price: 5800,
        currency: "₹",
        isRefundable: true,
        cancellationPolicy: "Free cancellation until 24 hours before check-in",
        mealPlan: "breakfast",
      },
    ],
    availableRooms: 5,
  },
  {
    id: "room-2",
    type: "Superior Room",
    description: "Elegant room with premium furnishings and enhanced comfort",
    maxOccupancy: 3,
    bedType: "1 King Bed",
    size: 38,
    sizeUnit: "sqm",
    images: [
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80",
        alt: "Superior Room",
      },
    ],
    amenities: ["Free WiFi", "Air Conditioning", "Flat Screen TV", "Mini Bar", "Safe", "Balcony"],
    ratePlans: [
      {
        id: "rate-2-1",
        name: "Room Only",
        price: 6500,
        currency: "₹",
        isRefundable: false,
        cancellationPolicy: "No Free Cancellation",
        mealPlan: "room_only",
      },
      {
        id: "rate-2-2",
        name: "Room with Breakfast",
        price: 7200,
        currency: "₹",
        isRefundable: true,
        cancellationPolicy: "Free cancellation until 24 hours before check-in",
        mealPlan: "breakfast",
      },
      {
        id: "rate-2-3",
        name: "Half Board",
        price: 8500,
        currency: "₹",
        isRefundable: true,
        cancellationPolicy: "Free cancellation until 48 hours before check-in",
        mealPlan: "half_board",
      },
    ],
    availableRooms: 3,
  },
  {
    id: "room-3",
    type: "Family Suite",
    description: "Spacious suite perfect for families with separate living area",
    maxOccupancy: 5,
    bedType: "1 King Bed + 2 Twin Beds",
    size: 55,
    sizeUnit: "sqm",
    images: [
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80",
        alt: "Family Suite",
      },
    ],
    amenities: ["Free WiFi", "Air Conditioning", "Flat Screen TV", "Mini Bar", "Safe", "Balcony", "Sofa Bed"],
    ratePlans: [
      {
        id: "rate-3-1",
        name: "Room Only",
        price: 9000,
        currency: "₹",
        isRefundable: false,
        cancellationPolicy: "No Free Cancellation",
        mealPlan: "room_only",
      },
      {
        id: "rate-3-2",
        name: "Room with Breakfast",
        price: 10200,
        currency: "₹",
        isRefundable: true,
        cancellationPolicy: "Free cancellation until 24 hours before check-in",
        mealPlan: "breakfast",
      },
      {
        id: "rate-3-3",
        name: "Full Board",
        price: 12500,
        currency: "₹",
        isRefundable: true,
        cancellationPolicy: "Free cancellation until 72 hours before check-in",
        mealPlan: "full_board",
      },
    ],
    availableRooms: 2,
  },
];

const getMealIcon = (mealPlan?: string) => {
  switch (mealPlan) {
    case "breakfast":
      return <FaMugHot className="size-3.5" />;
    case "half_board":
    case "full_board":
    case "all_inclusive":
      return <FaUtensils className="size-3.5" />;
    default:
      return null;
  }
};

const getMealLabel = (mealPlan?: string) => {
  switch (mealPlan) {
    case "room_only":
      return "Room Only";
    case "breakfast":
      return "Breakfast Included";
    case "half_board":
      return "Half Board";
    case "full_board":
      return "Full Board";
    case "all_inclusive":
      return "All Inclusive";
    default:
      return "Room Only";
  }
};

export default function AvailableRooms({ searchParams, onFilterChange }: Props) {
  const router = useRouter();
  const params = useParams();
  const urlSearchParams = useSearchParams();
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!searchParams) return null;

  const handleRoomDetailsClick = (room: IRoom) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
  };

  const handleChooseRoom = () => {
    // Navigate to guest details step
    const destination = urlSearchParams.get("destination");
    const hotel = urlSearchParams.get("hotel");

    router.push(`/api-services/hotels/search?step=guest-details&destination=${destination}&hotel=${hotel}`);
  };

  // Transform IRoom to Dialog's Room type
  const transformRoomForDialog = (room: IRoom) => {
    if (!room) return null;
    return {
      id: room.id,
      name: room.type,
      roomType: room.type,
      bedType: room.bedType,
      view: "City View", // Default or from additional data
      size: room.size || 0,
      sleeps: room.maxOccupancy,
      images: room.images.map((img) => ({ url: img.url, name: img.alt || "" })),
      amenities: [
        {
          category: "Room Amenities",
          items: room.amenities,
        },
      ],
      ratePlans: room.ratePlans.map((rp) => ({
        id: rp.id,
        planName: rp.name,
        mealPlan: getMealLabel(rp.mealPlan),
        mealsIncluded:
          rp.mealPlan === "breakfast"
            ? ["Breakfast"]
            : rp.mealPlan === "half_board"
              ? ["Breakfast", "Dinner"]
              : rp.mealPlan === "full_board"
                ? ["Breakfast", "Lunch", "Dinner"]
                : [],
        cancellationPolicy: rp.cancellationPolicy,
        pricePerNight: rp.price,
        totalPrice: rp.price,
        nights: 1,
      })),
    };
  };

  return (
    <>
      <div className="space-y-4">
        <div className="bg-popover/30 backdrop-blur-md py-6 px-4 grid grid-cols-3 gap-4 items-end rounded-lg">
          <div className="space-y-1">
            <Label className="dark:text-muted-foreground">Check-in</Label>
            <DatePicker
              value={searchParams.checkIn ? new Date(searchParams.checkIn) : undefined}
              onChange={(date) => onFilterChange("checkIn", date?.toISOString() ?? "")}
            />
          </div>
          <div className="space-y-1">
            <Label className="dark:text-muted-foreground">Check-out</Label>
            <DatePicker
              value={searchParams.checkOut ? new Date(searchParams.checkOut) : undefined}
              onChange={(date) => onFilterChange("checkOut", date?.toISOString() ?? "")}
            />
          </div>
          <Button className="w-fit" size="lg">
            Change
          </Button>
        </div>

        <div className="space-y-6">
          {SAMPLE_ROOMS.map((room) => (
            <Card key={room.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-[380px_1fr] gap-6">
                  {/* Left side - Room Details */}
                  <div className="space-y-4">
                    <div className="relative h-[200px] rounded-lg overflow-hidden">
                      <Image
                        src={room.images[0].url}
                        alt={room.images[0].alt || room.type}
                        fill
                        className="object-cover"
                        sizes="380px"
                      />
                      {room.availableRooms <= 3 && (
                        <Badge className="absolute top-3 left-3 bg-destructive">Only {room.availableRooms} left</Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-xl mb-2">{room.type}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{room.description}</p>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="size-4" />
                          <span>Up to {room.maxOccupancy} guests</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bed className="size-4" />
                          <span>{room.bedType}</span>
                        </div>
                        {room.size && (
                          <div className="flex items-center gap-1.5">
                            <Maximize className="size-4" />
                            <span>
                              {room.size} {room.sizeUnit}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {room.amenities.slice(0, 4).map((amenity) => (
                          <AmenityBadge key={amenity} name={amenity} />
                        ))}
                        {room.amenities.length > 4 && (
                          <Badge variant="outline" className="py-1">
                            +{room.amenities.length - 4} more
                          </Badge>
                        )}
                      </div>

                      <Button
                        variant="link"
                        className="p-0 h-auto text-info "
                        onClick={() => handleRoomDetailsClick(room)}
                      >
                        Room details
                      </Button>
                    </div>
                  </div>

                  {/* Right side - Rate Plans */}
                  <div className="space-y-3">
                    {room.ratePlans.map((ratePlan) => (
                      <div
                        key={ratePlan.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getMealIcon(ratePlan.mealPlan)}
                            <span className="font-semibold text-base">{getMealLabel(ratePlan.mealPlan)}</span>
                          </div>

                          {ratePlan.description && (
                            <p className="text-xs text-muted-foreground">{ratePlan.description}</p>
                          )}

                          <div className="flex flex-col gap-1.5 text-xs">
                            {ratePlan.isRefundable ? (
                              <div className="flex items-center gap-1.5 text-success">
                                <CheckCircle className="size-3.5" />
                                <span>Free Cancellation</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-destructive">
                                <XCircle className="size-3.5" />
                                <span>Non-Refundable</span>
                              </div>
                            )}
                            {ratePlan.mealPlan && ratePlan.mealPlan !== "room_only" && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <FaMugHot className="size-3.5" />
                                <span>
                                  {ratePlan.mealPlan === "breakfast"
                                    ? "Breakfast"
                                    : ratePlan.mealPlan === "half_board"
                                      ? "Breakfast + Dinner"
                                      : ratePlan.mealPlan === "full_board"
                                        ? "All Meals"
                                        : "Meals Included"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right">
                            <div className="font-bold text-2xl">
                              {ratePlan.currency} {ratePlan.price.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">per night</div>
                          </div>
                          <Button className="w-full min-w-[120px]" onClick={handleChooseRoom}>
                            Choose room
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* <RoomDetailsDialog
        room={transformRoomForDialog(selectedRoom!)}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      /> */}
    </>
  );
}

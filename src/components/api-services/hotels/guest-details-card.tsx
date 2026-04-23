"use client";
import HotelBookingForm from "@/components/forms/api-service-forms/hotel-booking-details-form";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Moon } from "lucide-react";
import { RatingStar } from "@/components/common/RatingStars";

interface RoomDetail {
  roomNumber: number;
  roomType: string;
  mealPlan?: string;
  adults: number;
  children?: number;
}

interface BookingDetailsInfo {
  leadGuest: string;
  numberOfNights: number;
  checkInDate: string;
  checkOutDate: string;
  totalGuests: {
    adults: number;
    children?: number;
  };
}

interface HotelGuestDetailsCardProps {
  hotelName?: string;
  rating?: number;
  location?: string;
  mapLink?: string;
  hotelImage?: string;
  bookingDetails?: BookingDetailsInfo;
  rooms?: RoomDetail[];
}

const defaultBookingDetails: BookingDetailsInfo = {
  leadGuest: "Harsh Aggarwal",
  numberOfNights: 2,
  checkInDate: "02 Aug 2025",
  checkOutDate: "03 Aug 2025",
  totalGuests: {
    adults: 2,
    children: 1,
  },
};

const defaultRooms: RoomDetail[] = [
  {
    roomNumber: 1,
    roomType: "Standard Room",
    mealPlan: "Breakfast",
    adults: 2,
    children: 1,
  },
];

export default function HotelGuestDetailsCard({
  hotelName = "SinQ Beach Resort",
  rating = 4.5,
  location = "Thailand, Near I.G.I Airport Delhi",
  mapLink = "#",
  hotelImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.1.0&auto=format&fit=crop&q=80&w=1217",
  bookingDetails = defaultBookingDetails,
  rooms = defaultRooms,
}: HotelGuestDetailsCardProps) {
  return (
    <div className="space-y-6">
      {/* Hotel Booking Summary Card */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 h-full">
            {/* Hotel Image */}
            <div className="relative w-full aspect-square shrink-0 rounded-lg overflow-hidden border border-border">
              <Image src={hotelImage} alt={hotelName} fill className="object-cover" />
            </div>

            {/* Hotel Details */}
            <div className="col-span-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-tight">{hotelName}</h3>
                    <RatingStar rating={rating} />
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Hotel
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                  <Link href={mapLink} className="text-primary ml-1">
                    See on Map
                  </Link>
                </div>
              </div>

              {/* Booking Information Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 ">
                <InfoItem icon={<Users className="w-4 h-4" />} label="Lead Guest" value={bookingDetails.leadGuest} />
                <InfoItem
                  icon={<Moon className="w-4 h-4" />}
                  label="No of Nights"
                  value={bookingDetails.numberOfNights.toString()}
                />
                <InfoItem
                  icon={<Users className="w-4 h-4" />}
                  label="Total Guests"
                  value={`${bookingDetails.totalGuests.adults} Adults${
                    bookingDetails.totalGuests.children ? `, ${bookingDetails.totalGuests.children} Children` : ""
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 border-t pt-2">
                <InfoItem icon={<Calendar className="w-4 h-4" />} label="Check-in" value={bookingDetails.checkInDate} />
                <InfoItem
                  icon={<Calendar className="w-4 h-4" />}
                  label="Check-out"
                  value={bookingDetails.checkOutDate}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Details Card */}
      <Card>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-bold text-base">Room Details</h3>
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.roomNumber}
                  className="grid grid-cols-3 items-center gap-4 text-sm pb-3 border-b last:border-b-0 last:pb-0"
                >
                  <div className="font-medium">Room {room.roomNumber}</div>
                  <div>
                    <p className="font-medium">{room.roomType}</p>
                    {room.mealPlan && <p className="text-muted-foreground text-xs">Inc: {room.mealPlan}</p>}
                  </div>
                  <div className="text-muted-foreground">
                    {room.adults} Adult{room.adults > 1 ? "s" : ""}
                    {room.children ? `, ${room.children} Child` : ""}
                    {room.children && room.children > 1 ? "ren" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Booking Form */}
      <HotelBookingForm
        guestCount={{
          adults: bookingDetails.totalGuests.adults,
          children: bookingDetails.totalGuests.children,
        }}
        nextFun={() => {}}
      />
    </div>
  );
}

// Reusable InfoItem component
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex gap-2">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

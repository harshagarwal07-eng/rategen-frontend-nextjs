"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TabsList, TabsTrigger } from "@/components/ui/tabs-underline";
import ImageGrid5 from "@/components/ui/image-grids/image-grid-5";
import { RatingStar } from "@/components/common/RatingStars";
import { IHotelDetails, IHotelSearchParams } from "@/types/api-service";
import { AmenityBadge } from "../shared/amenity-badge";
import AvailableRooms from "./hotel-rooms-tab";
import HotelInfoTab from "./hotel-info-tab";
import HotelReviewsTab from "./hotel-reviews-tab";
import { Card } from "@/components/ui/card";

const SAMPLE_HOTEL: IHotelDetails = {
  id: "1357211",
  name: "Majestic Eco Comforts",
  description:
    "Experience luxury and comfort in the heart of Delhi. Our eco-friendly resort offers world-class amenities and exceptional service.",
  location: "Thailand, Near I.G.I Airport Delhi",
  address: "123 Airport Road, New Delhi, Delhi 110037, India",
  rating: 4.5,
  stars: 4,
  images: [
    {
      url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      alt: "Hotel lobby",
    },
    {
      url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
      alt: "Deluxe room",
    },
    {
      url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80",
      alt: "Hotel exterior",
    },
    {
      url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80",
      alt: "Swimming pool",
    },
    {
      url: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
      alt: "Restaurant",
    },
    {
      url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
      alt: "Hotel room",
    },
    {
      url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
      alt: "Hotel bathroom",
    },
  ],
  amenities: [
    {
      category: "General",
      items: [
        { name: "Free WiFi", available: true },
        { name: "Free Parking", available: true },
        { name: "Swimming Pool", available: true },
        { name: "Fitness Center", available: true },
        { name: "Restaurant", available: true },
        { name: "Room Service", available: true },
        { name: "Airport Shuttle", available: true },
      ],
    },
    {
      category: "Room Features",
      items: [
        { name: "Air Conditioning", available: true },
        { name: "Flat Screen TV", available: true },
        { name: "Mini Bar", available: true },
        { name: "Safe", available: true },
        { name: "Private Bathroom", available: true },
      ],
    },
  ],
  policies: [
    {
      title: "Check-in",
      description: "From 14:00",
    },
    {
      title: "Check-out",
      description: "Until 12:00",
    },
    {
      title: "Cancellation",
      description: "Free cancellation up to 24 hours before check-in",
    },
  ],
  rooms: [],
  reviews: [],
  ratingBreakdown: {
    cleanliness: 4.6,
    comfort: 4.5,
    location: 4.8,
    facilities: 4.4,
    staff: 4.7,
    valueForMoney: 4.3,
  },
  totalReviews: 1247,
};

const SAMPLE_SEARCH_PARAMS: IHotelSearchParams = {
  checkIn: "2025-11-15",
  checkOut: "2025-11-18",
  guestNationality: "India",
  paxRooms: [
    { adults: 2, children: 1, childrenAges: [8] },
    { adults: 2, children: 0 },
  ],
  searchReqID: "sample-req-123",
  hotelCode: "1357211",
};

const POPULAR_AMENITIES = ["Free WiFi", "Free Parking", "Swimming Pool", "Restaurant", "Airport Shuttle"];

export default function ChooseHotelRoomWrapper() {
  const [searchParams, setSearchParams] = useState<IHotelSearchParams>(SAMPLE_SEARCH_PARAMS);
  const hotel = SAMPLE_HOTEL;

  function handleFilterChange<K extends keyof IHotelSearchParams>(key: K, value: IHotelSearchParams[K]) {
    setSearchParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return (
    <div className="w-full h-full pr-10 space-y-4">
      <Card className="p-6 space-y-5 shadow-xs">
        <div className="space-y-2">
          <div className="flex gap-1.5 items-center font-semibold">
            {hotel.name}
            <RatingStar rating={hotel.stars} />
          </div>
          <p className="text-sm text-muted-foreground flex gap-1 items-center">
            <MapPin className="size-3" />
            <span>{hotel.location}</span>
            <Link href="#" className="text-primary ml-2">
              See on Map
            </Link>
          </p>
        </div>

        <ImageGrid5
          images={hotel.images.map((img) => ({
            url: img.url,
            name: img.alt || "",
            type: "image",
          }))}
        />

        <div>
          <p className="font-semibold">Popular Facilities</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR_AMENITIES.map((amenity) => (
              <AmenityBadge key={amenity} name={amenity} className="py-1.5 pointer-events-none" />
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="available-rooms">
        <div className="mb-4 border-b">
          <TabsList>
            <TabsTrigger className="data-[state=active]:text-primary" value="available-rooms">
              Prices
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:text-primary" value="hotel-info">
              Hotel Info
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:text-primary" value="reviews">
              Reviews
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="available-rooms">
          <AvailableRooms onFilterChange={handleFilterChange} searchParams={searchParams} />
        </TabsContent>
        <TabsContent value="hotel-info">
          <HotelInfoTab />
        </TabsContent>
        <TabsContent value="reviews">
          <HotelReviewsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

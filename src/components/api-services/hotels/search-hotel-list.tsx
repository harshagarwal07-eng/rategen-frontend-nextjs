"use client";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Check } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useRouter } from "next/navigation";
import { HotelSearchCard } from "./hotel-cards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IOption } from "@/types/common";

const sampleHotels = [
  {
    id: "hotel-1",
    name: "Grand Palace Hotel Bangkok",
    description:
      "Luxury 5-star hotel in the heart of Bangkok with stunning river views, infinity pool, and award-winning restaurants. Perfect for both business and leisure travelers.",
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=1170",
    location: "Sukhumvit, Bangkok",
    rating: 9.2,
    stars: 5,
    distance: "0.5 km from city center",
    features: {
      freeWifi: true,
      breakfast: true,
      restaurant: true,
      parking: true,
      freeCancellation: true,
    },
    rooms: {
      available: 12,
      type: "rooms",
    },
    price: {
      original: 8500,
      current: 6800,
      currency: "₹",
    },
    reviews: {
      count: 1247,
      score: 9.2,
    },
  },
  {
    id: "hotel-2",
    name: "Riverside Boutique Resort",
    description:
      "Charming boutique hotel along the Chao Phraya River. Features traditional Thai architecture blended with modern amenities and personalized service.",
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=1170",
    location: "Riverside, Bangkok",
    rating: 8.9,
    stars: 4,
    distance: "1.2 km from city center",
    features: {
      freeWifi: true,
      breakfast: true,
      restaurant: true,
      parking: false,
      freeCancellation: true,
    },
    rooms: {
      available: 8,
      type: "rooms",
    },
    price: {
      current: 4200,
      currency: "₹",
    },
    reviews: {
      count: 856,
      score: 8.9,
    },
  },
  {
    id: "hotel-3",
    name: "Bangkok Business Suites",
    description:
      "Modern hotel designed for business travelers. Located in the central business district with easy access to BTS Skytrain and shopping centers.",
    img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=1170",
    location: "Sathorn, Bangkok",
    rating: 8.5,
    stars: 4,
    distance: "0.8 km from city center",
    features: {
      freeWifi: true,
      breakfast: false,
      restaurant: true,
      parking: true,
      freeCancellation: false,
    },
    rooms: {
      available: 15,
      type: "suites",
    },
    price: {
      original: 5500,
      current: 4950,
      currency: "₹",
    },
    reviews: {
      count: 634,
      score: 8.5,
    },
  },
  {
    id: "hotel-4",
    name: "Siam Heritage Hotel",
    description:
      "Affordable comfort in the heart of shopping district. Walking distance to major attractions, night markets, and authentic Thai street food.",
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=1170",
    location: "Siam Square, Bangkok",
    rating: 8.1,
    stars: 3,
    distance: "0.3 km from city center",
    features: {
      freeWifi: true,
      breakfast: true,
      restaurant: false,
      parking: false,
      freeCancellation: true,
    },
    rooms: {
      available: 20,
      type: "rooms",
    },
    price: {
      current: 2800,
      currency: "₹",
    },
    reviews: {
      count: 1092,
      score: 8.1,
    },
  },
];

const SORT_OPTIONS: IOption[] = [
  { label: "Our top picks", value: "top-picks" },
  { label: "Price (low to high)", value: "price+asc" },
  { label: "Price (high to low)", value: "price+desc" },
  { label: "Stars (low to high)", value: "stars+asc" },
  { label: "Stars (high to low)", value: "stars+desc" },
  { label: "Distance from centre", value: "distance+asc" },
  { label: "Rating (high to low)", value: "rating+desc" },
];

export default function SearchHotelList() {
  const router = useRouter();
  const [queryStates, setQueryStates] = useQueryStates(
    {
      step: parseAsString.withDefault("choose-room"),
      destination: parseAsString.withDefault(""),
      hotel: parseAsString.withDefault(""),
      sortBy: parseAsString.withDefault(""),
    },
    {
      history: "push",
    }
  );

  const handleSortChange = (value: string) => {
    setQueryStates({ sortBy: value });
  };

  const handleClick = async (hotelName: string) => {
    const hotelSlug = hotelName.toLowerCase().replace(/\s+/g, "-");

    await setQueryStates({
      hotel: hotelSlug,
    });

    router.refresh();
  };

  return (
    <div className="h-full space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Bangkok : 4 hotels available</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={"ghost"} className="bg-popover/50 text-foreground border">
              <ArrowUpDown className="size-4" /> Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                disabled={queryStates.sortBy === option.value}
              >
                {option.label}
                {queryStates.sortBy === option.value && <Check />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        {sampleHotels.map((hotel) => (
          <HotelSearchCard key={hotel.id} hotelData={hotel} onClick={() => handleClick(hotel.name)} />
        ))}
      </div>
    </div>
  );
}

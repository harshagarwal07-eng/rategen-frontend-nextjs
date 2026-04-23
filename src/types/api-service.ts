import { IOption } from "./common";

export type IApiServices = "hotel";

export type FilterType = "search" | "slider" | "multi-select" | "radio-group" | "date-range" | "star-rating";

export interface BaseFilterConfig {
  type: FilterType;
  key: string;
  label?: string;
  defaultValue?: any;
  defaultOpen?: boolean;
}

export interface SearchFilterConfig extends BaseFilterConfig {
  type: "search";
  placeholder?: string;
  defaultValue?: string;
}

export interface SliderFilterConfig extends BaseFilterConfig {
  type: "slider";
  min?: number;
  max?: number;
  defaultValue?: number;
  showValue?: boolean;
}

export interface MultiSelectFilterConfig extends BaseFilterConfig {
  type: "multi-select";
  options: IOption[];
  defaultValue?: string[];
}

export interface RadioGroupFilterConfig extends BaseFilterConfig {
  type: "radio-group";
  options: IOption[];
  defaultValue?: string;
}

export interface DateRangeFilterConfig extends BaseFilterConfig {
  type: "date-range";
  defaultValue?: { from?: Date; to?: Date };
}

export interface StarRatingFilterConfig extends BaseFilterConfig {
  type: "star-rating";
  defaultValue?: number[];
}

export type IFilterConfig =
  | SearchFilterConfig
  | SliderFilterConfig
  | MultiSelectFilterConfig
  | RadioGroupFilterConfig
  | DateRangeFilterConfig
  | StarRatingFilterConfig;

// hotel api ui interfaces
export type HotelBookingStatus = "confirmed" | "pending" | "cancelled";

export interface HotelBookingCardProps {
  hotelName: string;
  rating: number;
  location: string;
  imageUrl: string;
  status: HotelBookingStatus;
  confirmationNumber: string;
  referenceNumber: string;
  price: number;
  lastVoucherDate: string;
  lastCancellationDate: string;
  checkInDate: string;
  checkOutDate: string;
  leadGuestName: string;
  bookedDate: string;
  bookingId: string;
  onCancel?: () => void;
  onWhatsApp?: () => void;
  className?: string;
}

export interface IPaxRoom {
  adults: number;
  children: number;
  childrenAges?: number[];
}

export interface IHotelSearchParams {
  checkIn: string;
  checkOut: string;
  guestNationality: string;
  paxRooms: IPaxRoom[];
  searchReqID: string;
  hotelCode: string;
}

export interface IAmenityItem {
  name: string;
  available: boolean;
}

export interface IAmenityCategory {
  category: string;
  items: IAmenityItem[];
}

export interface IHotelPolicy {
  title: string;
  description: string;
  icon?: string;
}

export interface IRoomImage {
  url: string;
  alt?: string;
}

export interface IRatePlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isRefundable: boolean;
  cancellationPolicy: string;
  mealPlan?: "room_only" | "breakfast" | "half_board" | "full_board" | "all_inclusive";
  amenities?: string[];
}

export interface IRoom {
  id: string;
  type: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  size?: number;
  sizeUnit?: "sqm" | "sqft";
  images: IRoomImage[];
  amenities: string[];
  ratePlans: IRatePlan[];
  availableRooms: number;
}

export interface IHotelReview {
  id: string;
  guestName: string;
  rating: number;
  date: string;
  comment: string;
  isVerified?: boolean;
  helpfulCount?: number;
  avatar?: string;
}

export interface IRatingBreakdown {
  cleanliness: number;
  comfort: number;
  location: number;
  facilities: number;
  staff: number;
  valueForMoney: number;
}

export interface IHotelDetails {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  rating: number;
  stars: number;
  images: IRoomImage[];
  amenities: IAmenityCategory[];
  policies: IHotelPolicy[];
  rooms: IRoom[];
  reviews: IHotelReview[];
  ratingBreakdown: IRatingBreakdown;
  totalReviews: number;
}

export interface IHotelSearchCard {
  id: string;
  name: string;
  description: string;
  img: string;
  location: string;
  rating: number;
  stars: number;
  distance: string;
  features: {
    freeWifi: boolean;
    breakfast: boolean;
    restaurant: boolean;
    parking: boolean;
    freeCancellation: boolean;
  };
  rooms: {
    available: number;
    type: string;
  };
  price: {
    original?: number;
    current: number;
    currency: string;
  };
  reviews: {
    count: number;
    score: number;
  };
}

"use client";
import { IOption } from "@/types/common";
import UnifiedFilterContainer from "../shared/UnifiedFilterContainer";
import { IFilterConfig } from "@/types/api-service";

const HOTEL_POPULAR_FILTERS: IOption[] = [
  { label: "Free cancellation", value: "free-cancellation" },
  { label: "Parking", value: "parking" },
  { label: "Breakfast included", value: "breakfast-included" },
  { label: "Swimming pool", value: "swimming-pool" },
  { label: "Hotels", value: "hotels" },
  { label: "Apartments", value: "apartments" },
];

const HOTEL_DISTANCE_FROM_CENTER: IOption[] = [
  { label: "Less than 1 km", value: "less-than-1km" },
  { label: "Less than 3 km", value: "less-than-3km" },
  { label: "Less than 5 km", value: "less-than-5km" },
];

const HOTEL_RESERVATION_POLICY: IOption[] = [{ label: "Free cancellation", value: "free-cancellation" }];

const HOTEL_PROPERTY_TYPES: IOption[] = [
  { label: "Hotels", value: "hotels" },
  { label: "Apartments", value: "apartments" },
  { label: "Hostel/Backpacker accommodation", value: "hostel-backpacker" },
  { label: "Resorts", value: "resorts" },
  { label: "Capsule hotels", value: "capsule-hotels" },
  { label: "Guest houses", value: "guest-houses" },
  { label: "Condos", value: "condos" },
];

const HOTEL_MEAL_PLANS: IOption[] = [
  { label: "Breakfast included", value: "breakfast-included" },
  { label: "Lunch included", value: "lunch-included" },
  { label: "Dinner included", value: "dinner-included" },
  {
    label: "Breakfast and lunch/dinner included",
    value: "breakfast-lunch-dinner",
  },
  { label: "All meals included", value: "all-meals-included" },
  { label: "All-inclusive", value: "all-inclusive" },
];

const HOTEL_FACILITIES: IOption[] = [
  { label: "Non-smoking rooms", value: "non-smoking-rooms" },
  { label: "Air conditioning", value: "air-conditioning" },
  { label: "Parking", value: "parking" },
  { label: "Swimming pool", value: "swimming-pool" },
  { label: "Family rooms", value: "family-rooms" },
  { label: "Fitness center", value: "fitness-center" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Room service", value: "room-service" },
  { label: "Wheelchair accessible", value: "wheelchair-accessible" },
];

const filters: IFilterConfig[] = [
  {
    type: "star-rating",
    key: "rating",
    label: "Star Rating",
    defaultValue: [],
  },
  {
    type: "slider",
    key: "price",
    label: "Price",
    min: 3,
    max: 10000,
    defaultValue: 0,
  },
  {
    type: "search",
    key: "hotelName",
    label: "Hotel Name",
    placeholder: "Search by hotel name",
    defaultValue: "",
  },
  {
    type: "multi-select",
    key: "popularFilters",
    label: "Popular filters",
    options: HOTEL_POPULAR_FILTERS,
    defaultValue: [],
  },
  {
    type: "multi-select",
    key: "distanceFromCenter",
    label: "Distance from the center",
    options: HOTEL_DISTANCE_FROM_CENTER,
    defaultValue: [],
  },
  {
    type: "multi-select",
    key: "reservationPolicy",
    label: "Reservation policy",
    options: HOTEL_RESERVATION_POLICY,
    defaultValue: [],
  },
  {
    type: "multi-select",
    key: "propertyType",
    label: "Property type",
    options: HOTEL_PROPERTY_TYPES,
    defaultValue: [],
  },
  {
    type: "multi-select",
    key: "mealPlans",
    label: "Meal plans",
    options: HOTEL_MEAL_PLANS,
    defaultValue: [],
  },
  {
    type: "multi-select",
    key: "facilities",
    label: "Facilities",
    options: HOTEL_FACILITIES,
    defaultValue: [],
  },
];

type Props = {
  onApplyFilters: () => void;
  isLoading: boolean;
};

export default function SearchHotelFilters({ onApplyFilters, isLoading }: Props) {
  return <UnifiedFilterContainer filters={filters} onApply={onApplyFilters} isLoading={isLoading} />;
}

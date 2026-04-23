import { MapPin, Package, Plane, Sparkles, Utensils } from "lucide-react";
import { CURRENCY_DUMP } from "./currency-dump";
import { City, Country } from "country-state-city";
import { FaBed, FaCar, FaMountainSun, FaTrainSubway, FaFerry, FaHelicopter, FaShip } from "react-icons/fa6";
import { ITpripOptions } from "@/types/crm-query";

export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

export const queryTypes = [
  { value: "fit", label: "FIT (1 to 9 pax)" },
  { value: "git", label: "GIT (9+ pax)" },
  // { value: "mice", label: "MICE " },
];

export const CURRENCY_OPTIONS = CURRENCY_DUMP.map((d) => ({
  value: d.code,
  label: `${d.code} - ${d.currency}`,
}));

export const CURRENCY_OPTIONS_LABEL = (currency: string) => {
  return CURRENCY_DUMP.find((option) => option.code === currency)?.currency;
};

export const TRANSFER_MODES = [
  { value: "vehicle", label: "Vehicle" },
  { value: "vehicle_on_disposal", label: "Vehicle On Disposal" },
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
  { value: "helicopter", label: "Helicopter" },
  { value: "boat", label: "Boat" },
  { value: "ferry", label: "Ferry" },
  { value: "cruise", label: "Cruise" },
];

export const GUIDE_TYPES = [
  { value: "full_day", label: "Full day guide" },
  { value: "half_day", label: "Half day guide" },
  { value: "multi_day", label: "Multi-day guide" },
];

export const HOTEL_PROPERTY_TYPES = [
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resort" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "cruise", label: "Cruise" },
  { value: "b_and_b", label: "B&B" },
];

export const HOTEL_STAR_RATING = [
  { value: "1*", label: "1 ★" },
  { value: "2*", label: "2 ★" },
  { value: "3*", label: "3 ★" },
  { value: "4*", label: "4 ★" },
  { value: "5*", label: "5 ★" },
  { value: "unrated", label: "Unrated" },
];

export const AGENCY_CATEGORIES = [
  { value: "unrated", label: "Unrated" },
  { value: "3", label: "3★" },
  { value: "4", label: "4★" },
  { value: "5", label: "5★" },
];

export const COUNTRY_OPTIONS = Country.getAllCountries().map((country) => ({
  value: country.isoCode,
  label: country.name,
}));

export const CITY_OPTIONS_SEARCH = (countryCode: string) => {
  return Array.from(new Set(City.getCitiesOfCountry(countryCode)?.map((city) => city.name) || []));
};

export const SERVICE_TYPES = [
  { value: "tours", label: "Default Tour" },
  { value: "transfers", label: "Default Transfer" },
  { value: "hotels", label: "Default Hotel" },
  { value: "car_on_disposals", label: "Default Car on Disposal" },
  { value: "guides", label: "Default Guide" },
  { value: "meals", label: "Default Meal" },
  { value: "travel_theme", label: "Default Travel Theme" },
  { value: "sell_policy", label: "Default Sell Policy" },
  { value: "markup_policy", label: "Default Markup Policy" },
];

export const TASK_OFFSET_UNITS = [
  { value: "minute", label: "Minute(s)" },
  { value: "hour", label: "Hour(s)" },
  { value: "day", label: "Day(s)" },
] as const;

export const TASK_REFERENCE_TYPES = [
  { value: "booking_confirm", label: "Booking Confirm" },
  { value: "trip_start", label: "Trip Start Date" },
  // { value: "service_date", label: "Service Date" },
] as const;

export const TASK_CATEGORIES = [
  { value: "package", label: "Package" },
  { value: "finance", label: "Finance" },
  { value: "on_trip", label: "On Trip" },
  { value: "hotel", label: "Hotel" },
  { value: "tour", label: "Tour" },
  { value: "transfer", label: "Transfer" },
  { value: "meal", label: "Meal" },
  { value: "guide", label: "Guide" },
] as const;

export const TASK_CATEGORY_OPTIONS = [
  { value: "hotel", label: "Hotel" },
  { value: "tour", label: "Tour" },
  { value: "transfer", label: "Transfer" },
  { value: "meal", label: "Meal" },
  { value: "guide", label: "Guide" },
  { value: "package", label: "Package" },
  { value: "finance", label: "Finance" },
  { value: "on_trip", label: "On Trip" },
] as const;

export const TRIP_OPTIONS: ITpripOptions[] = [
  {
    label: "Hotel/Stay",
    value: "hotel",
    icon: FaBed,
  },
  {
    label: "Transfer",
    value: "transfer",
    icon: FaCar,
  },
  {
    label: "Boat Transfer",
    value: "transfer_boat",
    icon: FaFerry,
  },
  {
    label: "Speedboat",
    value: "transfer_speedboat",
    icon: FaFerry,
  },
  {
    label: "Ferry",
    value: "transfer_ferry",
    icon: FaShip,
  },
  {
    label: "Helicopter",
    value: "transfer_helicopter",
    icon: FaHelicopter,
  },
  {
    label: "Tour/Activity",
    value: "tour",
    icon: FaMountainSun,
  },
  {
    label: "Flight",
    value: "flight",
    icon: Plane,
  },
  {
    label: "Train",
    value: "train",
    icon: FaTrainSubway,
  },
  {
    label: "Food/Drink",
    value: "food",
    icon: Utensils,
  },
  {
    label: "Meal Plan",
    value: "meal_plan",
    icon: Utensils,
  },
  {
    label: "Combo Package",
    value: "combo",
    icon: Package,
  },
  {
    label: "Meal",
    value: "meal",
    icon: Utensils,
  },
  {
    label: "Activity",
    value: "activity",
    icon: Sparkles,
  },
  {
    label: "Custom/UI",
    value: "custom_ui",
    icon: MapPin,
  },
];

export const UUID_IN = "141e6476-77ce-443f-bf3b-bfc1b67623cc";

export const DEPARTMENT_OPTIONS = [
  { value: "Management", label: "Management" },
  { value: "FIT Reservation", label: "FIT Reservation" },
  { value: "Group Reservation", label: "Group Reservation" },
  { value: "Support", label: "Support" },
  { value: "Operations", label: "Operations" },
  { value: "Finance", label: "Finance" },
  { value: "Sales", label: "Sales" },
];

export const BOOKING_MODE_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "online_or_offline", label: "Online/Offline" },
];

export const MEAL_CUISINES = [
  { value: "local", label: "Local" },
  { value: "indian", label: "Indian" },
  { value: "chinese", label: "Chinese" },
  { value: "italian", label: "Italian" },
  { value: "mexican", label: "Mexican" },
];

export const MEAL_OPTIONS = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non Veg" },
  { value: "veg_or_nonveg", label: "Veg/Non Veg" },
];

export const MEAL_RATE_TYPES = [
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "breakfast", label: "Breakfast" },
  { value: "snacks", label: "Snacks" },
  { value: "dessert", label: "Dessert" },
];

export const HOTEL_MEAL_PLANS = [
  { value: "RO", label: "RO - Room Only" },
  { value: "BB", label: "BB - Bed & Breakfast" },
  { value: "HB", label: "HB - Half Board" },
  { value: "FB", label: "FB - Full Board" },
  { value: "AI", label: "AI - All Inclusive" },
];

export const VEHICLE_CATEGORIES = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];
export const VEHICLE_TYPES = [
  { value: "compact", label: "Compact" },
  { value: "sedan", label: "Sedan" },
  { value: "mpv", label: "MPV" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "coach", label: "Coach" },
  { value: "bus", label: "Bus" },
];
export const OWNERSHIP_TYPES = [
  { value: "company", label: "Company Owned" },
  { value: "supplier", label: "Supplier" },
  { value: "custom", label: "Custom" },
];

export const LANGUAGES = [
  { value: "arabic", label: "Arabic" },
  { value: "chinese", label: "Chinese" },
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "hindi", label: "Hindi" },
  { value: "local", label: "Local" },
  { value: "spanish", label: "Spanish" },
];

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const PAYROLL_TYPES = [
  { value: "company", label: "Company" },
  { value: "supplier", label: "Supplier" },
  { value: "independent", label: "Independent" },
];

export const PRICING_UNIT_TYPES = [
  { value: "night", label: "Night" },
  { value: "room", label: "Room" },
  { value: "day", label: "Day" },
  { value: "per_person", label: "Per Person" },
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "infant", label: "Infant" },
  { value: "vehicle", label: "Vehicle" },
  { value: "tour", label: "Tour" },
  { value: "package", label: "Package" },
];

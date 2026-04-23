"use client";

import { IOption } from "@/types/common";
import UnifiedFilterContainer from "../shared/UnifiedFilterContainer";
import { IFilterConfig } from "@/types/booking-filter";

const POPULAR_FILTERS: IOption[] = [
  { label: "Cancelled", value: "cancelled" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Vouchered", value: "vouchered" },
  { label: "Pending", value: "pending" },
  { label: "Void", value: "void" },
  { label: "Cancellation Pending", value: "cancellation-pending" },
];

const SHOW_OPTIONS: IOption[] = [
  { label: "Auto", value: "auto" },
  { label: "Manual", value: "manual" },
];

const TYPE_OPTIONS: IOption[] = [
  { label: "Domestic", value: "domestic" },
  { label: "International", value: "international" },
  { label: "Both", value: "both" },
];

const SORT_OPTIONS: IOption[] = [
  { label: "Last Cancellation Date", value: "last_cancellation_date" },
  {
    label: "Last Cancellation Date Expired",
    value: "last_cancellation_date_expired",
  },
  { label: "Last Voucher Date", value: "last_voucher_date" },
  { label: "None", value: "none" },
];

const filters: IFilterConfig[] = [
  {
    type: "multi-select",
    key: "popularFilters",
    label: "Popular Filters",
    options: POPULAR_FILTERS,
    defaultValue: [],
  },
  {
    type: "radio-group",
    key: "type",
    options: TYPE_OPTIONS,
    defaultValue: "both",
  },
  {
    type: "multi-select",
    key: "show",
    label: "Show",
    options: SHOW_OPTIONS,
    defaultValue: [],
  },
  {
    type: "date-range",
    key: "hotelBookingDate",
    label: "Hotel Booking Date",
  },
  {
    type: "date-range",
    key: "checkInDate",
    label: "Check-in Date",
  },
  {
    type: "date-range",
    key: "lastVoucherDate",
    label: "Last Voucher Date",
  },
  {
    type: "search",
    key: "hotelName",
    label: "Restrict Hotel(s)",
    placeholder: "Enter Hotel Name",
  },
  {
    type: "search",
    key: "guestName",
    label: "Restrict Guest Name",
    placeholder: "Enter Guest Name",
  },
  {
    type: "search",
    key: "fileNo",
    label: "Restrict By File No.",
    placeholder: "File No.",
  },
  {
    type: "search",
    key: "confirmationNo",
    label: "Restrict By Conf No./Ref.No./Hotel Conf No.",
    placeholder: "Conf No. /Ref No. /Hotel Conf No.",
  },
  {
    type: "radio-group",
    key: "sort",
    label: "Sort",
    options: SORT_OPTIONS,
    defaultValue: "none",
  },
];

export default function HotelMyBookingsFilters() {
  const handleApplyFilters = () => {
    console.log("Applying filters...");
  };

  return <UnifiedFilterContainer filters={filters} onApply={handleApplyFilters} isLoading={false} />;
}

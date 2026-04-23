import { searchParams } from "@/lib/searchparams";
import { createSearchParamsCache, createSerializer, parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const bookingsSearchParams = {
  ...searchParams,
  view: parseAsStringLiteral(["table", "grid", "calendar"] as const).withDefault("table"),
  booking_status: parseAsArrayOf(parseAsString).withDefault([]),
  voucher_status: parseAsArrayOf(parseAsString).withDefault([]),
  payment_status: parseAsArrayOf(parseAsString).withDefault([]),
  service_type: parseAsArrayOf(parseAsString).withDefault([]),
  supplier: parseAsArrayOf(parseAsString).withDefault([]),
  country: parseAsArrayOf(parseAsString).withDefault([]),
  city: parseAsArrayOf(parseAsString).withDefault([]),
  agency: parseAsArrayOf(parseAsString).withDefault([]),
  start_date: parseAsString,
  end_date: parseAsString,
};

export const bookingsSearchParamsCache = createSearchParamsCache(bookingsSearchParams);
export const bookingsSerialize = createSerializer(bookingsSearchParams);

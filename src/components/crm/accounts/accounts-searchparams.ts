import { searchParams } from "@/lib/searchparams";
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsString,
} from "nuqs/server";

export const accountsSearchParams = {
  ...searchParams,
  status: parseAsArrayOf(parseAsString).withDefault([]),
  start_date: parseAsString,
  end_date: parseAsString,
  agency: parseAsArrayOf(parseAsString).withDefault([]),
  plan_type: parseAsArrayOf(parseAsString).withDefault([]),
  payment_method: parseAsArrayOf(parseAsString).withDefault([]),
  transaction_type: parseAsArrayOf(parseAsString).withDefault([]),
  service_type: parseAsArrayOf(parseAsString).withDefault([]),
  view: parseAsString.withDefault("agent"),
};

export const accountsSearchParamsCache = createSearchParamsCache(accountsSearchParams);

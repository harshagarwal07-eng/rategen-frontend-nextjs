import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { BookingsWrapper } from "@/components/bookings/bookings-wrapper";
import { bookingsSearchParamsCache } from "@/components/bookings/bookings-searchparams";
import { getQueryBookingsWithActivities } from "@/data-access/bookings";

export const metadata: Metadata = {
  title: "Bookings",
  description: "Manage bookings and vouchers",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function BookingsPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  bookingsSearchParamsCache.parse(_searchParams);

  const parsedParams = bookingsSearchParamsCache.all();
  const normalizedParams = {
    ...parsedParams,
    search: parsedParams.search ?? undefined,
    start_date: parsedParams.start_date ?? undefined,
    end_date: parsedParams.end_date ?? undefined,
  };
  const data = await getQueryBookingsWithActivities(undefined, normalizedParams);

  return <BookingsWrapper searchParams={normalizedParams} initialData={data} />;
}

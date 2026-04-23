"use client";

import { DatastoreSearchParams } from "@/types/datastore";
import { RestaurantsDataTableWrapper } from "@/components/docs/library/restaurants/restaurants-data-table-wrapper";
import { IRestaurant } from "@/types/docs";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: IRestaurant[]; totalItems: number };
};

export default function RestaurantsClient({ initialData }: Props) {
  return <RestaurantsDataTableWrapper data={initialData} />;
}

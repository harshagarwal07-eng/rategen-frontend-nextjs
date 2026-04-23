"use client";

import { DatastoreSearchParams } from "@/types/datastore";
import { GuidesDataTableWrapper } from "@/components/docs/library/guides/guides-data-table-wrapper";
import { IGuide } from "@/types/docs";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: IGuide[]; totalItems: number };
};

export default function GuidesClient({ initialData }: Props) {
  return <GuidesDataTableWrapper data={initialData} />;
}

"use client";

import { IQueryDetails } from "@/types/crm-query";
import { format } from "date-fns";
import {
  DetailDataList,
  DetailDataListItem,
} from "@/components/crm/shared/detail-data-list";

type Props = {
  query: IQueryDetails;
};

export default function TravelDetailsSection({ query }: Props) {
  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), "MMMM dd, yyyy");
    } catch {
      return "-";
    }
  };

  // Calculate total PAX
  const totalAdults = query.pax_details.adults;
  const childAges = query.pax_details.children_ages || [];
  const totalChildren = childAges.length;
  const totalPax = totalAdults + totalChildren;

  // Format PAX details
  const paxSummary = [];
  if (totalAdults > 0) {
    paxSummary.push(`${totalAdults} Adult${totalAdults > 1 ? "s" : ""}`);
  }
  if (totalChildren > 0) {
    paxSummary.push(
      `${totalChildren} Child${
        totalChildren > 1 ? "ren" : ""
      } (${childAges.join(", ")} yrs)`
    );
  }

  const countries = query.travel_country_names?.join(", ") || "-";

  const items: DetailDataListItem[] = [
    {
      id: "travel_date",
      label: "Travel Date",
      value: formatDate(query.travel_date),
    },
    {
      id: "duration",
      label: "Duration",
      value: query.duration ? `${query.duration} Night${query.duration > 1 ? "s" : ""}` : "-",
    },
    {
      id: "countries",
      label: "Countries",
      value: countries,
    },
    {
      id: "pax",
      label: "PAX",
      value: (
        <div>
          <p className="text-xs leading-tight">{totalPax} Total</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
            {paxSummary.join(", ")}
          </p>
        </div>
      ),
    },
    {
      id: "nationality",
      label: "Nationality",
      value: query.nationality_name || query.nationality,
    },
  ];

  return (
    <DetailDataList
      items={items}
      accordion={{
        title: "Travel Details",
        value: "travel-details",
        defaultOpen: true,
      }}
    />
  );
}

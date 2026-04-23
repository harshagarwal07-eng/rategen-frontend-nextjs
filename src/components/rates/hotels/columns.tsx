"use client";

import { EyePopover } from "@/components/common/eye-popover";
import { MarkdownEyePopover } from "@/components/common/markdown-eye-popover";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { CURRENCY_OPTIONS, CURRENCY_OPTIONS_LABEL, HOTEL_STAR_RATING } from "@/constants/data";
import { fetchCitiesBySearch, fetchCountriesBySearch } from "@/lib/table-utils";
import { Hotel } from "@/types/hotels";
import { Column, ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { CellAction } from "./cell-actions";
import IndicateLocked from "@/components/common/indicate-locked";

export const generateHotelColumns = (isDatastore: boolean = false): ColumnDef<Hotel>[] => {
  const baseColumns: ColumnDef<Hotel>[] = [
    // Always show actions column as first column
    ...(!isDatastore
      ? [
          {
            id: "actions",
            enablePinning: true,
            cell: ({ row }: { row: any }) => <CellAction data={row.original} />,
            enableSorting: false,
            enableHiding: false,
          },
        ]
      : []),
    {
      id: "hotel_name",
      accessorKey: "hotel_name",
      header: ({ column }: { column: Column<Hotel, unknown> }) => (
        <DataTableColumnHeader column={column} title="Hotel Name" style={{ width: "240px" }} />
      ),
      cell: ({ row }) => {
        const hotel = row.original;
        const isLinked = !!hotel.hotel_datastore_id && !hotel.is_unlinked;

        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {hotel.hotel_name}{" "}
              {isLinked && <IndicateLocked tooltip="This hotel is linked to datastore" className="-mt-1" />}
            </span>
          </div>
        );
      },
      meta: {
        label: "Search",
        placeholder: "Search hotels by name",
        variant: "text",
        icon: Search,
      },
      enableColumnFilter: true,
      enablePinning: true,
    },
    // {
    //   id: "hotel_datastore_id",
    //   accessorKey: "hotel_datastore_id",
    //   header: "Linked to",
    //   cell: ({ row }) => {
    //     const hotel = row.original;
    //     const isLinked =
    //       hotel.hotel_datastore_id !== null && hotel.is_unlinked !== true;

    //     return (
    //       <>
    //         {isLinked ? (
    //           <Badge variant="default">Datastore</Badge>
    //         ) : (
    //           <Badge variant="outline">Independent</Badge>
    //         )}
    //       </>
    //     );
    //   },
    // },
    {
      id: "hotel_description",
      accessorKey: "hotel_description",
      header: "Description",
      cell: ({ cell }) => {
        return <EyePopover title="Description" description={cell.getValue<Hotel["hotel_description"]>() || "-"} />;
      },
    },
    {
      id: "currency",
      accessorKey: "hotel_currency",
      header: "Currency",
      enableColumnFilter: true,
      meta: {
        label: "Currency",
        variant: "multiSelect",
        options: CURRENCY_OPTIONS,
      },
      cell: ({ cell }) => {
        return <div>{CURRENCY_OPTIONS_LABEL(cell.getValue<Hotel["hotel_currency"]>())}</div>;
      },
    },
    {
      id: "hotel_star",
      accessorKey: "star_rating",
      header: "Rating",
      enableColumnFilter: true,
      cell: ({ cell }) => {
        return <div>{HOTEL_STAR_RATING.find((v) => v.value === cell.getValue<Hotel["star_rating"]>())?.label}</div>;
      },
    },
    {
      id: "property_type",
      accessorKey: "property_type",
      header: "Property Type",
      cell: ({ cell }) => <p className="capitalize text-sm">{cell.getValue<Hotel["property_type"]>()}</p>,
    },
    {
      id: "country",
      accessorKey: "country_name",
      header: "Country",
      enableColumnFilter: true,
      meta: {
        label: "Country",
        variant: "multiSelectSearch",
        onSearch: fetchCountriesBySearch,
      },
      cell: ({ cell }) => cell.getValue(),
    },
    {
      id: "city",
      accessorKey: "city_name",
      header: "City",
      enableColumnFilter: true,
      meta: {
        label: "City",
        variant: "multiSelectSearch",
        onSearch: fetchCitiesBySearch,
      },
      cell: ({ cell }) => cell.getValue(),
    },
    {
      id: "payment_policy",
      accessorKey: "payment_policy",
      header: "Payment Policy",
      cell: ({ cell }) => {
        return <EyePopover title="Payment Policy" description={cell.getValue<Hotel["payment_policy"]>()} />;
      },
    },
    {
      id: "rooms",
      accessorKey: "rooms",
      // header: ({ column }: { column: Column<Hotel, unknown> }) => (
      //   <DataTableColumnHeader column={column} title="Rooms" />
      // ),
      header: "Rooms",
      cell: ({ row }) => {
        const hotel = row.original;
        const roomCount = hotel.rooms?.length || 0;

        return (
          <div className="text-center">
            <span className="font-medium">{roomCount}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: "preferred",
      accessorKey: "preferred",
      header: ({ column }: { column: Column<Hotel, unknown> }) => (
        <DataTableColumnHeader column={column} title="Preferred" />
      ),
      cell: ({ cell }) => <div>{cell.getValue<Hotel["preferred"]>() ? "Yes" : "No"}</div>,
    },
    {
      id: "markup",
      accessorKey: "markup",
      header: ({ column }: { column: Column<Hotel, unknown> }) => (
        <DataTableColumnHeader column={column} title="Markup" />
      ),
    },
    {
      id: "cancellation",
      accessorKey: "cancellation_policy",
      header: "Cancellation",
      cell: ({ cell }) => {
        return <EyePopover title="Cancellation Policy" description={cell.getValue<Hotel["cancellation_policy"]>()} />;
      },
    },
    {
      id: "remarks",
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ cell }) => {
        return <EyePopover title="Remarks" description={cell.getValue<Hotel["remarks"]>()} />;
      },
    },
    // {
    //   id: "examples",
    //   accessorKey: "examples",
    //   header: "Examples",
    //   cell: ({ cell }) => {
    //     return (
    //       <EyePopover
    //         title="Examples"
    //         description={cell.getValue<Hotel["examples"]>() || "-"}
    //       />
    //     );
    //   },
    // },
    {
      id: "age_policy",
      accessorKey: "age_policy",
      header: "Age Policy",
      cell: ({ row }) => {
        const policy = row.original.age_policy;
        if (!policy) return "-";

        const categories = [];
        if (policy.adult?.meals) {
          categories.push(`Adult: ${policy.adult.meals.from}-${policy.adult.meals.to} years`);
        }
        if (policy.teenager?.meals) {
          categories.push(`Teenager: ${policy.teenager.meals.from}-${policy.teenager.meals.to} years`);
        }
        if (policy.child?.meals) {
          categories.push(`Child: ${policy.child.meals.from}-${policy.child.meals.to} years`);
        }
        if (policy.infant?.meals) {
          categories.push(`Infant: ${policy.infant.meals.from}-${policy.infant.meals.to} years`);
        }

        return <EyePopover title="Age Policy" description={categories.length > 0 ? categories.join("\n") : "-"} />;
      },
    },
    {
      id: "meal_plan_rates",
      accessorKey: "meal_plan_rates",
      header: "Meal Plan Rates",
      cell: ({ row }) => {
        const rates = row.original.meal_plan_rates;
        if (!rates || rates.length === 0) return "-";

        const description = rates
          .map((plan: any) => {
            const ratesList = [];
            if (plan.rates?.adult) ratesList.push(`Adult: ${plan.rates.adult}`);
            if (plan.rates?.teenager) ratesList.push(`Teenager: ${plan.rates.teenager}`);
            if (plan.rates?.child) ratesList.push(`Child: ${plan.rates.child}`);
            if (plan.rates?.infant) ratesList.push(`Infant: ${plan.rates.infant}`);
            return `${plan.meal_type}: ${ratesList.join(", ") || "No rates"}`;
          })
          .join("\n\n");

        return <EyePopover title="Meal Plan Rates" description={description} />;
      },
    },
    {
      id: "offers",
      accessorKey: "offers",
      header: "Offers",
      cell: ({ cell }) => {
        return <MarkdownEyePopover title="Offers" content={cell.getValue<Hotel["offers"]>() || ""} />;
      },
    },
  ];

  return baseColumns;
};

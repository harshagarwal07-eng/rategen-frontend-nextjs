import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "../ui/table/data-table-skeleton";
import { getRatesByVersion } from "@/data-access/rates";
import { SimpleTableWithFooter } from "@/components/ui/simple-table-with-footer";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "../ui/markdown-renderer";

type Props = {
  version: number;
  chatId: string;
};

// Final tab columns structure
export const finalColumns: ColumnDef<any>[] = [
  {
    id: "sno",
    header: "S.No.",
    cell: ({ row }) => row.index + 1,
    size: 60,
  },
  {
    id: "particulars",
    accessorKey: "particulars",
    header: "Particulars",
    cell: ({ row }) => {
      const data = row.original;
      // Generate particulars based on service type
      switch (data.service_type) {
        case "hotels":
          return <MarkdownRenderer>{data.hotel_details}</MarkdownRenderer>;
        case "tours":
          return <MarkdownRenderer>{data.tour_details}</MarkdownRenderer>;
        case "transfers":
          return <MarkdownRenderer>{data.transfer_details}</MarkdownRenderer>;
        default:
          return "-";
      }
    },
    size: 300,
  },
  {
    id: "service",
    accessorKey: "service_type",
    header: "Service",
    cell: ({ cell }) => (
      <Badge variant="outline" className="capitalize">
        {cell.getValue<string>() || "-"}
      </Badge>
    ),
    size: 100,
  },
  {
    id: "date",
    header: "Date",
    cell: ({ row }) => {
      const data = row.original;
      // Get date based on service type
      if (data.service_type === "hotels") {
        return data.checkin_date + " - " + data.checout_date;
      } else if (data.service_type === "tours") {
        return data.tour_date || "-";
      } else if (data.service_type === "transfers") {
        return data.transfer_date || "-";
      }
      return "-";
    },
    size: 120,
  },
  {
    id: "currency",
    accessorKey: "currency_code",
    header: "Currency",
    size: 60,
  },
  {
    id: "total_cost",
    header: "Total Cost",
    cell: ({ row }) => {
      try {
        const rate = row.original.rate;
        return rate.total ? rate.total.toLocaleString() : "-";
      } catch {
        return "-";
      }
    },
    size: 120,
  },
  {
    id: "quoted_price",
    header: "Quoted Price",
    cell: ({ row }) => {
      try {
        const rate = row.original.rate;
        // Assuming quoted price might be a markup on total cost
        // You can adjust this logic based on your business requirements
        const quotedPrice = rate.total ? Math.round(rate.total * 1.1) : 0;
        return quotedPrice ? quotedPrice.toLocaleString() : "-";
      } catch {
        return "-";
      }
    },
    size: 120,
  },
];

export default function FinalRates({ version, chatId }: Props) {
  // Fetch data from all three rate types
  const {
    data: hotelsData = { data: [], totalItems: 0 },
    isLoading: hotelsLoading,
  } = useQuery({
    queryKey: ["rates", version, "hotels", chatId],
    queryFn: () => getRatesByVersion(version, "hotels", chatId),
  });

  const {
    data: toursData = { data: [], totalItems: 0 },
    isLoading: toursLoading,
  } = useQuery({
    queryKey: ["rates", version, "tours", chatId],
    queryFn: () => getRatesByVersion(version, "tours", chatId),
  });

  const {
    data: transfersData = { data: [], totalItems: 0 },
    isLoading: transfersLoading,
  } = useQuery({
    queryKey: ["rates", version, "transfers", chatId],
    queryFn: () => getRatesByVersion(version, "transfers", chatId),
  });

  if (hotelsLoading || toursLoading || transfersLoading) {
    return <DataTableSkeleton columnCount={6} />;
  }

  // Combine all data and filter for included items only
  const allRates = [
    ...hotelsData.data.map((item: any) => ({
      ...item,
      service_type: "hotels",
    })),
    ...toursData.data.map((item: any) => ({ ...item, service_type: "tours" })),
    ...transfersData.data.map((item: any) => ({
      ...item,
      service_type: "transfers",
    })),
  ].filter((item: any) => item.inclusion === "included");

  // Calculate totals for footer
  const calculateTotals = (data: any[]) => {
    let totalCost = 0;
    let totalQuotedPrice = 0;

    data.forEach((item) => {
      try {
        const rate = item.rate;
        if (rate.total) {
          totalCost += rate.total;
          totalQuotedPrice += Math.round(rate.total * 1); // No markup
        }
      } catch {
        // Skip invalid rates
      }
    });

    return { totalCost, totalQuotedPrice };
  };

  const totals = calculateTotals(allRates);

  const footerData = {
    sno: "",
    particulars: <strong>Total</strong>,
    service: "",
    date: "",
    total_cost: <strong>{totals.totalCost.toLocaleString()}</strong>,
    quoted_price: <strong>{totals.totalQuotedPrice.toLocaleString()}</strong>,
  };

  return (
    <div className="flex flex-col flex-1 p-4">
      <SimpleTableWithFooter
        data={allRates}
        columns={finalColumns}
        footerData={footerData}
      />
    </div>
  );
}

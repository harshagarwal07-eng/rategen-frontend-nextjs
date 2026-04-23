import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "../ui/table/data-table-skeleton";
import { getRatesByVersion } from "@/data-access/rates";
import { columns } from "./columns/tours.cols";
import { SimpleTableWithFooter } from "@/components/ui/simple-table-with-footer";

type Props = {
  version: number;
  chatId: string;
};

export default function ToursRates({ version, chatId }: Props) {
  const { data: rates = { data: [], totalItems: 0 }, isLoading } = useQuery({
    queryKey: ["rates", version, "tours", chatId],
    queryFn: () => getRatesByVersion(version, "tours", chatId),
  });

  if (isLoading) return <DataTableSkeleton columnCount={9} />;

  // Filter included items for calculations
  const includedItems = rates.data.filter(
    (item: any) => item.inclusion === "included"
  );

  // Calculate totals for footer
  const calculateTotals = () => {
    let totalAdult = 0;
    let totalChild = 0;
    let totalAmount = 0;

    includedItems.forEach((item: any) => {
      try {
        const rate = item.rate;
        if (rate.adult) totalAdult += rate.adult;
        if (rate.child) totalChild += rate.child;
        if (rate.total) totalAmount += rate.total;
      } catch {
        // Skip invalid rates
      }
    });

    return {
      totalAdult,
      totalChild,
      totalAmount,
    };
  };

  const totals = calculateTotals();

  const footerData = {
    tour_details: <strong>Total</strong>,
    type: "",
    currency: "",
    date: "",
    rate_adult: <strong>{totals.totalAdult.toLocaleString()}</strong>,
    rate_child: <strong>{totals.totalChild.toLocaleString()}</strong>,
    rate_total: <strong>{totals.totalAmount.toLocaleString()}</strong>,
    calculation: "",
    assumption: "",
    status: "",
    remarks: "",
  };

  return (
    <div className="flex flex-col flex-1 p-4">
      <SimpleTableWithFooter
        data={rates.data}
        columns={columns}
        footerData={footerData}
      />
    </div>
  );
}

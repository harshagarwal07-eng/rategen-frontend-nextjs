import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "../ui/table/data-table-skeleton";
import { getRatesByVersion } from "@/data-access/rates";
import { columns } from "./columns/hotel.cols";
import { SimpleTableWithFooter } from "@/components/ui/simple-table-with-footer";

type Props = {
  version: number;
  chatId: string;
};

export default function HotelsRates({ version, chatId }: Props) {
  const { data: rates = { data: [], totalItems: 0 }, isLoading } = useQuery({
    queryKey: ["rates", version, "hotels", chatId],
    queryFn: () => getRatesByVersion(version, "hotels", chatId),
  });

  if (isLoading) return <DataTableSkeleton columnCount={9} />;

  // Filter included items for calculations
  const includedItems = rates.data.filter(
    (item: any) => item.inclusion === "included"
  );

  // Calculate totals for footer
  const calculateTotals = () => {
    let totalAdult = 0;
    let totalChildExtraBed = 0;
    let totalChildNoBed = 0;
    let totalPerRoomPerNight = 0;
    let totalAmount = 0;

    includedItems.forEach((item: any) => {
      try {
        const rate = item.rate;
        if (rate.adult) totalAdult += rate.adult;
        if (rate.child_extra_bed) totalChildExtraBed += rate.child_extra_bed;
        if (rate.child_no_bed) totalChildNoBed += rate.child_no_bed;
        if (rate.per_room_per_night)
          totalPerRoomPerNight += rate.per_room_per_night;
        if (rate.total) totalAmount += rate.total;
      } catch {
        // Skip invalid rates
      }
    });

    return {
      totalAdult,
      totalChildExtraBed,
      totalChildNoBed,
      totalPerRoomPerNight,
      totalAmount,
    };
  };

  const totals = calculateTotals();

  const footerData = {
    hotel_details: <strong>Total</strong>,
    room_details: "",
    currency: "",
    check_in_date: "",
    check_out_date: "",
    rate_adult: <strong>{totals.totalAdult.toLocaleString()}</strong>,
    child_extra_bed: (
      <strong>{totals.totalChildExtraBed.toLocaleString()}</strong>
    ),
    child_no_bed: <strong>{totals.totalChildNoBed.toLocaleString()}</strong>,
    per_room_per_night: (
      <strong>{totals.totalPerRoomPerNight.toLocaleString()}</strong>
    ),
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

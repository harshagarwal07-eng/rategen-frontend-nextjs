"use client";

import GeneralInfoForm from "@/components/forms/dmc-hotel-sections/general-info-form";
import ContractsSection from "@/components/forms/dmc-hotel-sections/contracts-section";
import { DmcHotel } from "@/types/hotels";

interface Props {
  hotelId: string | null;
  initialHotel: DmcHotel | null;
  onSaved: (hotel: DmcHotel) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export default function GeneralInfoTab({
  hotelId,
  initialHotel,
  onSaved,
  onDirtyChange,
}: Props) {
  return (
    <div className="space-y-8 pb-20">
      <GeneralInfoForm
        hotelId={hotelId}
        initialHotel={initialHotel}
        onSaved={onSaved}
        onDirtyChange={onDirtyChange}
      />
      {hotelId && <ContractsSection hotelId={hotelId} />}
    </div>
  );
}

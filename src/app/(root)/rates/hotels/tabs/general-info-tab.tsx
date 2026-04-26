"use client";

import { type RefObject } from "react";
import GeneralInfoForm from "@/components/forms/dmc-hotel-sections/general-info-form";
import ContractsSection from "@/components/forms/dmc-hotel-sections/contracts-section";
import { DmcHotel } from "@/types/hotels";
import { PendingContract } from "@/types/dmc-contracts";

interface Props {
  hotelId: string | null;
  initialHotel: DmcHotel | null;
  onSaved: (hotel: DmcHotel) => void;
  onDirtyChange: (dirty: boolean) => void;
  formRef?: RefObject<HTMLFormElement>;
  onSavingChange?: (saving: boolean) => void;
  pendingContracts: PendingContract[];
  setPendingContracts: React.Dispatch<React.SetStateAction<PendingContract[]>>;
}

export default function GeneralInfoTab({
  hotelId,
  initialHotel,
  onSaved,
  onDirtyChange,
  formRef,
  onSavingChange,
  pendingContracts,
  setPendingContracts,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">General Information</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter the basic details about this hotel</p>
      </div>
      <GeneralInfoForm
        hotelId={hotelId}
        initialHotel={initialHotel}
        onSaved={onSaved}
        onDirtyChange={onDirtyChange}
        formRef={formRef}
        hideFooter
        onSavingChange={onSavingChange}
      />
      <ContractsSection
        hotelId={hotelId}
        pendingContracts={pendingContracts}
        setPendingContracts={setPendingContracts}
      />
    </div>
  );
}

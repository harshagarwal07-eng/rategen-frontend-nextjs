"use client";

import { ICrmTaDetails } from "@/types/crm-agency";
import {
  DetailDataList,
  DetailDataListItem,
} from "@/components/crm/shared/detail-data-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Props = {
  agent: ICrmTaDetails;
};

export default function KYCDetailsSection({ agent }: Props) {
  const items: DetailDataListItem[] = [];

  // Show placeholder if no data
  if (items.length === 0) {
    return (
      <Accordion type="single" collapsible>
        <AccordionItem value="kyc-details" className="border-0">
          <AccordionTrigger className="hover:no-underline py-0 pb-2 cursor-pointer bg-transparent text-xs font-semibold">
            KYC Details
          </AccordionTrigger>
          <AccordionContent className="text-foreground font-normal pt-2">
            <p className="text-xs text-muted-foreground text-center py-2">
              No data to show
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <DetailDataList
      items={items}
      accordion={{
        title: "KYC Details",
        value: "kyc-details",
        defaultOpen: false,
      }}
    />
  );
}

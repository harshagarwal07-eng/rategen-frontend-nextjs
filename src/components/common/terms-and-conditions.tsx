import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DMCAgreementEmailContainer from "@/utils/emails/DMCAgreementEmailContainer";
import { ISignup } from "../forms/schemas/signup-schema";
import { ScrollArea } from "../ui/scroll-area";
import { getCountyDetailsById } from "@/data-access/common";
import { useEffect, useState } from "react";

export default function TermsAndConditions({
  name,
  streetAddress,
  country,
  adminEmail,
  adminMobile,
}: ISignup) {
  const date = new Date().getDate().toString();
  const month = new Date().toLocaleString("default", { month: "long" });
  const year = new Date().getFullYear().toString();
  const [countryName, setCountryName] = useState(country);

  useEffect(() => {
    if (country.length > 0) {
      getCountyDetailsById(country).then(
        ({ data }) => data?.country_name && setCountryName(data?.country_name)
      );
    }
  }, [country]);

  return (
    <Dialog>
      <DialogTrigger className="font-normal text-primary underline">
        terms & conditions.
      </DialogTrigger>
      <DialogContent className="px-0 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="px-6"> DMC Service Agreement</DialogTitle>
          <DialogDescription asChild>
            <ScrollArea className="px-6 h-[80vh] text-foreground">
              <DMCAgreementEmailContainer
                date={date}
                month={month}
                year={year}
                dmcName={name || "[DMC NAME]"}
                dmcAddress={streetAddress || "[ADDRESS]"}
                dmcCountry={countryName || "[India]"}
                adminEmail={adminEmail || "[DMC EMAIL]"}
                adminMobile={adminMobile || "[DMC Mobile Number]"}
              />
            </ScrollArea>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

import { Metadata } from "next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FDResultsWrapper } from "@/components/api-services/fixed-departures/results/fd-results-wrapper";

export const metadata: Metadata = {
  title: "Fixed Departures Results",
};

export default function FixedDeparturesResultsPage() {
  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-10">
        <FDResultsWrapper />
      </div>
    </ScrollArea>
  );
}

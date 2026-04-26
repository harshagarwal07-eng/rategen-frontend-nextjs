import { Metadata } from "next";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "Fixed Departures Search",
};

export default function FixedDeparturesSearchPage() {
  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-6 pr-8">
        <h1 className="text-2xl font-bold">Fixed Departures search — coming up</h1>
      </div>
    </ScrollArea>
  );
}

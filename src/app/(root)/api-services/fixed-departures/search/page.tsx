import { Metadata } from "next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FDSearchBar } from "@/components/api-services/fixed-departures/search/fd-search-bar";
import { TrendingPackages } from "@/components/api-services/fixed-departures/search/trending-packages";

export const metadata: Metadata = {
  title: "Fixed Departures Search",
};

export default function FixedDeparturesSearchPage() {
  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-10 pr-8 space-y-10">
        <header className="text-center space-y-2 pt-10">
          <h1 className="text-3xl font-bold tracking-tight">Find your perfect departure</h1>
          <p className="text-sm text-muted-foreground">
            Browse curated fixed departure packages worldwide
          </p>
        </header>

        <div className="max-w-3xl mx-auto w-full">
          <FDSearchBar />
        </div>

        <TrendingPackages />
      </div>
    </ScrollArea>
  );
}

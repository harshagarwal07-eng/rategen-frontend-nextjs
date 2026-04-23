import { Metadata } from "next";
import { fetchCountries } from "@/data-access/datastore";
import ItineraryBuilder from "@/components/docs/itinerary-builder/itinerary-builder";

export const metadata: Metadata = {
  title: "Create Sample Itinerary",
  description: "Build a sample itinerary for AI reference",
};

export default async function CreateItineraryPage() {
  const countries = await fetchCountries();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      <ItineraryBuilder countries={countries} />
    </div>
  );
}

import { fetchCountries } from "@/data-access/datastore";
import { getDocById } from "@/data-access/docs";
import ItineraryBuilder from "@/components/docs/itinerary-builder/itinerary-builder";
import { parseItineraryContent } from "@/components/docs/itinerary-builder/types";
import { notFound } from "next/navigation";

interface EditItineraryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItineraryPage({ params }: EditItineraryPageProps) {
  const { id } = await params;
  const [countries, doc] = await Promise.all([
    fetchCountries(),
    getDocById(Number(id)),
  ]);

  if (!doc) return notFound();

  const itineraryData = parseItineraryContent(doc.content || "");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      <ItineraryBuilder
        countries={countries}
        editDocId={doc.id}
        initialItinerary={itineraryData || undefined}
        initialCountryId={doc.country}
      />
    </div>
  );
}

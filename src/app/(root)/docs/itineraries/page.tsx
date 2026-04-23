import { Metadata } from "next";
import DocsDataTableWrapper from "@/components/docs/docs-data-table-wrapper";
import { getAllDocsByUser } from "@/data-access/docs";
import { fetchCountries } from "@/data-access/datastore";

export const metadata: Metadata = {
  title: "Itineraries",
  description: "Manage itineraries content",
};

export default async function ItinerariesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = params.country || "";

  const [docs, countries] = await Promise.all([
    getAllDocsByUser("itineraries", country),
    fetchCountries(),
  ]);

  return (
    <DocsDataTableWrapper
      docType="itineraries"
      title="Itineraries"
      showNights={true}
      allowMultiplePerCountry={true}
      initialDocs={docs}
      countries={countries}
    />
  );
}

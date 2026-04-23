import { Metadata } from "next";
import DocsDataTableWrapper from "@/components/docs/docs-data-table-wrapper";
import { getAllDocsByUser } from "@/data-access/docs";
import { fetchCountries } from "@/data-access/datastore";

export const metadata: Metadata = {
  title: "Notes",
  description: "Manage notes content",
};

export default async function NotesPage({ searchParams }: PageProps<"/docs">) {
  const params = await searchParams;
  const country = (params.country as string) || "";

  const [docs, countries] = await Promise.all([
    getAllDocsByUser("notes", country),
    fetchCountries(),
  ]);

  return (
    <DocsDataTableWrapper
      docType="notes"
      title="Notes"
      showNights={false}
      allowMultiplePerCountry={false}
      initialDocs={docs}
      countries={countries}
    />
  );
}

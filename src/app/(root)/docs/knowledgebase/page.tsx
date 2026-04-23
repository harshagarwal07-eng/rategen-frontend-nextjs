import { Metadata } from "next";
import DocsDataTableWrapper from "@/components/docs/docs-data-table-wrapper";
import { getAllDocsByUser } from "@/data-access/docs";
import { fetchCountries } from "@/data-access/datastore";

export const metadata: Metadata = {
  title: "Knowledgebase",
  description: "Manage knowledgebase content",
};

export default async function KnowledgebasePage({
  searchParams,
}: PageProps<"/docs">) {
  const params = await searchParams;
  const country = (params.country as string) || "";

  const [docs, countries] = await Promise.all([
    getAllDocsByUser("knowledgebase", country),
    fetchCountries(),
  ]);

  return (
    <DocsDataTableWrapper
      docType="knowledgebase"
      title="Knowledgebase"
      showNights={false}
      allowMultiplePerCountry={false}
      initialDocs={docs}
      countries={countries}
    />
  );
}

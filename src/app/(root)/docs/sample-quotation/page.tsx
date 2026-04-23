import { Metadata } from "next";
import DocsDataTableWrapper from "@/components/docs/docs-data-table-wrapper";
import { getAllDocsByUser } from "@/data-access/docs";
import { fetchCountries } from "@/data-access/datastore";

export const metadata: Metadata = {
  title: "Sample Quotation",
  description: "Manage sample quotation content",
};

export default async function SampleQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const params = await searchParams;
  const country = params.country || "";

  const [docs, countries] = await Promise.all([
    getAllDocsByUser("sample-quotation", country),
    fetchCountries(),
  ]);

  return (
    <DocsDataTableWrapper
      docType="sample-quotation"
      title="Sample Quotation"
      showNights={false}
      allowMultiplePerCountry={false}
      initialDocs={docs}
      countries={countries}
    />
  );
}

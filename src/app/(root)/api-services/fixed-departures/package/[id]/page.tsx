import { Metadata } from "next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FDPackageDetail } from "@/components/api-services/fixed-departures/detail/fd-package-detail";

export const metadata: Metadata = {
  title: "Fixed Departure Package",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildBackHref(searchParams: Record<string, string | string[] | undefined>): string {
  const from = typeof searchParams.from === "string" ? searchParams.from : null;
  if (from !== "results") return "/api-services/fixed-departures/search";

  const params = new URLSearchParams();
  const carry = ["countries", "cities", "months", "departureCity", "ageGroups", "durations", "sort"];
  for (const key of carry) {
    const v = searchParams[key];
    if (typeof v === "string" && v) params.set(key, v);
  }
  const qs = params.toString();
  return qs
    ? `/api-services/fixed-departures/search/results?${qs}`
    : "/api-services/fixed-departures/search/results";
}

export default async function FixedDeparturesPackagePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const backHref = buildBackHref(sp);

  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full pb-10 pt-2">
        <FDPackageDetail packageId={id} backHref={backHref} />
      </div>
    </ScrollArea>
  );
}

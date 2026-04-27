import { ParseSessionView } from "@/components/parser/parse-session-view";

export default async function TourParserJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ParseSessionView jobId={jobId} sourceEntry="tours" />;
}

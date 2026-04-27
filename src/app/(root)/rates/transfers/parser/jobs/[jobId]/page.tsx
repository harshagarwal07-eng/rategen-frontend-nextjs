import { ParseSessionView } from "@/components/parser/parse-session-view";

export default async function TransferParserJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ParseSessionView jobId={jobId} sourceEntry="transfers" />;
}

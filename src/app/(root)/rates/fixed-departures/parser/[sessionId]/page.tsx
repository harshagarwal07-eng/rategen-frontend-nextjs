import { Metadata } from "next";
import { ParserSessionView } from "@/components/rates/fixed-departures/parser/parser-session-view";

export const metadata: Metadata = {
  title: "Parser Session",
};

export default async function FDParserSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ParserSessionView sessionId={sessionId} />;
}

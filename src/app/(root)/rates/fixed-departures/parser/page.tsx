import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParserUploadForm } from "@/components/rates/fixed-departures/parser/parser-upload-form";
import { ParserSessionsList } from "@/components/rates/fixed-departures/parser/parser-sessions-list";

export const metadata: Metadata = {
  title: "Parse Fixed Departure",
  description: "Upload a tour PDF or DOCX and let AI extract the package",
};

export default function FDParserLandingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-2">
      <div className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 gap-1 text-xs text-muted-foreground"
        >
          <Link href="/rates/fixed-departures">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Fixed Departures
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">
            Parse Fixed Departure from PDF
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Upload a tour package PDF or DOCX. AI extracts itinerary, pricing,
          departures, and policies. Country, city, currency and other details
          are inferred automatically.
        </p>
      </div>

      <ParserUploadForm />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Recent Sessions
        </h2>
        <ParserSessionsList />
      </div>
    </div>
  );
}

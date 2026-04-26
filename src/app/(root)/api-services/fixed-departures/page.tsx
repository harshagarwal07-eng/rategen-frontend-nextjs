import { redirect } from "next/navigation";

export default function FixedDeparturesPage() {
  redirect("/api-services/fixed-departures/search");
}

import { Metadata } from "next";
import FDClient from "./client";

export const metadata: Metadata = {
  title: "Fixed Departures",
  description: "Manage fixed-departure package rates",
};

export default function FixedDeparturesPage() {
  return <FDClient />;
}

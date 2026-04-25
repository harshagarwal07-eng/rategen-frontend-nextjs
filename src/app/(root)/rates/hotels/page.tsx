import { Metadata } from "next";
import HotelsClient from "./hotels-client";

export const metadata: Metadata = {
  title: "Hotels",
  description: "Manage hotel properties and contracts",
};

export default function HotelsPage() {
  return <HotelsClient />;
}

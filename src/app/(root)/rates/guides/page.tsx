import { Metadata } from "next";
import GuidesClient from "./client";

export const metadata: Metadata = {
  title: "Guides",
  description: "Manage guide products and packages",
};

export default function GuidesPage() {
  return <GuidesClient />;
}

import { Metadata } from "next";
import ToursClient from "./client";

export const metadata: Metadata = {
  title: "Tours",
  description: "Manage tour products and packages",
};

export default function ToursPage() {
  return <ToursClient />;
}

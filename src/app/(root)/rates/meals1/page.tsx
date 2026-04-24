import { Metadata } from "next";
import Meals1Client from "./client";

export const metadata: Metadata = {
  title: "Meals (v2)",
  description: "Manage meal products and packages",
};

export default function Meals1Page() {
  return <Meals1Client />;
}

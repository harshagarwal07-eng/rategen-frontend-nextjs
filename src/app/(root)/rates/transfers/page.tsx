import { Metadata } from "next";
import TransfersClient from "./client";

export const metadata: Metadata = {
  title: "Transfers",
  description: "Manage transfer products and packages",
};

export default function TransfersPage() {
  return <TransfersClient />;
}

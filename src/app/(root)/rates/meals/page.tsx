import { Metadata } from "next";
import MealsClient from "./client";

export const metadata: Metadata = {
  title: "Meals",
  description: "Manage meal products and packages",
};

export default function MealsPage() {
  return <MealsClient />;
}

import { Metadata } from "next";
import TeamClient from "./client";

export const metadata: Metadata = {
  title: "Team Management",
  description: "Manage team members",
};

export default async function Team() {
  return (
    <div className="relative flex flex-1">
      <div className="absolute inset-0 overflow-hidden rounded-lg bg-card">
        <TeamClient />
      </div>
    </div>
  );
}

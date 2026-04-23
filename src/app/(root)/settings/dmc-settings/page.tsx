import { Metadata } from "next";
import { getDmcSettings } from "@/data-access/dmc-settings";
import { getServicesOffered } from "@/data-access/dmc";
import DMCSettingsClient from "./client";

export const metadata: Metadata = {
  title: "DMC Settings",
  description: "Manage DMC configuration settings",
};

export default async function DMCSettingsPage() {
  const settings = await getDmcSettings();
  const { serviceOptions } = await getServicesOffered();

  return (
    <div className="h-full w-full max-w-3xl py-8 mx-auto overflow-auto no-scrollbar">
      <h1 className="text-2xl font-bold mb-8">DMC Settings</h1>
      <DMCSettingsClient initialSettings={settings} serviceOptions={serviceOptions || []} />
    </div>
  );
}

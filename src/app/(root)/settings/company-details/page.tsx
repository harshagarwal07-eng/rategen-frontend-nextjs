import CompanyProfileForm from "@/components/forms/company-profile-form";
import { getCurrentUser } from "@/data-access/auth";
import { getDmcDetailsById } from "@/data-access/dmc";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company Details",
  description: "Manage company details",
};

export default async function CompanyDetails() {
  const user = await getCurrentUser();
  const data = await getDmcDetailsById(user?.dmc.id || "");

  if (!data) return null;

  return (
    <div className="relative flex flex-1">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="flex flex-col h-full bg-card rounded-lg p-6 space-y-6 overflow-auto no-scrollbar">
          <div>
            <h1 className="text-2xl font-bold">Company Details</h1>
            <p className="text-sm text-muted-foreground">Manage your company details</p>
          </div>
          <CompanyProfileForm dmcData={data} />
        </div>
      </div>
    </div>
  );
}

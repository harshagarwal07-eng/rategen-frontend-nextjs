import { Metadata } from "next";
import MyProfileForm from "@/components/forms/my-profile-form";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage profile details",
};

export default function MyProfile() {
  return (
    <div className="relative flex flex-1">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="flex flex-col h-full bg-card rounded-lg p-6 space-y-6 overflow-auto no-scrollbar">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your profile details</p>
          </div>
          <MyProfileForm />
        </div>
      </div>
    </div>
  );
}

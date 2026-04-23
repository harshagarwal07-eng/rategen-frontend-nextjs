import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security",
  description: "Manage security credentials",
};

export default async function Team() {
  return (
    <div className="relative flex flex-1">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="flex flex-col h-full bg-card rounded-lg p-6 space-y-6 overflow-auto no-scrollbar">
          <div>
            <h1 className="text-2xl font-bold">Security</h1>
            <p className="text-sm text-muted-foreground">Change your password</p>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

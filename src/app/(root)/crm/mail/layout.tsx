import { ReactNode } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import CRMSidebar from "../components/crm-sidebar";

export default function MailLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CRMSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">{children}</SidebarInset>
    </>
  );
}

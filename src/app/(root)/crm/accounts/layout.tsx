import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import CRMSidebar from "../components/crm-sidebar";
import { AccountsSidebar } from "@/components/crm/accounts/accounts-sidebar";
export default function AccountsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CRMSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="h-full flex flex-col flex-1">
          <SidebarProvider className="!min-h-0 flex-1 h-full">
            <AccountsSidebar />
            <SidebarInset className="flex flex-col overflow-hidden">
              {children}
            </SidebarInset>
          </SidebarProvider>
        </div>
      </SidebarInset>
    </>
  );
}

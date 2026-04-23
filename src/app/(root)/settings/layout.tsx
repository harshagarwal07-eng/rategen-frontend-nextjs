import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import SettingsSidebar from "./components/settings-sidebar";

type Props = {
  children: ReactNode;
};

export default async function SettingsLayout({ children }: Props) {
  return (
    <SidebarProvider defaultOpen className="!min-h-0 flex-1">
      <SettingsSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden p-2">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

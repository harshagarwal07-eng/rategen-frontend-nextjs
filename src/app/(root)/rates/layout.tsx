import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import RatesSidebar from "./components/rates-sidebar";

type Props = {
  children: ReactNode;
};

export default async function RatesLayout({ children }: Props) {
  return (
    <SidebarProvider defaultOpen={false} className="!min-h-0 flex-1">
      <RatesSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden p-2">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

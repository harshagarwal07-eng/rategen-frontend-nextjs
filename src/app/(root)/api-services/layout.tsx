import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import ApiServiceSidebar from "./components/api-service-sidebar";

export default function ApiServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false} className="!min-h-0 flex-1">
      <ApiServiceSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

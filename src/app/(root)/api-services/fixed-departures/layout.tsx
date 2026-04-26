import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ApiServiceSecondarySidebar } from "../components/api-service-secondary-sidebar";
import { ApiServiceBreadcrumb } from "../components/api-service-breadcrumb";
import { cn } from "@/lib/utils";

export default function FixedDeparturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="h-full flex flex-col flex-1">
        <ApiServiceBreadcrumb />
        <SidebarProvider className={cn("!min-h-0 flex-1 h-full")}>
          <ApiServiceSecondarySidebar serviceType="fixed-departures" />
          <SidebarInset className="flex flex-col overflow-hidden">
            <div className="flex flex-1 overflow-hidden py-4 pl-4">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}

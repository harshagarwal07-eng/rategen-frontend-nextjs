import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { LibrarySidebar } from "./components/library-sidebar";
import { LibraryBreadcrumb } from "./components/library-breadcrumb";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="h-full flex flex-col flex-1">
        <LibraryBreadcrumb />
        <SidebarProvider className={cn("!min-h-0 flex-1 h-full")}>
          <LibrarySidebar />
          <SidebarInset className="flex flex-col overflow-hidden">
            <div className="flex flex-1 overflow-hidden p-4">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}

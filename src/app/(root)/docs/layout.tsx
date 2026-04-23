import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DocsSidebar from "./components/docs-sidebar";

type Props = {
  children: ReactNode;
};

export default async function DocsLayout({ children }: Props) {
  return (
    <SidebarProvider defaultOpen={false} className="!min-h-0 flex-1">
      <DocsSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

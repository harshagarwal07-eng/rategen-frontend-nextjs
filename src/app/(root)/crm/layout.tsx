import { SidebarProvider } from "@/components/ui/sidebar";
import { Providers } from "@/components/providers";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SidebarProvider defaultOpen={true} className="!min-h-0 flex-1">
        {children}
      </SidebarProvider>
    </Providers>
  );
}

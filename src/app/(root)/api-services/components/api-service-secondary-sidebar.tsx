"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsRight, Search, Calendar, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface ServiceNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const serviceNavigationConfig: Record<string, ServiceNavItem[]> = {
  hotels: [
    { id: "search", label: "Search", href: "/api-services/hotels/search", icon: Search },
    { id: "my-bookings", label: "My Bookings", href: "/api-services/hotels/my-bookings", icon: Calendar },
  ],
  tours: [
    { id: "search", label: "Search", href: "/api-services/tours/search", icon: Search },
    { id: "my-bookings", label: "My Bookings", href: "/api-services/tours/my-bookings", icon: Calendar },
  ],
  transfers: [
    { id: "search", label: "Search", href: "/api-services/transfers/search", icon: Car },
    { id: "my-bookings", label: "My Bookings", href: "/api-services/transfers/my-bookings", icon: Calendar },
  ],
};

interface ApiServiceSecondarySidebarProps {
  serviceType: keyof typeof serviceNavigationConfig;
}

export function ApiServiceSecondarySidebar({ serviceType }: ApiServiceSecondarySidebarProps) {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const items = serviceNavigationConfig[serviceType] || [];

  return (
    <Sidebar collapsible="icon" className="!h-full !static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((item) => {
                const isActive = pathname.includes(item.href);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      asChild
                      className={cn(
                        "h-9 hover:bg-muted cursor-pointer",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Link href={item.href} prefetch className="no-underline">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 mx-auto">
          <ChevronsRight className={cn("h-4 w-4 transition-transform", state === "expanded" && "rotate-180")} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Plane } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const apiServiceNavItems = [
  {
    label: "Hotels",
    href: "/api-services/hotels",
    icon: Building2,
    matchPath: "/api-services/hotels",
  },
  {
    label: "Fixed Departures",
    href: "/api-services/fixed-departures",
    icon: Plane,
    matchPath: "/api-services/fixed-departures",
  },
];

export default function ApiServiceSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="none" className="!w-[calc(var(--sidebar-width-icon)+1px)] border-r">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {apiServiceNavItems.map((item) => {
                const isActive = pathname.startsWith(item.matchPath);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={{ children: item.label, hidden: false }}
                      className={cn(
                        "h-9 hover:bg-muted px-2",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
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
    </Sidebar>
  );
}

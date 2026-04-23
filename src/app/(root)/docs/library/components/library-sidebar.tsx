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
import { ChevronsRight, Utensils, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FaCar } from "react-icons/fa6";
import { usePathname } from "next/navigation";

const sidebarNavItems = [
  {
    id: "vehicles",
    label: "Vehicles",
    href: "/docs/library/vehicles",
    icon: FaCar,
  },
  {
    id: "drivers",
    label: "Drivers",
    href: "/docs/library/drivers",
    icon: Users2,
  },
  {
    id: "restaurants",
    label: "Restaurants",
    href: "/docs/library/restaurants",
    icon: Utensils,
  },
  {
    id: "guides",
    label: "Guides",
    href: "/docs/library/guides",
    icon: Users2,
  },
];

export function LibrarySidebar() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="!h-full !static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {sidebarNavItems.map((item) => {
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

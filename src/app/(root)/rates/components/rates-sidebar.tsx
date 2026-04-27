"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Car, Group, UtensilsCrossed, LucideFerrisWheel, Percent, Plane } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { TbTrekking } from "react-icons/tb";

const ratesNavItems = [
  {
    label: "Hotels",
    href: "/rates/hotels",
    icon: Building2,
  },
  {
    label: "Tours",
    href: "/rates/tours",
    icon: LucideFerrisWheel,
  },
  {
    label: "Transfers",
    href: "/rates/transfers",
    icon: Car,
  },
  {
    label: "Combos",
    href: "/rates/combos",
    icon: Group,
  },
  {
    label: "Meals",
    href: "/rates/meals",
    icon: UtensilsCrossed,
  },
  {
    label: "Guides",
    href: "/rates/guides",
    icon: TbTrekking,
  },
  {
    label: "Fixed Departures",
    href: "/rates/fixed-departures",
    icon: Plane,
  },
  {
    label: "Markup",
    href: "/rates/markup",
    icon: Percent,
  },
];

export default function RatesSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className={cn("!h-full static border-r bg-background", state === "collapsed" && "!w-[64px]")}>
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-1">
              {ratesNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-lg transition-all duration-300 w-full hover:bg-accent overflow-hidden hover:no-underline",
                        isActive ? "bg-primary/10" : "",
                        state === "collapsed" ? "flex-col justify-center p-1.5" : "flex-row h-9 px-2 gap-2"
                      )}
                    >
                      <div
                        className={cn(
                          "shrink-0 flex items-center justify-center transition-all duration-300",
                          state === "collapsed" ? "h-8 w-8 rounded-lg" : "h-4 w-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          "font-medium truncate transition-all duration-300",
                          isActive ? "text-primary" : "text-muted-foreground",
                          state === "collapsed" ? "text-[10px] w-full text-center" : "text-sm"
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
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

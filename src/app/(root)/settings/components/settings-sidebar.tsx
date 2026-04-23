"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Building2,
  Settings,
  Users,
  Shield,
  Palette,
  Plug,
  ChevronsRight,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const settingsNavItems = [
  {
    label: "My Profile",
    href: "/settings/my-profile",
    icon: User,
  },
  {
    label: "Company Details",
    href: "/settings/company-details",
    icon: Building2,
  },
  {
    label: "DMC Settings",
    href: "/settings/dmc-settings",
    icon: Settings,
  },
  {
    label: "Team",
    href: "/settings/team",
    icon: Users,
  },
  {
    label: "Security",
    href: "/settings/security",
    icon: Shield,
  },
  {
    label: "White Label",
    href: "/settings/white-label",
    icon: Palette,
  },
  {
    label: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
  },
];

export default function SettingsSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="!h-full static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {settingsNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      className={cn(
                        "h-9 hover:bg-muted",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
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
      <SidebarFooter className="p-2 border-t">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 mx-auto"
        >
          <ChevronsRight
            className={cn(
              "h-4 w-4 transition-transform",
              state === "expanded" && "rotate-180"
            )}
          />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

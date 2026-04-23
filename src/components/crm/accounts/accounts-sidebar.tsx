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
import { ChevronsRight, CreditCard, History, ShoppingCart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/crm/accounts/payment-plans", label: "Payment Plans", icon: CreditCard },
  { href: "/crm/accounts/transactions", label: "Transactions", icon: History },
  { href: "/crm/accounts/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/crm/accounts/sales", label: "Sales", icon: TrendingUp },
];

export function AccountsSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="!h-full !static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      tooltip={label}
                      asChild
                      className={cn(
                        "h-9 hover:bg-muted cursor-pointer",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Link href={href} prefetch className="hover:no-underline">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
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
        <Button variant="ghost" onClick={toggleSidebar} className="h-8 w-full">
          <ChevronsRight className={cn("h-4 w-4 transition-transform", state === "expanded" && "rotate-180")} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

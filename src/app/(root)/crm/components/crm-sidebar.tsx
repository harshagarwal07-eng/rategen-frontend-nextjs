"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { MessageSquare, Users, ChevronsRight, Handshake, NotepadText, ListTodo, Wallet, Mail } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { TooltipButton } from "@/components/ui/tooltip-button";
import { ReactNode, useEffect } from "react";

const crmNavItems = [
  {
    label: "Queries",
    href: "/crm/queries/all",
    icon: MessageSquare,
    matchPath: "/crm/queries",
  },
  {
    label: "Agents",
    href: "/crm/agents/all",
    icon: Users,
    matchPath: "/crm/agents",
  },
  {
    label: "Suppliers",
    href: "/crm/suppliers",
    icon: Handshake,
    matchPath: "/crm/suppliers",
  },
  {
    label: "Bookings",
    href: "/crm/bookings",
    icon: NotepadText,
    matchPath: "/crm/bookings",
  },
  {
    label: "Tasks",
    href: "/crm/tasks",
    icon: ListTodo,
    matchPath: "/crm/tasks",
  },
  {
    label: "Accounts",
    href: "/crm/accounts",
    icon: Wallet,
    matchPath: "/crm/accounts",
  },
  {
    label: "Mail",
    href: "/crm/mail",
    icon: Mail,
    matchPath: "/crm/mail",
  },
  {
    label: "WhatsApp",
    href: "/crm/whatsapp",
    icon: WhatsAppIcon,
    matchPath: "/crm/whatsapp",
  },
];

interface CRMSidebarProps {
  secondaryPanel?: ReactNode;
}

export default function CRMSidebar({ secondaryPanel }: CRMSidebarProps) {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const [sidebarOpen, setSidebarParam] = useQueryState("sidebar", parseAsBoolean.withDefault(true));

  // Sync sidebar context with URL param on mount
  useEffect(() => {
    setOpen(sidebarOpen ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    setSidebarParam(next);
  };

  return (
    <Sidebar collapsible="icon" className="!h-full static overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
      {/* Icon Navigation Sidebar */}
      <Sidebar collapsible="none" className="!w-[64px] border-r">
        <SidebarContent className="py-2">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-1">
                {crmNavItems.map((item) => {
                  const isActive = pathname.startsWith(item.matchPath);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex flex-col items-center p-1.5 rounded-lg transition-colors w-full hover:bg-accent hover:no-underline",
                          isActive ? "bg-primary/10" : ""
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-medium w-full text-center truncate",
                            isActive ? "text-primary" : "text-muted-foreground"
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
        {secondaryPanel && (
          <SidebarFooter className="p-2 border-t">
            <TooltipButton
              variant="default"
              size="icon"
              className="h-8 w-full mx-auto"
              onClick={handleToggle}
              tooltip={open ? "Collapse sidebar" : "Expand sidebar"}
              tooltipSide="right"
            >
              <ChevronsRight className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </TooltipButton>
          </SidebarFooter>
        )}
      </Sidebar>

      {/* Secondary Content Panel */}
      {secondaryPanel && open && (
        <Sidebar collapsible="none" className="!w-80 flex-1 hidden md:flex">
          {secondaryPanel}
        </Sidebar>
      )}
    </Sidebar>
  );
}

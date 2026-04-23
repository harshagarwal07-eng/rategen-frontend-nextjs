"use client";

import Link from "next/link";
import { Plus, ChevronsRight } from "lucide-react";
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
import { ReactNode } from "react";

interface PlaygroundSidebarProps {
  secondaryPanel?: ReactNode;
}

export default function PlaygroundSidebar({ secondaryPanel }: PlaygroundSidebarProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="!h-full static overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
      {/* Icon Navigation Sidebar */}
      <Sidebar collapsible="none" className="!w-[calc(var(--sidebar-width-icon)+1px)] border-r">
        <SidebarContent className="py-2">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: "New Chat", hidden: false }}
                    variant={"outline"}
                    className="hover:bg-primary/60 bg-primary text-background"
                  >
                    <Link href="/playground">
                      <Plus className="h-4 w-4" />
                      <span>New Chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        {secondaryPanel && (
          <SidebarFooter className="p-2 border-t">
            <Button variant="ghost" size="icon" className="h-8 w-8 mx-auto" onClick={toggleSidebar}>
              <ChevronsRight className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </SidebarFooter>
        )}
      </Sidebar>

      {/* Secondary Content Panel - Chat List */}
      {secondaryPanel && open && (
        <Sidebar collapsible="none" className="!w-72 flex-1 hidden md:flex">
          {secondaryPanel}
        </Sidebar>
      )}
    </Sidebar>
  );
}

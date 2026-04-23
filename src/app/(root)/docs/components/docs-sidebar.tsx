"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, StickyNote, CalendarDays, ChevronsRight, Library, ListTodo } from "lucide-react";
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
import { Button } from "@/components/ui/button";

const docsNavItems = [
  {
    label: "Library",
    href: "/docs/library",
    icon: Library,
  },
  {
    label: "Tasks",
    href: "/docs/tasks",
    icon: ListTodo,
  },
  {
    label: "Notes",
    href: "/docs/notes",
    icon: StickyNote,
  },
  {
    label: "Knowledgebase",
    href: "/docs/knowledgebase",
    icon: BookOpen,
  },
  {
    label: "Itineraries",
    href: "/docs/itineraries",
    icon: CalendarDays,
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className={cn("!h-full static border-r bg-background", state === "collapsed" && "!w-[64px]")}
    >
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-1">
              {docsNavItems.map((item) => {
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
      <SidebarFooter className="p-2 border-t">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-full mx-auto">
          <ChevronsRight className={cn("h-4 w-4 transition-transform", state === "expanded" && "rotate-180")} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

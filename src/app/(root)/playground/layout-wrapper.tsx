"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";

interface LayoutWrapperProps {
  children: ReactNode;
}

export default function PlaygroundLayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isDetailPage = pathname !== "/playground" && pathname.startsWith("/playground/");
  const [open, setOpen] = useState(!isDetailPage);
  const prevPathRef = useRef(pathname);

  // Collapse sidebar when navigating to a detail page
  useEffect(() => {
    const wasDetailPage = prevPathRef.current !== "/playground" && prevPathRef.current.startsWith("/playground/");
    const isNowDetailPage = pathname !== "/playground" && pathname.startsWith("/playground/");

    // Only auto-collapse when navigating FROM main page TO detail page
    if (!wasDetailPage && isNowDetailPage) {
      setOpen(false);
    }
    // Expand when navigating TO main page
    if (pathname === "/playground") {
      setOpen(true);
    }

    prevPathRef.current = pathname;
  }, [pathname]);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen} className="!min-h-0 flex-1">
      {children}
    </SidebarProvider>
  );
}

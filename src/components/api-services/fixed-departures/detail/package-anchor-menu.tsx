"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnchorSection {
  id: string;
  label: string;
  show: boolean;
}

interface PackageAnchorMenuProps {
  sections: AnchorSection[];
}

export function PackageAnchorMenu({ sections }: PackageAnchorMenuProps) {
  const visible = sections.filter((s) => s.show);
  const [active, setActive] = useState<string>(visible[0]?.id ?? "");

  useEffect(() => {
    if (visible.length === 0) return;
    // The page is wrapped in a Radix ScrollArea, so window.scroll never fires.
    // IntersectionObserver works regardless of which container scrolls.
    // rootMargin keeps a section "active" while its top is between the sticky
    // headers (~110px) and the lower 50% of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top,
          );
        if (intersecting[0]) setActive(intersecting[0].target.id);
      },
      { rootMargin: "-110px 0px -50% 0px", threshold: 0 },
    );
    visible.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visible]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Use scrollIntoView so it scrolls the nearest scrollable ancestor
    // (the Radix ScrollArea viewport here, not window). scroll-margin-top
    // on each section handles the sticky-header offset.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (visible.length === 0) return null;

  return (
    <nav className="sticky top-14 z-20 bg-background/95 backdrop-blur-md border-b border-border/60 -mx-4 px-4">
      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {visible.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={cn(
                "relative px-3 py-2 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              <span
                className={cn(
                  "absolute left-3 right-3 -bottom-px h-0.5 rounded-full transition-all",
                  isActive ? "bg-primary" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

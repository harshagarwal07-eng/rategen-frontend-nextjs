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
    const onScroll = () => {
      const offset = 160; // sticky bar (56) + anchor menu (~52) + buffer
      let current = visible[0]?.id ?? "";
      for (const s of visible) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const yOffset = -130; // sticky bar + anchor menu + breathing room
    const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
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
                  ? "text-success font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              <span
                className={cn(
                  "absolute left-3 right-3 -bottom-px h-0.5 rounded-full transition-all",
                  isActive ? "bg-success" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

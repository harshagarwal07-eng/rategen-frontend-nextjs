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
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
        if (visibleEntries[0]) {
          setActive(visibleEntries[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 },
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
    const yOffset = -90;
    const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (visible.length === 0) return null;

  return (
    <nav className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60 -mx-4 px-4">
      <div className="flex items-center gap-1 overflow-x-auto py-3">
        {visible.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollTo(s.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors",
              active === s.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
